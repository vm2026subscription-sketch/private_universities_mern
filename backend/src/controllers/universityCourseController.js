/**
 * Course management for university tenants.
 *
 * Tenancy here works differently from the profile endpoints, and the difference
 * matters. A profile route has no identifier at all — the target is the session.
 * A course route must take a course id, because a university has many courses.
 *
 * So every lookup is scoped:
 *
 *   Course.findOne({ _id: id, universityId: req.university._id })
 *
 * never `Course.findById(id)` followed by an ownership comparison. The scoped
 * query cannot return another university's course, so there is no window between
 * "loaded" and "checked" in which a forgotten comparison leaks a record. A course
 * belonging to someone else is simply not found — which is also the right thing
 * to tell the caller, since confirming it exists would leak that much.
 *
 * Course edits are fully self-serve, unlike placement statistics. The two look
 * similar but are not: a course fee is a specific, checkable fact that a
 * university revises every intake, whereas "average package 18 LPA" is an
 * aggregate marketing claim a prospective student cannot verify. Routing 50
 * course edits per university through an admin would bury the queue that exists
 * to catch the claims that actually mislead.
 */

const mongoose = require('mongoose');

const Course = require('../models/Course');
const University = require('../models/University');
const { buildUniqueSlug } = require('../utils/slug');
const { logAction } = require('../services/auditService');

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const MAX_COURSES_PER_UNIVERSITY = 300;

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

/**
 * Fields a tenant may set.
 *
 * `universityId` is absent deliberately — it comes from the session, and
 * accepting it would let a tenant move a course onto another university's
 * record, which is the same cross-tenant write the scoped lookups exist to
 * prevent. `slug` is absent because it is derived and doubles as a public URL.
 */
const EDITABLE_COURSE_FIELDS = [
  'name',
  'category',
  'stream',
  'baseCourse',
  'specializationName',
  'duration',
  'specializations',
  'totalSeats',
  'totalSeatsLabel',
  'feesPerYear',
  'feesPerYearLabel',
  'entranceExams',
  'eligibility',
];

const pickCourseFields = (body) => {
  const payload = {};
  EDITABLE_COURSE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });
  return payload;
};

/**
 * Keeps University.courses[] and stats.totalCoursesCount in step.
 *
 * The count is a denormalised value the platform owns — tenants cannot set it
 * directly (it is in TENANT_FORBIDDEN_FIELDS) precisely so it always reflects
 * reality rather than what a university would like it to say. Recomputed from
 * the array rather than incremented, so a failed request cannot leave it drifting.
 */
const syncCourseCount = async (universityId) => {
  const university = await University.findById(universityId);
  if (!university) return;

  university.stats = {
    ...(university.stats?.toObject?.() || university.stats || {}),
    totalCoursesCount: (university.courses || []).length,
  };
  await university.save();
};

/* ────────────────────────────────────────────────────────────────────────── */

/** Every course belonging to the caller's own university. */
exports.listMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ universityId: req.university._id }).sort({
      category: 1,
      name: 1,
    });

    return res.json({ success: true, total: courses.length, courses });
  } catch (error) {
    console.error('[university-courses] list failed:', error);
    return fail(res, 500, 'Could not load your courses.');
  }
};

exports.createMyCourse = async (req, res) => {
  try {
    const payload = pickCourseFields(req.body);

    if (!String(payload.name || '').trim()) return fail(res, 400, 'Course name is required');
    if (!String(payload.category || '').trim()) return fail(res, 400, 'Course category is required');

    const existingCount = await Course.countDocuments({ universityId: req.university._id });
    if (existingCount >= MAX_COURSES_PER_UNIVERSITY) {
      return fail(res, 400, `A university may list at most ${MAX_COURSES_PER_UNIVERSITY} courses.`);
    }

    /**
     * Course slugs are globally unique, so two universities both adding
     * "B.Tech Computer Science" would collide. buildUniqueSlug appends a
     * counter; relying on the model's pre-validate hook instead would surface
     * this as a raw duplicate-key error to the second university to try.
     */
    const slug = await buildUniqueSlug({ model: Course, value: payload.name, fallback: 'course' });

    const course = await Course.create({
      ...payload,
      // From the session, never from the body.
      universityId: req.university._id,
      slug,
    });

    await University.findByIdAndUpdate(req.university._id, { $addToSet: { courses: course._id } });
    await syncCourseCount(req.university._id);

    await logAction({
      userId: req.user._id,
      action: 'create',
      resource: 'university_course',
      resourceId: course._id,
      description: `Added course "${course.name}" to ${req.university.name}`,
      req,
    });

    return res.status(201).json({ success: true, message: 'Course added.', course });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, 'A course with that name already exists. Try a more specific name.');
    }
    if (error.name === 'ValidationError') {
      return fail(res, 400, Object.values(error.errors)[0]?.message || 'Invalid course details.');
    }
    console.error('[university-courses] create failed:', error);
    return fail(res, 500, 'Could not add the course.');
  }
};

exports.updateMyCourse = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.courseId)) return fail(res, 400, 'Invalid course id');

    // Scoped lookup — a course belonging to another university is not found.
    const course = await Course.findOne({
      _id: req.params.courseId,
      universityId: req.university._id,
    });

    if (!course) return fail(res, 404, 'Course not found');

    const payload = pickCourseFields(req.body);
    if (!Object.keys(payload).length) return fail(res, 400, 'No editable fields were supplied.');

    if ('name' in payload) {
      if (!String(payload.name || '').trim()) return fail(res, 400, 'Course name cannot be empty');

      // Renaming changes the public URL, so the slug has to follow — and stay
      // unique against every other course on the platform.
      payload.slug = await buildUniqueSlug({
        model: Course,
        value: payload.name,
        currentId: course._id,
        fallback: 'course',
      });
    }

    const before = {};
    Object.keys(payload).forEach((key) => {
      before[key] = course.get(key);
    });

    Object.entries(payload).forEach(([key, value]) => course.set(key, value));
    await course.save();

    await logAction({
      userId: req.user._id,
      action: 'update',
      resource: 'university_course',
      resourceId: course._id,
      description: `Updated course "${course.name}"`,
      changes: { before, after: payload },
      req,
    });

    return res.json({ success: true, message: 'Course updated.', course });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return fail(res, 400, Object.values(error.errors)[0]?.message || 'Invalid course details.');
    }
    console.error('[university-courses] update failed:', error);
    return fail(res, 500, 'Could not update the course.');
  }
};

exports.deleteMyCourse = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.courseId)) return fail(res, 400, 'Invalid course id');

    const course = await Course.findOne({
      _id: req.params.courseId,
      universityId: req.university._id,
    });

    if (!course) return fail(res, 404, 'Course not found');

    const courseName = course.name;
    await course.deleteOne();

    await University.findByIdAndUpdate(req.university._id, { $pull: { courses: course._id } });
    await syncCourseCount(req.university._id);

    await logAction({
      userId: req.user._id,
      action: 'delete',
      resource: 'university_course',
      resourceId: course._id,
      description: `Deleted course "${courseName}" from ${req.university.name}`,
      req,
    });

    return res.json({ success: true, message: `"${courseName}" removed.` });
  } catch (error) {
    console.error('[university-courses] delete failed:', error);
    return fail(res, 500, 'Could not delete the course.');
  }
};

exports.MAX_COURSES_PER_UNIVERSITY = MAX_COURSES_PER_UNIVERSITY;
exports.EDITABLE_COURSE_FIELDS = EDITABLE_COURSE_FIELDS;
