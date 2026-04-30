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

// Public
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

    const banners = await Banner.find(filter).sort({ priority: -1 }).limit(20);
    const filtered = banners.filter(b => !b.endDate || new Date(b.endDate) >= now);
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
