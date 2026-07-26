const User = require('../models/User');
const University = require('../models/University');
const Course = require('../models/Course');
const Exam = require('../models/Exam');
const News = require('../models/News');
const Question = require('../models/Question');
const { buildUniqueSlug } = require('../utils/slug');
const { normalizeUniversityClassification } = require('../utils/universityClassification');
const { logAction } = require('../services/auditService');
const { revokeAllForUser } = require('../services/refreshTokenService');
const { serverError, fail, paginated, parsePagination } = require('../utils/apiResponse');
const { escapeRegExp } = require('../utils/regex');
const { findExistingUniversity, describeMatch } = require('../utils/universityMatching');

const splitPipe = (value) => String(value || '').split('|').map((item) => item.trim()).filter(Boolean);
const parseNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isNaN(number) ? undefined : number;
};
const parseFlexibleMetric = (value) => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return { numericValue: undefined, labelValue: undefined };

  const normalizedNumericCandidate = rawValue.replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(normalizedNumericCandidate)) {
    const numericValue = Number(normalizedNumericCandidate);
    return {
      numericValue: Number.isNaN(numericValue) ? undefined : numericValue,
      labelValue: undefined,
    };
  }

  const firstMatch = normalizedNumericCandidate.match(/-?\d+(\.\d+)?/);
  const numericValue = firstMatch ? Number(firstMatch[0]) : undefined;

  return {
    numericValue: Number.isNaN(numericValue) ? undefined : numericValue,
    labelValue: rawValue,
  };
};
const toArray = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  return splitPipe(value);
};
const buildCourseName = (baseCourse, specializationName, fallbackName) => {
  const normalizedBaseCourse = String(baseCourse || '').trim();
  const normalizedSpecialization = String(specializationName || '').trim();
  const normalizedFallback = String(fallbackName || '').trim();

  if (normalizedFallback) return normalizedFallback;
  if (normalizedBaseCourse && normalizedSpecialization && normalizedSpecialization.toLowerCase() !== 'general') {
    return `${normalizedBaseCourse} - ${normalizedSpecialization}`;
  }
  return normalizedBaseCourse;
};

const sanitizeCoursePayload = (course = {}, universityId) => {
  const baseCourse = String(course.baseCourse || course.name || '').trim();
  const specializationName = String(course.specializationName || '').trim();
  const totalSeatsMetric = parseFlexibleMetric(course.totalSeats);
  const feesMetric = parseFlexibleMetric(course.feesPerYear);
  const payload = {
    _id: course._id,
    universityId,
    name: buildCourseName(baseCourse, specializationName, course.name),
    category: String(course.category || 'UG').trim() || 'UG',
    stream: String(course.stream || 'Others').trim() || 'Others',
    baseCourse,
    specializationName: specializationName || undefined,
    duration: parseNumber(course.duration),
    totalSeats: totalSeatsMetric.numericValue,
    totalSeatsLabel: totalSeatsMetric.labelValue,
    feesPerYear: feesMetric.numericValue,
    feesPerYearLabel: feesMetric.labelValue,
    eligibility: course.eligibility ? String(course.eligibility).trim() : undefined,
    entranceExams: toArray(course.entranceExams || course.entranceExamsText),
  };

  if (!payload.baseCourse || !payload.name) return null;
  return payload;
};

const sanitizeUniversityPayload = (input = {}) => {
  const payload = { ...input };
  const hasCoursesField = Array.isArray(payload.courses);
  const courses = hasCoursesField ? payload.courses : [];
  delete payload.courses;

  const totalStudentsMetric = parseFlexibleMetric(payload.stats?.totalStudents);
  const campusSizeMetric = parseFlexibleMetric(payload.stats?.campusSizeAcres);
  const avgPackageMetric = parseFlexibleMetric(payload.stats?.avgPackageLPA);
  const highestPackageMetric = parseFlexibleMetric(payload.stats?.highestPackageLPA);
  const placementMetric = parseFlexibleMetric(payload.stats?.placementPercentage);

  payload.stats = {
    ...(payload.stats || {}),
    totalStudents: totalStudentsMetric.numericValue,
    totalStudentsLabel: totalStudentsMetric.labelValue,
    campusSizeAcres: campusSizeMetric.numericValue,
    campusSizeLabel: campusSizeMetric.labelValue,
    avgPackageLPA: avgPackageMetric.numericValue,
    avgPackageLPALabel: avgPackageMetric.labelValue,
    highestPackageLPA: highestPackageMetric.numericValue,
    highestPackageLPALabel: highestPackageMetric.labelValue,
    placementPercentage: placementMetric.numericValue,
    placementPercentageLabel: placementMetric.labelValue,
  };

  const classification = normalizeUniversityClassification(payload);

  return {
    payload: {
      ...payload,
      ...classification,
    },
    courses,
    hasCoursesField,
  };
};

