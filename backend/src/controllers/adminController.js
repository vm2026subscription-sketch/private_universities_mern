const User = require('../models/User');
const University = require('../models/University');
const Course = require('../models/Course');
const Exam = require('../models/Exam');
const News = require('../models/News');
const Question = require('../models/Question');
const { buildUniqueSlug } = require('../utils/slug');
const { normalizeUniversityClassification } = require('../utils/universityClassification');

const splitPipe = (value) => String(value || '').split('|').map((item) => item.trim()).filter(Boolean);
const parseNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isNaN(number) ? undefined : number;
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
  const payload = {
    _id: course._id,
    universityId,
    name: buildCourseName(baseCourse, specializationName, course.name),
    category: String(course.category || 'UG').trim() || 'UG',
    stream: String(course.stream || 'Others').trim() || 'Others',
    baseCourse,
    specializationName: specializationName || undefined,
    duration: parseNumber(course.duration),
    totalSeats: parseNumber(course.totalSeats),
    feesPerYear: parseNumber(course.feesPerYear),
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
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getContentData = async (req, res) => {
  try {
    const [universities, courses, exams, news] = await Promise.all([
      University.find().sort({ updatedAt: -1 }).populate('courses'),
      Course.find().sort({ updatedAt: -1 }).populate('universityId', 'name slug'),
      Exam.find().sort({ updatedAt: -1 }),
      News.find().sort({ updatedAt: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        universities,
        courses,
        exams,
        news,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('name email role isEmailVerified createdAt');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserAccess = async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body.role === 'string') updates.role = req.body.role;
    if (typeof req.body.isEmailVerified === 'boolean') updates.isEmailVerified = req.body.isEmailVerified;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('name email role isEmailVerified createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    const university = await University.create(payload);
    if (hasCoursesField) {
      await syncUniversityCourses(university, courses);
    }
    const populatedUniversity = await University.findById(university._id).populate('courses');
    res.status(201).json({ success: true, data: populatedUniversity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    let university = await University.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!university) return res.status(404).json({ success: false, message: 'University not found' });
    if (hasCoursesField) {
      await syncUniversityCourses(university, courses);
      university = await University.findById(university._id);
    }
    university = await University.findById(university._id).populate('courses');
    res.json({ success: true, data: university });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUniversity = async (req, res) => {
  try {
    const university = await University.findByIdAndDelete(req.params.id);
    if (!university) return res.status(404).json({ success: false, message: 'University not found' });

    await Course.deleteMany({ universityId: req.params.id });

    res.json({ success: true, message: 'University deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const payload = sanitizeCoursePayload(req.body, req.body.universityId);
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Course base name is required' });
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
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const existingCourse = await Course.findById(req.params.id);
    if (!existingCourse) return res.status(404).json({ success: false, message: 'Course not found' });

    const oldUniversityId = existingCourse.universityId?.toString();
    const payload = sanitizeCoursePayload(req.body, req.body.universityId || existingCourse.universityId);
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Course base name is required' });
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
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

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
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createExam = async (req, res) => {
  try {
    const exam = await Exam.create(req.body);
    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, message: 'Exam deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createNews = async (req, res) => {
  try {
    const article = await News.create(req.body);
    res.status(201).json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateNews = async (req, res) => {
  try {
    const article = await News.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!article) return res.status(404).json({ success: false, message: 'News article not found' });
    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteNews = async (req, res) => {
  try {
    const article = await News.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'News article not found' });
    res.json({ success: true, message: 'News article deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkImportUniversities = async (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : req.body.universities;
    if (!Array.isArray(list)) {
      return res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of universities.' });
    }

    const results = [];
    const errors = [];

    for (const item of list) {
      try {
        const { payload, courses, hasCoursesField } = sanitizeUniversityPayload(item);
        if (!payload.name || !payload.state || !payload.city) {
          errors.push({ item, error: 'Name, state, and city are required.' });
          continue;
        }

        let university;
        if (payload.universityCode) {
          university = await University.findOne({ universityCode: payload.universityCode.toUpperCase() });
        }
        if (!university) {
          university = await University.findOne({ name: payload.name });
        }

        if (university) {
          payload.slug = await buildUniqueSlug({
            model: University,
            value: payload.name,
            currentId: university._id,
            fallback: 'university',
          });
          const updated = await University.findByIdAndUpdate(university._id, payload, { new: true, runValidators: true });
          if (hasCoursesField) {
            await syncUniversityCourses(updated, courses);
          }
          results.push(updated);
        } else {
          payload.slug = await buildUniqueSlug({
            model: University,
            value: payload.name,
            fallback: 'university',
          });
          const created = await University.create(payload);
          if (hasCoursesField) {
            await syncUniversityCourses(created, courses);
          }
          results.push(created);
        }
      } catch (err) {
        errors.push({ item, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk import completed: ${results.length} succeeded, ${errors.length} failed.`,
      succeededCount: results.length,
      failedCount: errors.length,
      errors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkImportCourses = async (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : req.body.courses;
    if (!Array.isArray(list)) {
      return res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of courses.' });
    }

    const results = [];
    const errors = [];

    for (const item of list) {
      try {
        let universityId = item.universityId;
        if (!universityId && item.universityName) {
          const uni = await University.findOne({ name: item.universityName });
          if (uni) {
            universityId = uni._id;
          }
        }

        if (!universityId) {
          errors.push({ item, error: 'University not found or not specified.' });
          continue;
        }

        const payload = sanitizeCoursePayload(item, universityId);
        if (!payload) {
          errors.push({ item, error: 'Course base name is required.' });
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
        errors.push({ item, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk import completed: ${results.length} succeeded, ${errors.length} failed.`,
      succeededCount: results.length,
      failedCount: errors.length,
      errors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


