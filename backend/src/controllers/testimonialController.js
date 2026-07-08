const Testimonial = require('../models/Testimonial');
const { logAction } = require('../services/auditService');

exports.getAll = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json({ success: true, data: testimonials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const testimonial = await Testimonial.create(req.body);
    await logAction({ userId: req.user._id, action: 'create', resource: 'Testimonial', resourceId: testimonial._id, description: `Created testimonial by: ${testimonial.name}`, req });
    res.status(201).json({ success: true, data: testimonial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    await logAction({ userId: req.user._id, action: 'update', resource: 'Testimonial', resourceId: testimonial._id, description: `Updated testimonial by: ${testimonial.name}`, req });
    res.json({ success: true, data: testimonial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    await logAction({ userId: req.user._id, action: 'delete', resource: 'Testimonial', resourceId: testimonial._id, req });
    res.json({ success: true, message: 'Testimonial deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public submission
exports.submitPublic = async (req, res) => {
  try {
    // Validate required fields up-front so an empty/invalid body returns a clean
    // 400 instead of a raw Mongoose ValidationError surfaced as a 500.
    const { name, content } = req.body;
    if (!name || !content) {
      return res.status(400).json({ success: false, message: 'Name and feedback are required' });
    }
    const testimonial = await Testimonial.create({
      ...req.body,
      isApproved: false // Requires admin approval
    });
    res.status(201).json({ success: true, message: 'Thank you! Your feedback has been submitted for review.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public fetch
exports.getApproved = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isApproved: true }).sort({ isFeatured: -1, createdAt: -1 }).limit(20);
    res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
    res.json({ success: true, data: testimonials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