const syncUniversityCourses = async (university, courses = []) => {
  const existingCourses = await Course.find({ universityId: university._id });
  const existingById = new Map(existingCourses.map((course) => [course._id.toString(), course]));
  const syncedCourseIds = [];

  for (const courseInput of courses) {
    const normalizedCourse = sanitizeCoursePayload(courseInput, university._id);
    if (!normalizedCourse) continue;

    if (normalizedCourse._id && existingById.has(String(normalizedCourse._id))) {
      const currentCourse = existingById.get(String(normalizedCourse._id));
      normalizedCourse.slug = await buildUniqueSlug({
        model: Course,
        value: normalizedCourse.name,
        currentId: currentCourse._id,
        fallback: 'course',
      });

      const updatedCourse = await Course.findByIdAndUpdate(currentCourse._id, normalizedCourse, {
        new: true,
        runValidators: true,
      });
      syncedCourseIds.push(updatedCourse._id);
      continue;
    }

    normalizedCourse.slug = await buildUniqueSlug({
      model: Course,
      value: normalizedCourse.name,
      fallback: 'course',
    });

    const createdCourse = await Course.create(normalizedCourse);
    syncedCourseIds.push(createdCourse._id);
  }

  await Course.deleteMany({
    universityId: university._id,
    _id: { $nin: syncedCourseIds },
  });

  university.courses = syncedCourseIds;
  university.stats = {
    ...(university.stats || {}),
    totalCoursesCount: syncedCourseIds.length,
  };
  await university.save();
};

exports.getDashboard = async (req, res) => {
  try {
    const [
      users,
      verifiedUsers,
      admins,
      universities,
      courses,
      exams,
      news,
      questions,
      recentUsers,
      recentQuestions,
      recentNews,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isEmailVerified: true }),
      User.countDocuments({ role: 'admin' }),
      University.countDocuments(),
      Course.countDocuments(),
      Exam.countDocuments(),
      News.countDocuments(),
      Question.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(6).select('name email role isEmailVerified createdAt'),
      Question.find().sort({ createdAt: -1 }).limit(6).select('title category createdAt answers').populate('userId', 'name'),
      News.find().sort({ publishedAt: -1 }).limit(6).select('title category source publishedAt'),
    ]);

    res.json({
      success: true,
      data: {
        stats: { users, verifiedUsers, admins, universities, courses, exams, news, questions },
        recentUsers,
        recentQuestions,
        recentNews,
      },
    });
  } catch (error) {
    return serverError(res, error, 'admin.getDashboard');
  }
};

