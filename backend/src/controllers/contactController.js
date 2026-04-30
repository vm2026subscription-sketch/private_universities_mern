const ContactSubmission = require('../models/ContactSubmission');
const { logAction } = require('../services/auditService');

exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const submissions = await ContactSubmission.find(filter).sort({ createdAt: -1 }).populate('repliedBy', 'name');
    res.json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const updates = { status: req.body.status };
    if (req.body.notes) updates.notes = req.body.notes;
    if (req.body.status === 'replied') {
      updates.repliedBy = req.user._id;
      updates.repliedAt = new Date();
    }
    const submission = await ContactSubmission.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    await logAction({ userId: req.user._id, action: 'update', resource: 'ContactSubmission', resourceId: submission._id, description: `Updated contact status to: ${req.body.status}`, req });
    res.json({ success: true, data: submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const submission = await ContactSubmission.findByIdAndDelete(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    res.json({ success: true, message: 'Submission deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public
exports.submit = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, subject and message are required' });
    }
    const submission = await ContactSubmission.create({ name, email, phone, subject, message });
    res.status(201).json({ success: true, message: 'Your message has been received. We will get back to you soon.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
