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

    // Check if university exists
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({
        success: false,
        message: 'University not found.'
      });
    }

    const lead = await Lead.create({
      name,
      email,
      phone,
      state,
      preferredCourse,
      universityId,
      leadType,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Lead captured successfully.',
      data: lead
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Retrieve leads (admin route)
exports.getLeads = async (req, res) => {
  try {
    const { universityId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (universityId) {
      filter.universityId = universityId;
    }

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

    res.json({
      success: true,
      data: leads,
      total,
      page: normalizedPage,
      pages: Math.ceil(total / normalizedLimit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get basic analytics (admin route)
exports.getSaaSAnalytics = async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const sponsoredCount = await University.countDocuments({ isSponsored: true });
    
    // Aggregate leads by university
    const leadsByUni = await Lead.aggregate([
      {
        $group: {
          _id: '$universityId',
          leadCount: { $sum: 1 }
        }
      },
      { $sort: { leadCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'universities',
          localField: '_id',
          foreignField: '_id',
          as: 'university'
        }
      },
      {
        $unwind: '$university'
      },
      {
        $project: {
          _id: 1,
          leadCount: 1,
          name: '$university.name',
          slug: '$university.slug',
          isSponsored: '$university.isSponsored',
          sponsorTier: '$university.sponsorTier'
        }
      }
    ]);

    // Top viewed universities
    const topViewed = await University.find()
      .sort({ views: -1 })
      .limit(10)
      .select('name slug views isSponsored sponsorTier');

    res.json({
      success: true,
      data: {
        totalLeads,
        sponsoredCount,
        leadsByUniversity: leadsByUni,
        topViewedUniversities: topViewed
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