exports.getContentData = async (req, res) => {
  try {
    // Each admin page only needs one or two resources. Returning everything
    // (402 universities + ~8k courses ≈ 6 MB) on every page load is the main
    // cause of slow admin loads, so callers pass ?resource=a,b to fetch only
    // what they render. No param = everything (backward compatible).
    const requested = String(req.query.resource || req.query.include || '').trim();
    const wanted = requested
      ? new Set(requested.split(',').map((s) => s.trim()).filter(Boolean))
      : null;
    const want = (name) => !wanted || wanted.has(name);

    const loadUniversities = async () => {
      const [universities, courseCounts] = await Promise.all([
        University.find().sort({ updatedAt: -1 }).populate('courses').lean(),
        Course.aggregate([{ $group: { _id: '$universityId', count: { $sum: 1 } } }]),
      ]);
      const countsMap = new Map(courseCounts.map((c) => [c._id ? c._id.toString() : '', c.count]));
      return universities.map((u) => {
        if (!u.stats) u.stats = {};
        u.stats.totalCoursesCount =
          countsMap.get(u._id.toString()) || u.stats.totalCoursesCount || u.courses?.length || 0;
        return u;
      });
    };

    const builders = {
      universities: loadUniversities,
      courses: () => Course.find().sort({ updatedAt: -1 }).populate('universityId', 'name slug').lean(),
      exams: () => Exam.find().sort({ updatedAt: -1 }).lean(),
      news: () => News.find().sort({ updatedAt: -1 }).lean(),
    };

    const keys = Object.keys(builders).filter(want);
    const results = await Promise.all(keys.map((k) => builders[k]()));

    const data = {};
    keys.forEach((k, i) => {
      data[k] = results[i];
    });

    res.json({ success: true, data });
  } catch (error) {
    return serverError(res, error, 'admin.getContentData');
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      const safe = escapeRegExp(String(search).trim());
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
      ];
    }

    // Pagination is opt-in (?page/?limit); without it the full list is returned
    // so the existing admin screen is unaffected.
    const { page, limit, skip, isPaginated } = parsePagination(req.query, { defaultLimit: 25 });

    const query = User.find(filter)
      .sort({ createdAt: -1 })
      .select('name email role status isEmailVerified createdAt');

    if (isPaginated) query.skip(skip).limit(limit);

    const [users, total] = await Promise.all([query, User.countDocuments(filter)]);

    return paginated(res, {
      data: users,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : null,
    });
  } catch (error) {
    return serverError(res, error, 'admin.getUsers');
  }
};

/**
 * Grants or revokes privileges. Superadmin-only (enforced at the route).
 *
 * Previous issues fixed here:
 *  - `findByIdAndUpdate` does not run schema validators by default, so the
 *    `role` enum was NOT enforced and any arbitrary string could be written.
 *    Roles are now checked against an explicit allowlist before the write.
 *  - There was no self-demotion guard, so the last superadmin could lock
 *    everyone out of the admin panel.
 *  - Privilege changes were not audited despite `role_change` / `status_change`
 *    already existing in the AuditLog schema.
 *  - Outstanding tokens kept their old privileges until natural expiry; the
 *    tokenVersion bump now revokes them immediately.
 */
exports.updateUserAccess = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return fail(res, 404, 'User not found');

    const updates = {};
    let privilegeChanged = false;

    if (typeof req.body.role === 'string') {
      const nextRole = req.body.role.trim();

      if (!User.ROLES.includes(nextRole)) {
        return res.status(400).json({
          success: false,
          message: `Role must be one of: ${User.ROLES.join(', ')}`,
        });
      }

      // An actor may not change their own role — neither to escalate nor to
      // accidentally strip the last superadmin.
      if (String(target._id) === String(req.user._id) && nextRole !== target.role) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own role',
        });
      }

      if (nextRole !== target.role) {
        // Never allow the final superadmin to be demoted.
        if (target.role === 'superadmin') {
          const remaining = await User.countDocuments({ role: 'superadmin', _id: { $ne: target._id } });
          if (remaining === 0) {
            return res.status(400).json({
              success: false,
              message: 'Cannot demote the last remaining superadmin',
            });
          }
        }

        updates.role = nextRole;
        privilegeChanged = true;
      }
    }

    if (typeof req.body.isEmailVerified === 'boolean' && req.body.isEmailVerified !== target.isEmailVerified) {
      updates.isEmailVerified = req.body.isEmailVerified;
    }

    if (typeof req.body.status === 'string') {
      const nextStatus = req.body.status.trim();
      if (!['active', 'suspended', 'banned'].includes(nextStatus)) {
        return fail(res, 400, 'Invalid account status');
      }
      if (String(target._id) === String(req.user._id) && nextStatus !== 'active') {
        return fail(res, 400, 'You cannot suspend or ban your own account');
      }
      if (nextStatus !== target.status) {
        updates.status = nextStatus;
        privilegeChanged = true;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, data: await User.findById(target._id).select('name email role status isEmailVerified createdAt') });
    }

    const before = { role: target.role, status: target.status, isEmailVerified: target.isEmailVerified };

    Object.assign(target, updates);

    // Revoke every outstanding access/refresh token so the new privilege level
    // (or the ban) applies on the target's very next request.
    if (privilegeChanged) {
      target.tokenVersion = (target.tokenVersion || 0) + 1;
    }

    // Full document save -> schema validators DO run.
    await target.save();

    if (privilegeChanged) {
      await revokeAllForUser(target._id, 'privilege_change');
    }

    await logAction({
      userId: req.user._id,
      action: updates.role ? 'role_change' : updates.status ? 'status_change' : 'update',
      resource: 'user',
      resourceId: target._id,
      description: `Updated access for ${target.email}`,
      changes: { before, after: { role: target.role, status: target.status, isEmailVerified: target.isEmailVerified } },
      req,
    });

    const data = await User.findById(target._id).select('name email role status isEmailVerified createdAt');
    res.json({ success: true, data });
  } catch (error) {
    console.error('[admin] updateUserAccess failed:', error);
    fail(res, 500, 'Could not update user access');
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return fail(res, 400, 'You cannot delete your own account');
    }

    const target = await User.findById(req.params.id);
    if (!target) return fail(res, 404, 'User not found');

    // Deleting the last superadmin would permanently orphan the admin panel.
    if (target.role === 'superadmin') {
      const remaining = await User.countDocuments({ role: 'superadmin', _id: { $ne: target._id } });
      if (remaining === 0) {
        return fail(res, 400, 'Cannot delete the last remaining superadmin');
      }
    }

    await User.deleteOne({ _id: target._id });

    // Tear down any sessions the deleted account still held, so an outstanding
    // access token cannot continue to be used until it expires.
    await revokeAllForUser(target._id, 'user_deleted');

    await logAction({
      userId: req.user._id,
      action: 'delete',
      resource: 'user',
      resourceId: target._id,
      description: `Deleted user ${target.email}`,
      req,
    });

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('[admin] deleteUser failed:', error);
    fail(res, 500, 'Could not delete user');
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return fail(res, 404, 'Question not found');
    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    return serverError(res, error, 'admin.deleteQuestion');
  }
};

