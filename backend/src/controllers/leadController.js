const Lead = require('../models/Lead');
const University = require('../models/University');

// Submit a lead (public route)
exports.submitLead = async (req, res) => {
  try {
    const { name, email, phone, state, preferredCourse, universityId, leadType, notes } = req.body;

    if (!name || !email || !phone || !state || !universityId || !leadType) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, email, phone, state, universityId, leadType) are required.'
      });
    }

    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ success: false, message: 'University not found.' });
    }

    const lead = await Lead.create({ name, email, phone, state, preferredCourse, universityId, leadType, notes });

    res.status(201).json({ success: true, message: 'Lead captured successfully.', data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Retrieve leads (admin route)
exports.getLeads = async (req, res) => {
  try {
    const { universityId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (universityId) filter.universityId = universityId;

    const normalizedPage = Math.max(parseInt(page, 10) || 1, 1);
    const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (normalizedPage - 1) * normalizedLimit;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('universityId', 'name slug logoUrl state city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit),
      Lead.countDocuments(filter)
    ]);

    res.json({ success: true, data: leads, total, page: normalizedPage, pages: Math.ceil(total / normalizedLimit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
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
      const s = String(val == null ? '' : val).replace(/"/g, '""');
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Per-university partner analytics (admin route)
exports.getPartnerAnalytics = async (req, res) => {
  try {
    const { universityId } = req.params;
    const { days = 30 } = req.query;

    const university = await University.findById(universityId)
      .select('name slug logoUrl state city isSponsored sponsorTier sponsorExpiry views');
    if (!university) {
      return res.status(404).json({ success: false, message: 'University not found.' });
    }

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));

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
    res.status(500).json({ success: false, message: error.message });
  }
};
