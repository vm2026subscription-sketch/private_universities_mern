const User = require('../models/User');
const University = require('../models/University');
const Course = require('../models/Course');
const { getSafeUserProfile } = require('../utils/userSerializer');

const APPLICATION_STATUSES = ['applied', 'pending', 'accepted', 'rejected'];

const calculateProfileCompleteness = (user) => {
  const checks = [
    user.name,
    user.email,
    user.avatar,
    user.profile?.city,
    user.profile?.state,
    user.profile?.stream,
    user.profile?.preferredCourse,
    user.profile?.targetExam,
  ];

  const completed = checks.filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
  }).length;

  return Math.round((completed / checks.length) * 100);
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('savedUniversities')
      .populate('savedCourses');

    res.json({ success: true, data: getSafeUserProfile(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('savedUniversities')
      .populate('savedCourses');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      user.name = req.body.name.trim();
    }

    if (req.body.avatar !== undefined) {
      user.avatar = String(req.body.avatar || '').trim();
    }

    if (req.body.profile && typeof req.body.profile === 'object') {
      user.profile = {
        ...(user.profile?.toObject ? user.profile.toObject() : user.profile || {}),
        ...req.body.profile,
      };
    }

    user.profileCompleteness = calculateProfileCompleteness(user);
    await user.save();

    res.json({ success: true, data: getSafeUserProfile(user) });
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
    const university = await University.findById(req.params.universityId).select('_id');

    if (!university) {
      return res.status(404).json({ success: false, message: 'University not found' });
    }

    if (user.savedUniversities.map(String).includes(req.params.universityId)) {
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
      $pull: { savedUniversities: req.params.universityId },
    });
    res.json({ success: true, message: 'University removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
    const course = await Course.findById(req.params.courseId).select('_id');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

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
      $pull: { savedCourses: req.params.courseId },
    });
    res.json({ success: true, message: 'Course removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both fields are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
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

exports.upsertRating = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: { [`ratings.${req.params.universityId}`]: Number(rating) },
    });

    res.json({ success: true, message: 'Rating saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.upsertNote = async (req, res) => {
  try {
    const { note } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      $set: { [`notes.${req.params.universityId}`]: note || '' },
    });
    res.json({ success: true, message: 'Note saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { preferredStates, collegeType } = user.profile || {};

    const query = {};

    if (preferredStates && preferredStates.length > 0) {
      query.state = { $in: preferredStates };
    }

    if (collegeType && collegeType !== 'both') {
      query.type = collegeType;
    }

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

exports.addApplication = async (req, res) => {
  try {
    const { universityId, notes } = req.body;
    if (!universityId) {
      return res.status(400).json({ success: false, message: 'University is required' });
    }

    const university = await University.findById(universityId).select('_id');
    if (!university) {
      return res.status(404).json({ success: false, message: 'University not found' });
    }

    const user = await User.findById(req.user._id);
    if (user.applications.some((application) => application.universityId.toString() === universityId)) {
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
    if (!APPLICATION_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid application status' });
    }

    const result = await User.updateOne(
      { _id: req.user._id, 'applications._id': req.params.applicationId },
      { $set: { 'applications.$.status': status } }
    );

    if (!result.matchedCount) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