exports.createUniversity = async (req, res) => {
  try {
    const { payload, courses, hasCoursesField } = sanitizeUniversityPayload(req.body);
    if (payload.name) {
      payload.slug = await buildUniqueSlug({
        model: University,
        value: payload.name,
        fallback: 'university',
      });
    }

    // Only superadmin can set sponsorship fields on creation
    if (req.user?.role !== 'superadmin') {
      payload.isSponsored = false;
      payload.sponsorTier = 'none';
      payload.sponsorPriority = 0;
      payload.sponsorExpiry = undefined;
    }

    const university = await University.create(payload);
    if (hasCoursesField) {
      await syncUniversityCourses(university, courses);
    }
    const populatedUniversity = await University.findById(university._id).populate('courses');
    res.status(201).json({ success: true, data: populatedUniversity });
  } catch (error) {
    return serverError(res, error, 'admin.createUniversity');
  }
};

exports.updateUniversity = async (req, res) => {
  try {
    const { payload, courses, hasCoursesField } = sanitizeUniversityPayload(req.body);
    if (payload.name) {
      payload.slug = await buildUniqueSlug({
        model: University,
        value: payload.name,
        currentId: req.params.id,
        fallback: 'university',
      });
    }

    const existing = await University.findById(req.params.id);
    if (!existing) return fail(res, 404, 'University not found');

    // Only superadmin can modify sponsorship fields
    if (req.user?.role !== 'superadmin') {
      payload.isSponsored = existing.isSponsored;
      payload.sponsorTier = existing.sponsorTier;
      payload.sponsorPriority = existing.sponsorPriority;
      payload.sponsorExpiry = existing.sponsorExpiry;
    }

    let university = await University.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (hasCoursesField) {
      await syncUniversityCourses(university, courses);
      university = await University.findById(university._id);
    }
    university = await University.findById(university._id).populate('courses');
    res.json({ success: true, data: university });
  } catch (error) {
    return serverError(res, error, 'admin.updateUniversity');
  }
};

exports.deleteUniversity = async (req, res) => {
  try {
    const university = await University.findByIdAndDelete(req.params.id);
    if (!university) return fail(res, 404, 'University not found');

    await Course.deleteMany({ universityId: req.params.id });

    res.json({ success: true, message: 'University deleted' });
  } catch (error) {
    return serverError(res, error, 'admin.deleteUniversity');
  }
};

