const User = require('../models/User');
const University = require('../models/University');
const Course = require('../models/Course');
const { getSafeUserProfile } = require('../utils/userSerializer');
const { signAccessToken } = require('../utils/tokenService');
const { issueRefreshToken, revokeAllForUser } = require('../services/refreshTokenService');
const { setRefreshCookie } = require('./authController');
const { uploadToCloudinary } = require('../utils/imageUpload');
const mongoose = require('mongoose');
const { serverError, fail, paginated } = require('../utils/apiResponse');

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
    return serverError(res, error, 'user.getProfile');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('savedUniversities')
      .populate('savedCourses');

    if (!user) {
      return fail(res, 404, 'User not found');
    }

    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      user.name = req.body.name.trim();
    }

    if (req.body.avatar !== undefined) {
      user.avatar = String(req.body.avatar || '').trim();
    }

    if (req.body.hasCompletedPreferences !== undefined) {
      user.hasCompletedPreferences = Boolean(req.body.hasCompletedPreferences);
    }

    if (req.body.profile && typeof req.body.profile === 'object') {
      user.profile = {
        ...(user.profile?.toObject ? user.profile.toObject() : user.profile || {}),
        ...req.body.profile,
      };
      // Mark completed if profile preferences are supplied
      if (req.body.hasCompletedPreferences === undefined) {
        const p = user.profile;
        if (p.state || p.stream || p.preferredCourse || (Array.isArray(p.preferredStates) && p.preferredStates.length > 0)) {
          user.hasCompletedPreferences = true;
        }
      }
    }

    user.profileCompleteness = calculateProfileCompleteness(user);
    await user.save();

    res.json({ success: true, data: getSafeUserProfile(user) });
  } catch (error) {
    return serverError(res, error, 'user.updateProfile');
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 400, 'Please select an image file to upload');
    }

    let imageUrl;
    try {
      const result = await uploadToCloudinary(req.file.buffer, { folder: 'vidyarthi-mitra/avatars' });
      imageUrl = result.url;
    } catch (err) {
      const base64 = req.file.buffer.toString('base64');
      imageUrl = `data:${req.file.mimetype};base64,${base64}`;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return fail(res, 404, 'User not found');
    }

    user.avatar = imageUrl;
    user.profileCompleteness = calculateProfileCompleteness(user);
    await user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: getSafeUserProfile(user),
      url: imageUrl,
    });
  } catch (error) {
    // Was `error.message || 'Avatar upload failed'`, which echoed the raw
    // Cloudinary/driver message (including config details) to the client.
    return serverError(res, error, 'user.uploadAvatar');
  }
};

exports.getSavedUniversities = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedUniversities');
    res.json({ success: true, data: user.savedUniversities });
  } catch (error) {
    return serverError(res, error, 'user.getSavedUniversities');
  }
};

exports.saveUniversity = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.universityId)) {
      return fail(res, 400, 'Invalid university ID');
    }

    const user = await User.findById(req.user._id);
    const university = await University.findById(req.params.universityId).select('_id');

    if (!university) {
      return fail(res, 404, 'University not found');
    }

    if (user.savedUniversities.map(String).includes(req.params.universityId)) {
      return fail(res, 400, 'Already saved');
    }

    user.savedUniversities.push(req.params.universityId);
    await user.save();
    res.json({ success: true, message: 'University saved' });
  } catch (error) {
    return serverError(res, error, 'user.saveUniversity');
  }
};

exports.removeSavedUniversity = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.universityId)) {
      return fail(res, 400, 'Invalid university ID');
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { savedUniversities: req.params.universityId },
    });
    res.json({ success: true, message: 'University removed' });
  } catch (error) {
    return serverError(res, error, 'user.removeSavedUniversity');
  }
};

exports.getSavedCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedCourses');
    res.json({ success: true, data: user.savedCourses });
  } catch (error) {
    return serverError(res, error, 'user.getSavedCourses');
  }
};

exports.saveCourse = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.courseId)) {
      return fail(res, 400, 'Invalid course ID');
    }

    const user = await User.findById(req.user._id);
    const course = await Course.findById(req.params.courseId).select('_id');

    if (!course) {
      return fail(res, 404, 'Course not found');
    }

    if (user.savedCourses.map(String).includes(req.params.courseId)) {
      return fail(res, 400, 'Course already saved');
    }

    user.savedCourses.push(req.params.courseId);
    await user.save();
    res.json({ success: true, message: 'Course saved' });
  } catch (error) {
    return serverError(res, error, 'user.saveCourse');
  }
};

exports.removeSavedCourse = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.courseId)) {
      return fail(res, 400, 'Invalid course ID');
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { savedCourses: req.params.courseId },
    });
    res.json({ success: true, message: 'Course removed' });
  } catch (error) {
    return serverError(res, error, 'user.removeSavedCourse');
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return fail(res, 400, 'Both fields are required');
    }

    const password = String(newPassword);

    // Matches the registration/reset policy (8+, bounded, not trivially weak).
    if (password.length < 8) {
      return fail(res, 400, 'New password must be at least 8 characters long');
    }
    if (password.length > 128) {
      return fail(res, 400, 'New password must be at most 128 characters long');
    }
    if (password === String(currentPassword)) {
      return fail(res, 400, 'New password must be different from the current one');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user.password) {
      return fail(res, 400, 'Password not set (OAuth account)');
    }

    const ok = await user.comparePassword(currentPassword);
    if (!ok) {
      return fail(res, 401, 'Current password is incorrect');
    }

    user.password = password;

    // Invalidate every other session. Changing a password is how a user
    // responds to a suspected compromise, so previously issued tokens must not
    // survive it — the old implementation left them valid for up to 30 days.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await revokeAllForUser(user._id, 'password_change');

    // The caller's own token was just invalidated too, so hand back a fresh
    // session rather than silently logging them out.
    const token = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user, req);

    // The refresh COOKIE must be replaced as well. /auth/refresh reads the
    // cookie in preference to the body, so leaving a stale revoked cookie in
    // place would trip reuse detection on the next refresh and force a logout
    // roughly one access-token lifetime after a routine password change.
    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      message: 'Password changed successfully. Other devices have been signed out.',
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('[user] changePassword failed:', error);
    fail(res, 500, 'Could not change password');
  }
};

