const User       = require('../models/User');
const University = require('../models/University');
const bcrypt     = require('bcryptjs');

/* ─── Existing: Profile ──────────────────────────────────────── */

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('savedUniversities')
      .populate('savedCourses');
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = { name: req.body.name, profile: req.body.profile };
    if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ─── Existing: Saved Universities ──────────────────────────── */

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
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { savedUniversities: req.params.universityId }
    });
    res.json({ success: true, message: 'University removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ─── New: Saved Courses ─────────────────────────────────────── */

exports.getSavedCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedCourses');
    res.json({ success: true, data: user.savedCourses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveCourse = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.savedCourses.map(String).includes(req.params.courseId)) {
      return res.status(400).json({ success: false, message: 'Course already saved' });
    }
    user.savedCourses.push(req.params.courseId);
    await user.save();
    res.json({ success: true, message: 'Course saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeSavedCourse = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { savedCourses: req.params.courseId }
    });
    res.json({ success: true, message: 'Course removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ─── New: Change Password ───────────────────────────────────── */

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both fields are required' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!user.password) {
      return res.status(400).json({ success: false, message: 'Password not set (OAuth account)' });
    }
    const ok = await user.comparePassword(currentPassword);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ─── New: Ratings ───────────────────────────────────────────── */

exports.upsertRating = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1–5' });
    }
    await User.findByIdAndUpdate(req.user._id, {
      $set: { [`ratings.${req.params.universityId}`]: Number(rating) }
    });
    res.json({ success: true, message: 'Rating saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ─── New: Notes ─────────────────────────────────────────────── */

exports.upsertNote = async (req, res) => {
  try {
    const { note } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      $set: { [`notes.${req.params.universityId}`]: note || '' }
    });
    res.json({ success: true, message: 'Note saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ─── New: Recommendations ───────────────────────────────────── */

exports.getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { preferredStates, collegeType, preferredCourse } = user.profile || {};

    const query = {};

    // Match preferred state(s)
    if (preferredStates && preferredStates.length > 0) {
      query.state = { $in: preferredStates };
    }

    // Match college type
    if (collegeType && collegeType !== 'both') {
      query.type = collegeType;
    }

    // Exclude already saved universities
    if (user.savedUniversities.length > 0) {
      query._id = { $nin: user.savedUniversities };
    }

    const recommendations = await University.find(query)
      .select('name state city type naacGrade nirfRank slug logoUrl stats')
      .limit(20)
      .sort({ nirfRank: 1 });

    res.json({ success: true, data: recommendations, total: recommendations.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ─── New: Applications ──────────────────────────────────────── */

exports.addApplication = async (req, res) => {
  try {
    const { universityId, notes } = req.body;
    const user = await User.findById(req.user._id);
    if (user.applications.some(a => a.universityId.toString() === universityId)) {
      return res.status(400).json({ success: false, message: 'Application already tracked' });
    }
    user.applications.push({ universityId, notes, status: 'applied' });
    await user.save();
    res.json({ success: true, message: 'Application added to tracker' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await User.updateOne(
      { _id: req.user._id, 'applications._id': req.params.applicationId },
      { $set: { 'applications.$.status': status } }
    );
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ─── New: Notifications ─────────────────────────────────────── */

exports.getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    res.json({ success: true, data: user.notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id, 'notifications._id': req.params.notificationId },
      { $set: { 'notifications.$.read': true } }
    );
    res.json({ success: true, message: 'Notification read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