// Superadmin-only: quickly grant/revoke/update sponsorship fields
exports.patchSponsorship = async (req, res) => {
  try {
    const { isSponsored, sponsorTier, sponsorPriority, sponsorExpiry } = req.body;

    const update = {};

    if (typeof isSponsored === 'boolean') update.isSponsored = isSponsored;
    if (sponsorTier !== undefined) update.sponsorTier = sponsorTier;
    if (sponsorPriority !== undefined) update.sponsorPriority = Number(sponsorPriority) || 0;
    if (sponsorExpiry !== undefined) update.sponsorExpiry = sponsorExpiry ? new Date(sponsorExpiry) : null;

    // When revoking, force-reset all tier fields
    if (isSponsored === false) {
      update.sponsorTier = 'none';
      update.sponsorPriority = 0;
      update.sponsorExpiry = null;
    }

    const university = await University.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).select('name slug isSponsored sponsorTier sponsorPriority sponsorExpiry');

    if (!university) return fail(res, 404, 'University not found');

    res.json({ success: true, data: university });
  } catch (error) {
    return serverError(res, error, 'admin.patchSponsorship');
  }
};

exports.duplicateUniversity = async (req, res) => {
  try {
    const sourceUniversity = await University.findById(req.params.id).populate('courses');
    if (!sourceUniversity) {
      return fail(res, 404, 'University not found');
    }

    const source = sourceUniversity.toObject();
    const clonedPayload = {
      ...source,
      _id: undefined,
      slug: undefined,
      universityCode: source.universityCode ? `${source.universityCode}_${Date.now().toString().slice(-4)}` : undefined,
      name: `${source.name} Copy`,
      status: 'draft',
      courses: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      __v: undefined,
    };

    const { payload } = sanitizeUniversityPayload(clonedPayload);
    payload.slug = await buildUniqueSlug({
      model: University,
      value: payload.name,
      fallback: 'university',
    });

    const duplicatedUniversity = await University.create(payload);

    const sourceCourses = (source.courses || []).map((course) => ({
      ...course,
      _id: undefined,
      slug: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      __v: undefined,
    }));

    await syncUniversityCourses(duplicatedUniversity, sourceCourses);

    const populatedUniversity = await University.findById(duplicatedUniversity._id).populate('courses');
    res.status(201).json({ success: true, data: populatedUniversity });
  } catch (error) {
    return serverError(res, error, 'admin.duplicateUniversity');
  }
};

exports.createCourse = async (req, res) => {
  try {
    const payload = sanitizeCoursePayload(req.body, req.body.universityId);
    if (!payload) {
      return fail(res, 400, 'Course base name is required');
    }
    if (payload.name) {
      payload.slug = await buildUniqueSlug({
        model: Course,
        value: payload.name,
        fallback: 'course',
      });
    }

    const course = await Course.create(payload);
    const university = await University.findByIdAndUpdate(course.universityId, { $addToSet: { courses: course._id } }, { new: true });
    if (university) {
      university.stats = {
        ...(university.stats || {}),
        totalCoursesCount: (university.courses || []).length,
      };
      await university.save();
    }
    const populatedCourse = await Course.findById(course._id).populate('universityId', 'name slug city state');
    res.status(201).json({ success: true, data: populatedCourse });
  } catch (error) {
    return serverError(res, error, 'admin.createCourse');
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const existingCourse = await Course.findById(req.params.id);
    if (!existingCourse) return fail(res, 404, 'Course not found');

    const oldUniversityId = existingCourse.universityId?.toString();
    const payload = sanitizeCoursePayload(req.body, req.body.universityId || existingCourse.universityId);
    if (!payload) {
      return fail(res, 400, 'Course base name is required');
    }
    if (payload.name) {
      payload.slug = await buildUniqueSlug({
        model: Course,
        value: payload.name,
        currentId: req.params.id,
        fallback: 'course',
      });
    }

    const course = await Course.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate('universityId', 'name slug city state');

    const newUniversityId = course.universityId?._id?.toString() || course.universityId?.toString();

    if (oldUniversityId && oldUniversityId !== newUniversityId) {
      const oldUniversity = await University.findByIdAndUpdate(oldUniversityId, { $pull: { courses: course._id } }, { new: true });
      if (oldUniversity) {
        oldUniversity.stats = {
          ...(oldUniversity.stats || {}),
          totalCoursesCount: (oldUniversity.courses || []).length,
        };
        await oldUniversity.save();
      }
    }
    if (newUniversityId) {
      const newUniversity = await University.findByIdAndUpdate(newUniversityId, { $addToSet: { courses: course._id } }, { new: true });
      if (newUniversity) {
        newUniversity.stats = {
          ...(newUniversity.stats || {}),
          totalCoursesCount: (newUniversity.courses || []).length,
        };
        await newUniversity.save();
      }
    }

    res.json({ success: true, data: course });
  } catch (error) {
    return serverError(res, error, 'admin.updateCourse');
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return fail(res, 404, 'Course not found');

    const university = await University.findByIdAndUpdate(course.universityId, { $pull: { courses: course._id } }, { new: true });
    if (university) {
      university.stats = {
        ...(university.stats || {}),
        totalCoursesCount: (university.courses || []).length,
      };
      await university.save();
    }

    res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    return serverError(res, error, 'admin.deleteCourse');
  }
};

