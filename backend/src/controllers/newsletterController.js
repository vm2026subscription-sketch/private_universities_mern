const Newsletter = require('../models/Newsletter');

exports.getSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find().sort({ createdAt: -1 });
    res.json({ success: true, data: subscribers, total: subscribers.length, active: subscribers.filter(s => s.isSubscribed).length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeSubscriber = async (req, res) => {
  try {
    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);
    if (!subscriber) return res.status(404).json({ success: false, message: 'Subscriber not found' });
    res.json({ success: true, message: 'Subscriber removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public
exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const existing = await Newsletter.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.isSubscribed) return res.json({ success: true, message: 'Already subscribed' });
      existing.isSubscribed = true;
      existing.subscribedAt = new Date();
      existing.unsubscribedAt = undefined;
      await existing.save();
      return res.json({ success: true, message: 'Re-subscribed successfully' });
    }

    await Newsletter.create({ email: email.toLowerCase() });
    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;
    const subscriber = await Newsletter.findOne({ email: email.toLowerCase() });
    if (!subscriber) return res.status(404).json({ success: false, message: 'Not found' });
    subscriber.isSubscribed = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();
    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