exports.upsertRating = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return fail(res, 400, 'Rating must be between 1 and 5');
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: { [`ratings.${req.params.universityId}`]: Number(rating) },
    });

    res.json({ success: true, message: 'Rating saved' });
  } catch (error) {
    return serverError(res, error, 'user.upsertRating');
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
    return serverError(res, error, 'user.upsertNote');
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { preferredStates, collegeType, stream, preferredCourse, state } = user.profile || {};

    const query = {};

    if (preferredStates && preferredStates.length > 0) {
      query.state = { $in: preferredStates };
    }

    if (collegeType && collegeType !== 'both') {
      query.type = collegeType;
    }

    if (user.savedUniversities && user.savedUniversities.length > 0) {
      query._id = { $nin: user.savedUniversities };
    }

    let recommendations = await University.find(query)
      .select('name state city type naacGrade nirfRank slug logoUrl stats description')
      .populate('courses')
      .limit(30)
      .sort({ nirfRank: 1 });

    // Fallback: If strict state/type filtering yields fewer than 4 items, relax state filter to ensure user receives results
    if (recommendations.length < 4) {
      const fallbackQuery = {};
      if (collegeType && collegeType !== 'both') {
        fallbackQuery.type = collegeType;
      }
      if (user.savedUniversities && user.savedUniversities.length > 0) {
        fallbackQuery._id = { $nin: user.savedUniversities };
      }

      const fallbackRecs = await University.find(fallbackQuery)
        .select('name state city type naacGrade nirfRank slug logoUrl stats description')
        .populate('courses')
        .limit(20)
        .sort({ nirfRank: 1 });

      const existingIds = new Set(recommendations.map((r) => r._id.toString()));
      for (const rec of fallbackRecs) {
        if (!existingIds.has(rec._id.toString())) {
          recommendations.push(rec);
        }
      }
    }

    // Rank / Score based on stream, preferredCourse, and state matching
    if (stream || preferredCourse || state || (preferredStates && preferredStates.length > 0)) {
      const courseRegex = preferredCourse ? new RegExp(preferredCourse, 'i') : null;
      const streamRegex = stream ? new RegExp(stream, 'i') : null;

      recommendations = recommendations
        .map((uni) => {
          let score = 0;
          if (preferredStates?.includes(uni.state)) score += 30;
          else if (state && uni.state === state) score += 15;

          if (uni.courses && Array.isArray(uni.courses)) {
            const hasMatchingCourse = uni.courses.some(
              (c) =>
                (courseRegex && (courseRegex.test(c.name || '') || courseRegex.test(c.stream || ''))) ||
                (streamRegex && (streamRegex.test(c.stream || '') || streamRegex.test(c.name || '')))
            );
            if (hasMatchingCourse) score += 40;
          }

          if (streamRegex && (streamRegex.test(uni.description || '') || streamRegex.test(uni.name || ''))) {
            score += 10;
          }

          return { uni, score };
        })
        .sort((a, b) => b.score - a.score || (a.uni.nirfRank || 999) - (b.uni.nirfRank || 999))
        .map((item) => item.uni);
    }

    const RECOMMENDATION_LIMIT = 20;
    return paginated(res, {
      data: recommendations.slice(0, RECOMMENDATION_LIMIT),
      total: recommendations.length,
      page: 1,
      limit: RECOMMENDATION_LIMIT,
    });
  } catch (error) {
    return serverError(res, error, 'user.getRecommendations');
  }
};

exports.addApplication = async (req, res) => {
  try {
    const { universityId, notes } = req.body;
    if (!universityId) {
      return fail(res, 400, 'University is required');
    }
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return fail(res, 400, 'Invalid university ID');
    }

    const university = await University.findById(universityId).select('_id');
    if (!university) {
      return fail(res, 404, 'University not found');
    }

    const user = await User.findById(req.user._id);
    if (user.applications.some((application) => application.universityId.toString() === universityId)) {
      return fail(res, 400, 'Application already tracked');
    }

    user.applications.push({ universityId, notes, status: 'applied' });
    await user.save();
    res.json({ success: true, message: 'Application added to tracker' });
  } catch (error) {
    return serverError(res, error, 'user.addApplication');
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!APPLICATION_STATUSES.includes(status)) {
      return fail(res, 400, 'Invalid application status');
    }

    const result = await User.updateOne(
      { _id: req.user._id, 'applications._id': req.params.applicationId },
      { $set: { 'applications.$.status': status } }
    );

    if (!result.matchedCount) {
      return fail(res, 404, 'Application not found');
    }

    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    return serverError(res, error, 'user.updateApplicationStatus');
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    res.json({ success: true, data: user.notifications });
  } catch (error) {
    return serverError(res, error, 'user.getNotifications');
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
    return serverError(res, error, 'user.markNotificationRead');
  }
};