exports.createExam = async (req, res) => {
  try {
    const exam = await Exam.create(req.body);
    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    return serverError(res, error, 'admin.createExam');
  }
};

exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!exam) return fail(res, 404, 'Exam not found');
    res.json({ success: true, data: exam });
  } catch (error) {
    return serverError(res, error, 'admin.updateExam');
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return fail(res, 404, 'Exam not found');
    res.json({ success: true, message: 'Exam deleted' });
  } catch (error) {
    return serverError(res, error, 'admin.deleteExam');
  }
};

exports.createNews = async (req, res) => {
  try {
    const article = await News.create(req.body);
    res.status(201).json({ success: true, data: article });
  } catch (error) {
    return serverError(res, error, 'admin.createNews');
  }
};

exports.updateNews = async (req, res) => {
  try {
    const article = await News.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!article) return fail(res, 404, 'News article not found');
    res.json({ success: true, data: article });
  } catch (error) {
    return serverError(res, error, 'admin.updateNews');
  }
};

exports.deleteNews = async (req, res) => {
  try {
    const article = await News.findByIdAndDelete(req.params.id);
    if (!article) return fail(res, 404, 'News article not found');
    res.json({ success: true, message: 'News article deleted' });
  } catch (error) {
    return serverError(res, error, 'admin.deleteNews');
  }
};

