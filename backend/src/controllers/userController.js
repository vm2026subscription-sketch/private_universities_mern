const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedUniversities');
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = { name: req.body.name, profile: req.body.profile };
    if (req.body.avatar) updates.avatar = req.body.avatar;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSavedUniversities = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedUniversities');
    res.json({ success: true, data: user.savedUniversities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveUniversity = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.savedUniversities.includes(req.params.universityId)) {
      return res.status(400).json({ success: false, message: 'Already saved' });
    }
    user.savedUniversities.push(req.params.universityId);
    await user.save();
    res.json({ success: true, message: 'University saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeSavedUniversity = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { savedUniversities: req.params.universityId } });
    res.json({ success: true, message: 'University removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
