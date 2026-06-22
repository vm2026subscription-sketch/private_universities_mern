const Banner = require('../models/Banner');
const { logAction } = require('../services/auditService');

exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ priority: -1, createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBanner = async (req, res) => {
  try {
    const banner = await Banner.create(req.body);
    await logAction({ userId: req.user._id, action: 'create', resource: 'Banner', resourceId: banner._id, description: `Created banner: ${banner.title}`, req });
    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    await logAction({ userId: req.user._id, action: 'update', resource: 'Banner', resourceId: banner._id, description: `Updated banner: ${banner.title}`, req });
    res.json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    await logAction({ userId: req.user._id, action: 'delete', resource: 'Banner', resourceId: banner._id, description: `Deleted banner: ${banner.title}`, req });
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public: get active banners + auto-increment impressions
exports.getActiveBanners = async (req, res) => {
  try {
    const { page = 'home', position } = req.query;
    const now = new Date();
    const filter = {
      isActive: true,
      $or: [{ startDate: null }, { startDate: { $lte: now } }],
    };
    if (page) filter.page = page;
    if (position) filter.position = position;

    const banners = await Banner.find(filter)
      .sort({ priority: -1 })
      .limit(20)
      .populate('universityId', 'name slug logoUrl logo city state naacGrade stats sponsorTier');
    const filtered = banners.filter(b => !b.endDate || new Date(b.endDate) >= now);

    // Increment impressions for all served banners (fire-and-forget)
    const ids = filtered.map(b => b._id);
    if (ids.length > 0) {
      Banner.updateMany({ _id: { $in: ids } }, { $inc: { impressions: 1 } }).catch(() => {});
    }

    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: aggregated analytics across all ad banners
exports.getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const banners = await Banner.find()
      .sort({ impressions: -1 })
      .populate('universityId', 'name slug');

    const withCtr = (b) => (b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0);

    const totals = banners.reduce(
      (acc, b) => {
        acc.impressions += b.impressions || 0;
        acc.clicks += b.clicks || 0;
        acc.banners += 1;
        const isScheduledOut =
          (b.startDate && new Date(b.startDate) > now) ||
          (b.endDate && new Date(b.endDate) < now);
        if (b.isActive && !isScheduledOut) acc.active += 1;
        return acc;
      },
      { impressions: 0, clicks: 0, banners: 0, active: 0 }
    );
    totals.ctr = totals.impressions > 0
      ? parseFloat(((totals.clicks / totals.impressions) * 100).toFixed(2))
      : 0;

    // Per-position breakdown
    const byPositionMap = {};
    for (const b of banners) {
      const key = b.position || 'other';
      if (!byPositionMap[key]) byPositionMap[key] = { position: key, impressions: 0, clicks: 0, banners: 0 };
      byPositionMap[key].impressions += b.impressions || 0;
      byPositionMap[key].clicks += b.clicks || 0;
      byPositionMap[key].banners += 1;
    }
    const byPosition = Object.values(byPositionMap).map((p) => ({
      ...p,
      ctr: p.impressions > 0 ? parseFloat(((p.clicks / p.impressions) * 100).toFixed(2)) : 0,
    }));

    // Top performers by CTR (require at least some impressions)
    const topPerformers = [...banners]
      .filter((b) => (b.impressions || 0) > 0)
      .map((b) => ({
        _id: b._id,
        title: b.title,
        position: b.position,
        university: b.universityId ? b.universityId.name : null,
        impressions: b.impressions || 0,
        clicks: b.clicks || 0,
        ctr: parseFloat(withCtr(b).toFixed(2)),
      }))
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 10);

    res.json({ success: true, data: { totals, byPosition, topPerformers } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public: click redirect + track CTR
exports.trackClick = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    banner.clicks += 1;
    banner.ctr = banner.impressions > 0
      ? parseFloat(((banner.clicks / banner.impressions) * 100).toFixed(2))
      : 0;
    await banner.save();

    // Redirect to banner link, or return JSON if no link
    if (banner.link) {
      return res.redirect(banner.link);
    }
    res.json({ success: true, clicks: banner.clicks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