exports.bulkImportUniversities = async (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : req.body.universities;
    if (!Array.isArray(list)) {
      return fail(res, 400, 'Invalid data format. Expected an array of universities.');
    }

    const results = [];
    const errors = [];
    const created = [];
    const updated = [];

    for (const [index, item] of list.entries()) {
      try {
        const { payload, courses, hasCoursesField } = sanitizeUniversityPayload(item);
        if (!payload.name || !payload.state || !payload.city) {
          errors.push({ index, name: payload.name || null, item, error: 'Name, state, and city are required.' });
          continue;
        }

        /**
         * Matching now goes through the shared resolver: universityCode first,
         * then name + STATE.
         *
         * Matching on name alone (the previous behaviour) merged two different
         * institutions that happen to share a name in different states — the
         * second row silently overwrote the first record instead of creating the
         * new one, so an import of N universities could persist fewer than N and
         * corrupt the survivor's data with the other's values.
         */
        const match = await findExistingUniversity({
          name: payload.name,
          state: payload.state,
          universityCode: payload.universityCode,
        });

        if (match.ambiguous) {
          errors.push({
            index,
            name: payload.name,
            item,
            error: `"${payload.name}" matches more than one existing university (${match.candidates.join(', ')}). Provide a universityCode or a state to disambiguate.`,
          });
          continue;
        }

        const university = match.doc;

        if (university) {
          payload.slug = await buildUniqueSlug({
            model: University,
            value: payload.name,
            currentId: university._id,
            fallback: 'university',
          });
          const doc = await University.findByIdAndUpdate(university._id, payload, { new: true, runValidators: true });
          if (hasCoursesField) {
            await syncUniversityCourses(doc, courses);
          }
          results.push(doc);
          updated.push({ index, name: doc.name, state: doc.state, matchedBy: describeMatch(match.matchedBy) });
        } else {
          payload.slug = await buildUniqueSlug({
            model: University,
            value: payload.name,
            fallback: 'university',
          });
          const doc = await University.create(payload);
          if (hasCoursesField) {
            await syncUniversityCourses(doc, courses);
          }
          results.push(doc);
          created.push({ index, name: doc.name, state: doc.state });
        }
      } catch (err) {
        errors.push({ index, name: item?.name || null, item, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk import completed: ${results.length} succeeded (${created.length} created, ${updated.length} updated), ${errors.length} failed.`,
      succeededCount: results.length,
      failedCount: errors.length,
      createdCount: created.length,
      updatedCount: updated.length,
      // Which rows were merged into an existing record and on what key, so an
      // unexpected merge is visible in the response instead of only in the data.
      created,
      updated,
      errors,
    });
  } catch (error) {
    return serverError(res, error, 'admin.bulkImportUniversities');
  }
};

exports.bulkImportCourses = async (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : req.body.courses;
    if (!Array.isArray(list)) {
      return fail(res, 400, 'Invalid data format. Expected an array of courses.');
    }

    const results = [];
    const errors = [];
    const unmatchedUniversities = new Map();

    for (const [index, item] of list.entries()) {
      try {
        let universityId = item.universityId;

        if (!universityId && item.universityName) {
          // Resolve by name + state (same rule as the university import), so a
          // course row is never attached to a same-named institution in another
          // state. `universityState` is the preferred key; `state` is accepted as
          // an alias because that is what the university payload calls it.
          const match = await findExistingUniversity({
            name: item.universityName,
            state: item.universityState || item.state,
          });

          if (match.ambiguous) {
            errors.push({
              index,
              universityName: item.universityName,
              item,
              error: `University "${item.universityName}" matches more than one record (${match.candidates.join(', ')}). Add a universityState to disambiguate.`,
            });
            continue;
          }

          if (match.doc) universityId = match.doc._id;
        }

        if (!universityId) {
          const label = item.universityName || '(not specified)';
          const seen = unmatchedUniversities.get(label) || { name: label, rows: [], count: 0 };
          seen.rows.push(index);
          seen.count += 1;
          unmatchedUniversities.set(label, seen);

          errors.push({
            index,
            universityName: item.universityName || null,
            item,
            error: 'University not found or not specified.',
          });
          continue;
        }

        const payload = sanitizeCoursePayload(item, universityId);
        if (!payload) {
          errors.push({ index, item, error: 'Course base name is required.' });
          continue;
        }

        let course = await Course.findOne({ universityId, name: payload.name });

        if (course) {
          payload.slug = await buildUniqueSlug({
            model: Course,
            value: payload.name,
            currentId: course._id,
            fallback: 'course',
          });
          const updated = await Course.findByIdAndUpdate(course._id, payload, { new: true, runValidators: true });
          results.push(updated);
        } else {
          payload.slug = await buildUniqueSlug({
            model: Course,
            value: payload.name,
            fallback: 'course',
          });
          const created = await Course.create(payload);
          const university = await University.findByIdAndUpdate(
            universityId,
            { $addToSet: { courses: created._id } },
            { new: true }
          );
          if (university) {
            university.stats = {
              ...(university.stats || {}),
              totalCoursesCount: (university.courses || []).length,
            };
            await university.save();
          }
          results.push(created);
        }
      } catch (err) {
        errors.push({ index, item, error: err.message });
      }
    }

    // Unmatched university names, deduplicated and reported with the row indexes
    // that referenced them, so a failed import says WHICH names to fix rather
    // than just how many rows failed.
    const unmatched = [...unmatchedUniversities.values()].sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      message: `Bulk import completed: ${results.length} succeeded, ${errors.length} failed.`,
      succeededCount: results.length,
      failedCount: errors.length,
      unmatchedUniversityCount: unmatched.length,
      unmatchedUniversities: unmatched,
      errors,
    });
  } catch (error) {
    return serverError(res, error, 'admin.bulkImportCourses');
  }
};


