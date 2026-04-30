const Page = require('../models/Page');
const { logAction } = require('../services/auditService');

exports.getAll = async (req, res) => {
  try {
    const pages = await Page.find().sort({ order: 1, createdAt: -1 }).populate('author', 'name');
    res.json({ success: true, data: pages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const page = await Page.create({ ...req.body, author: req.user._id });
    await logAction({ userId: req.user._id, action: 'create', resource: 'Page', resourceId: page._id, description: `Created page: ${page.title}`, req });
    res.status(201).json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const page = await Page.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    await logAction({ userId: req.user._id, action: 'update', resource: 'Page', resourceId: page._id, description: `Updated page: ${page.title}`, req });
    res.json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    await logAction({ userId: req.user._id, action: 'delete', resource: 'Page', resourceId: page._id, req });
    res.json({ success: true, message: 'Page deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public
exports.getBySlug = async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug, isPublished: true });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    res.json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
