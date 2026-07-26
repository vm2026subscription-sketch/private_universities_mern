const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const University = require('../models/University');
const { serverError, fail, paginated, parsePagination } = require('../utils/apiResponse');
const { validateSubmission, normalizeEmail, asString } = require('../utils/validators');

const LEAD_TYPES = ['apply', 'brochure'];

// Submit a lead (public route)
exports.submitLead = async (req, res) => {
  try {
    // A lead is a billable event for the sponsoring university, so the payload is
    // validated properly rather than just checked for truthiness: a malformed
    // email or phone here is a lead the partner cannot act on but still receives.
    const problem = validateSubmission(req.body, {
      required: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'state', label: 'State' },
        { key: 'universityId', label: 'University' },
        { key: 'leadType', label: 'Lead type' },
      ],
      email: true,
      phone: true,
      phoneRequired: true,
    });
    if (problem) return fail(res, 400, problem);

    const leadType = asString(req.body.leadType).toLowerCase();
    if (!LEAD_TYPES.includes(leadType)) {
      return fail(res, 400, `Lead type must be one of: ${LEAD_TYPES.join(', ')}`);
    }

    // A non-ObjectId universityId previously reached findById and threw a
    // CastError that surfaced as a 500.
    const universityId = asString(req.body.universityId);
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return fail(res, 404, 'University not found.');
    }

    // Only the existence of the university matters here — select nothing else.
    const university = await University.exists({ _id: universityId });
    if (!university) {
      return fail(res, 404, 'University not found.');
    }

    const lead = await Lead.create({
      name: asString(req.body.name),
      email: normalizeEmail(req.body.email),
      phone: asString(req.body.phone),
      state: asString(req.body.state),
      preferredCourse: asString(req.body.preferredCourse) || undefined,
      universityId,
      leadType,
      notes: asString(req.body.notes) || undefined,
    });

    res.status(201).json({ success: true, message: 'Lead captured successfully.', data: lead });
  } catch (error) {
    return serverError(res, error, 'lead.submitLead');
  }
};

// Retrieve leads (admin route)
exports.getLeads = async (req, res) => {
  try {
    const { universityId } = req.query;
    const filter = {};
    if (universityId) {
      if (!mongoose.Types.ObjectId.isValid(universityId)) {
        return fail(res, 400, 'Invalid universityId');
      }
      filter.universityId = universityId;
    }

    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('universityId', 'name slug logoUrl state city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(filter),
    ]);

    return paginated(res, { data: leads, total, page, limit });
  } catch (error) {
    return serverError(res, error, 'lead.getLeads');
  }
};

// Get analytics (admin route)
exports.getSaaSAnalytics = async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const sponsoredCount = await University.countDocuments({ isSponsored: true });

    const leadsByUni = await Lead.aggregate([
      { $group: { _id: '$universityId', leadCount: { $sum: 1 } } },
      { $sort: { leadCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'universities', localField: '_id', foreignField: '_id', as: 'university' } },
      { $unwind: '$university' },
      {
        $project: {
          _id: 1, leadCount: 1,
          name: '$university.name', slug: '$university.slug',
          isSponsored: '$university.isSponsored', sponsorTier: '$university.sponsorTier'
        }
      }
    ]);

    const topViewed = await University.find()
      .sort({ views: -1 })
      .limit(10)
      .select('name slug views isSponsored sponsorTier');

    res.json({ success: true, data: { totalLeads, sponsoredCount, leadsByUniversity: leadsByUni, topViewedUniversities: topViewed } });
  } catch (error) {
    return serverError(res, error, 'lead.getSaaSAnalytics');
  }
};

// Export leads as CSV (admin route)
exports.exportLeadsCSV = async (req, res) => {
  try {
    const { universityId, from, to } = req.query;
    const filter = {};

    if (universityId) filter.universityId = universityId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const leads = await Lead.find(filter)
      .populate('universityId', 'name state city sponsorTier')
      .sort({ createdAt: -1 })
      .limit(5000);

    const esc = (val) => {
      let s = String(val == null ? '' : val);
      // Neutralize CSV/formula injection: lead fields come from a public,
      // unauthenticated endpoint, so a value like "=HYPERLINK(...)" could execute
      // when an admin opens the export. Prefix formula triggers with an apostrophe.
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      s = s.replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'Student Name', 'Email', 'Phone', 'State', 'Preferred Course',
      'Lead Type', 'University', 'Uni State', 'Sponsor Tier', 'Date Captured'
    ];

    const rows = leads.map(l => [
      esc(l.name), esc(l.email), esc(l.phone), esc(l.state), esc(l.preferredCourse),
      esc(l.leadType), esc(l.universityId?.name || ''), esc(l.universityId?.state || ''),
      esc(l.universityId?.sponsorTier || 'none'),
      esc(new Date(l.createdAt).toLocaleString('en-IN'))
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    const filename = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM prefix for Excel UTF-8 compatibility
  } catch (error) {
    return serverError(res, error, 'lead.exportLeadsCSV');
  }
};

// Per-university partner analytics (admin route)
exports.getPartnerAnalytics = async (req, res) => {
  try {
    const { universityId } = req.params;

    // A non-ObjectId param previously threw a CastError surfaced as a 500.
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return fail(res, 404, 'University not found.');
    }

    const university = await University.findById(universityId)
      .select('name slug logoUrl state city isSponsored sponsorTier sponsorExpiry views');
    if (!university) {
      return fail(res, 404, 'University not found.');
    }

    // Clamp the window: parseInt('abc') gave NaN, which made `since` an Invalid
    // Date and silently returned an empty chart.
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Leads for this university in date range
    const [totalLeads, applyLeads, brochureLeads, recentLeads] = await Promise.all([
      Lead.countDocuments({ universityId }),
      Lead.countDocuments({ universityId, leadType: 'apply' }),
      Lead.countDocuments({ universityId, leadType: 'brochure' }),
      Lead.find({ universityId, createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('name email phone state preferredCourse leadType createdAt')
    ]);

    // Daily lead aggregation for chart
    const dailyLeads = await Lead.aggregate([
      { $match: { universityId: university._id, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        university,
        totalLeads,
        applyLeads,
        brochureLeads,
        recentLeads,
        dailyLeads,
        profileViews: university.views || 0
      }
    });
  } catch (error) {
    return serverError(res, error, 'lead.getPartnerAnalytics');
  }
};
