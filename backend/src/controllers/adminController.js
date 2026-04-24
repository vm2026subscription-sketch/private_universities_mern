const User = require('../models/User');
const University = require('../models/University');
const Course = require('../models/Course');
const Exam = require('../models/Exam');
const News = require('../models/News');
const Question = require('../models/Question');
const slugify = require('slugify');

const splitPipe = (value) => String(value || '').split('|').map((item) => item.trim()).filter(Boolean);
const parseBool = (value) => ['true', '1', 'yes', 'y'].includes(String(value || '').trim().toLowerCase());
const parseNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isNaN(number) ? undefined : number;
};
const parseDate = (value) => value ? new Date(value) : undefined;

const buildUniversityImportPayload = (row) => ({
  universityCode: row.universityCode || undefined,
  name: row.name,
  type: row.type || 'private',
  state: row.state,
  city: row.city,
  establishedYear: parseNumber(row.establishedYear),
  naacGrade: row.naacGrade || undefined,
  nirfRank: parseNumber(row.nirfRank),
  description: row.description || undefined,
  logoUrl: row.logoUrl || undefined,
  bannerImageUrl: row.bannerImageUrl || undefined,
  website: row.website || undefined,
  address: row.address || undefined,
  phone: row.phone || undefined,
  email: row.email || undefined,
  approvals: {
    ugc: parseBool(row.ugcApproved),
    aicte: parseBool(row.aicteApproved),
    nmc: parseBool(row.nmcApproved),
    bci: parseBool(row.bciApproved),
    coa: parseBool(row.coaApproved),
    pci: parseBool(row.pciApproved),
  },
  stats: {
    totalStudents: parseNumber(row.totalStudents),
    campusSizeAcres: parseNumber(row.campusSizeAcres),
    avgPackageLPA: parseNumber(row.avgPackageLPA),
    highestPackageLPA: parseNumber(row.highestPackageLPA),
    placementPercentage: parseNumber(row.placementPercentage),
  },
  highlights: splitPipe(row.highlights),
  topRecruiters: splitPipe(row.topRecruiters),
  facilities: splitPipe(row.facilities),
  links: {
    admissionLink: row.admissionLink || undefined,
    brochureLink: row.brochureLink || undefined,
    placementReportLink: row.placementReportLink || undefined,
    scholarshipLink: row.scholarshipLink || undefined,
    hostelLink: row.hostelLink || undefined,
    mapLink: row.mapLink || undefined,
  },
  admissions: {
    overview: row.admissionsOverview || undefined,
    process: splitPipe(row.admissionProcess),
    applicationStartDate: parseDate(row.applicationStartDate),
    applicationEndDate: parseDate(row.applicationEndDate),
    counsellingInfo: row.counsellingInfo || undefined,
    acceptedExams: splitPipe(row.acceptedExams),
    documentsRequired: splitPipe(row.documentsRequired),
    applicationFee: parseNumber(row.applicationFee),
    contactEmail: row.admissionsContactEmail || undefined,
    contactPhone: row.admissionsContactPhone || undefined,
  },
  campus: {
    overview: row.campusOverview || undefined,
    hostelDetails: row.hostelDetails || undefined,
    libraryDetails: row.libraryDetails || undefined,
    labDetails: row.labDetails || undefined,
    sportsDetails: row.sportsDetails || undefined,
    transportDetails: row.transportDetails || undefined,
    medicalSupport: row.medicalSupport || undefined,
    wifiAvailable: parseBool(row.wifiAvailable),
    virtualTourLink: row.virtualTourLink || undefined,
    galleryImages: splitPipe(row.galleryImages),
  },
});

const buildCourseImportPayload = (row, universityId) => {
  const specializationNames = splitPipe(row.specializations);
  const specializationSeats = splitPipe(row.specializationSeats);
  const specializationFees = splitPipe(row.specializationFeesPerYear);

  return {
    universityId,
    name: row.courseName || row.name,
    category: row.category,
    duration: parseNumber(row.durationYears || row.duration),
    totalSeats: parseNumber(row.totalSeats),
    feesPerYear: parseNumber(row.feesPerYear),
    eligibility: row.eligibility || undefined,
    entranceExams: splitPipe(row.entranceExams),
    specializations: specializationNames.map((name, index) => ({
      name,
      seats: parseNumber(specializationSeats[index]),
      feesPerYear: parseNumber(specializationFees[index]),
    })),
  };
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
    const university = await University.create(req.body);
    const populatedUniversity = await University.findById(university._id).populate('courses');
    res.status(201).json({ success: true, data: populatedUniversity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUniversity = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.name) payload.slug = slugify(payload.name, { lower: true, strict: true });

    const university = await University.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate('courses');

    if (!university) return res.status(404).json({ success: false, message: 'University not found' });
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
    const course = await Course.create(req.body);
    await University.findByIdAndUpdate(course.universityId, { $addToSet: { courses: course._id } });
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
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('universityId', 'name slug city state');

    const newUniversityId = course.universityId?._id?.toString() || course.universityId?.toString();

    if (oldUniversityId && oldUniversityId !== newUniversityId) {
      await University.findByIdAndUpdate(oldUniversityId, { $pull: { courses: course._id } });
    }
    if (newUniversityId) {
      await University.findByIdAndUpdate(newUniversityId, { $addToSet: { courses: course._id } });
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

    await University.findByIdAndUpdate(course.universityId, { $pull: { courses: course._id } });

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
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!row?.name || !row?.state || !row?.city) {
        skipped += 1;
        continue;
      }

      const query = row.universityCode
        ? { universityCode: String(row.universityCode).trim().toUpperCase() }
        : { slug: slugify(row.slug || row.name, { lower: true, strict: true }) };

      const payload = buildUniversityImportPayload(row);
      if (payload.universityCode) payload.universityCode = payload.universityCode.toUpperCase();
      if (payload.name) payload.slug = slugify(payload.name, { lower: true, strict: true });

      const existing = await University.findOne(query);
      if (existing) {
        await University.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true });
        updated += 1;
      } else {
        await University.create(payload);
        created += 1;
      }
    }

    res.json({ success: true, data: { created, updated, skipped } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkImportCourses = async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!(row?.universityCode || row?.universityName) || !(row?.courseName || row?.name) || !row?.category) {
        skipped += 1;
        continue;
      }

      const university = row.universityCode
        ? await University.findOne({ universityCode: String(row.universityCode).trim().toUpperCase() })
        : await University.findOne({ name: row.universityName });

      if (!university) {
        skipped += 1;
        continue;
      }

      const payload = buildCourseImportPayload(row, university._id);
      const existing = await Course.findOne({
        universityId: university._id,
        name: payload.name,
        category: payload.category,
      });

      if (existing) {
        await Course.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true });
        updated += 1;
      } else {
        const course = await Course.create(payload);
        await University.findByIdAndUpdate(university._id, { $addToSet: { courses: course._id } });
        created += 1;
      }
    }

    res.json({ success: true, data: { created, updated, skipped } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
