const mongoose = require('mongoose');
const University = require('../models/University');
const Course = require('../models/Course');
const slugify = require('slugify');

const uniq = (items) => [...new Set(items.filter(Boolean))];

const collectCourseFees = (courses = []) => {
  const fees = courses.flatMap((course) => {
    const specializationFees = (course.specializations || []).map((specialization) => specialization.feesPerYear);
    return [course.feesPerYear, ...specializationFees].filter((fee) => typeof fee === 'number');
  });

  if (!fees.length) return null;

  return { min: Math.min(...fees), max: Math.max(...fees) };
};

const buildComparisonProfile = (university) => {
  const courses = university.courses || [];

  return {
    _id: university._id,
    name: university.name,
    slug: university.slug,
    state: university.state,
    city: university.city,
    type: university.type,
    establishedYear: university.establishedYear || null,
    naacGrade: university.naacGrade || 'N/A',
    nirfRank: university.nirfRank || null,
    description: university.description || '',
    website: university.website || '',
    approvals: Object.entries(university.approvals || {})
      .filter(([, approved]) => approved)
      .map(([approval]) => approval.toUpperCase()),
    stats: {
      totalStudents: university.stats?.totalStudents || null,
      campusSizeAcres: university.stats?.campusSizeAcres || null,
      avgPackageLPA: university.stats?.avgPackageLPA || null,
      highestPackageLPA: university.stats?.highestPackageLPA || null,
      placementPercentage: university.stats?.placementPercentage || null,
    },
    topRecruiters: (university.topRecruiters || []).slice(0, 8),
    facilities: (university.facilities || []).slice(0, 10),
    courseSummary: {
      totalCourses: courses.length,
      categories: uniq(courses.map((course) => course.category)),
      entranceExams: uniq(courses.flatMap((course) => course.entranceExams || [])),
      totalSeats: courses.reduce((sum, course) => sum + (course.totalSeats || 0), 0) || null,
      fees: collectCourseFees(courses),
    },
    featuredCourses: courses.slice(0, 6).map((course) => ({
      name: course.name,
      category: course.category,
      duration: course.duration || null,
      feesPerYear: course.feesPerYear || null,
      entranceExams: course.entranceExams || [],
      totalSeats: course.totalSeats || null,
    })),
  };
};

const createComparisonRows = (profiles) => {
  const metricRows = [
    { key: 'nirfRank', label: 'NIRF Rank', getValue: (profile) => profile.nirfRank, lowerIsBetter: true, type: 'number' },
    { key: 'avgPackageLPA', label: 'Average Package (LPA)', getValue: (profile) => profile.stats.avgPackageLPA, lowerIsBetter: false, type: 'number' },
    { key: 'highestPackageLPA', label: 'Highest Package (LPA)', getValue: (profile) => profile.stats.highestPackageLPA, lowerIsBetter: false, type: 'number' },
    { key: 'placementPercentage', label: 'Placement Percentage', getValue: (profile) => profile.stats.placementPercentage, lowerIsBetter: false, type: 'number' },
    { key: 'totalStudents', label: 'Total Students', getValue: (profile) => profile.stats.totalStudents, lowerIsBetter: false, type: 'number' },
    { key: 'campusSizeAcres', label: 'Campus Size (Acres)', getValue: (profile) => profile.stats.campusSizeAcres, lowerIsBetter: false, type: 'number' },
    { key: 'totalCourses', label: 'Courses Available', getValue: (profile) => profile.courseSummary.totalCourses, lowerIsBetter: false, type: 'number' },
    { key: 'minFees', label: 'Starting Fees / Year', getValue: (profile) => profile.courseSummary.fees?.min, lowerIsBetter: true, type: 'currency' },
    { key: 'maxFees', label: 'Highest Fees / Year', getValue: (profile) => profile.courseSummary.fees?.max, lowerIsBetter: true, type: 'currency' },
    { key: 'totalSeats', label: 'Total Seats', getValue: (profile) => profile.courseSummary.totalSeats, lowerIsBetter: false, type: 'number' },
  ];

  return metricRows.map((row) => {
    const values = profiles.map((profile) => ({
      universityId: profile._id.toString(),
      value: row.getValue(profile),
    }));
    const comparable = values.filter((entry) => typeof entry.value === 'number');
    let bestUniversityIds = [];

    if (comparable.length) {
      const bestValue = row.lowerIsBetter
        ? Math.min(...comparable.map((entry) => entry.value))
        : Math.max(...comparable.map((entry) => entry.value));
      bestUniversityIds = comparable
        .filter((entry) => entry.value === bestValue)
        .map((entry) => entry.universityId);
    }

    return {
      key: row.key,
      label: row.label,
      type: row.type,
      lowerIsBetter: row.lowerIsBetter,
      values,
      bestUniversityIds,
    };
  });
};

exports.getUniversities = async (req, res) => {
  try {
    const { state, type, naacGrade, minFees, maxFees, entranceExam, avgPackage, nirfRank, approvals, sort, page = 1, limit = 12, courseCategory } = req.query;
    const filter = {};
    if (state) filter.state = { $in: state.split(',') };
    if (type && type !== 'both') filter.type = type;
    if (naacGrade) filter.naacGrade = { $in: naacGrade.split(',') };
    if (nirfRank) {
      const [min, max] = nirfRank.split('-').map(Number);
      if (max) filter.nirfRank = { $gte: min, $lte: max };
      else filter.nirfRank = { $lte: min };
    }
    if (avgPackage) {
      const [min, max] = avgPackage.split('-').map(Number);
      filter['stats.avgPackageLPA'] = max ? { $gte: min, $lte: max } : { $gte: min };
    }
    if (approvals) {
      approvals.split(',').forEach(a => { filter[`approvals.${a.toLowerCase()}`] = true; });
    }

    if (courseCategory) {
      const courses = await Course.find({ category: { $regex: new RegExp(`^${courseCategory}$`, 'i') } });
      const uniIds = courses.map(c => c.universityId);
      filter._id = { $in: uniIds };
    }

    let sortObj = { nirfRank: 1 };
    if (sort === 'fees_asc') sortObj = { 'stats.avgPackageLPA': 1 };
    else if (sort === 'fees_desc') sortObj = { 'stats.avgPackageLPA': -1 };
    else if (sort === 'package') sortObj = { 'stats.avgPackageLPA': -1 };
    else if (sort === 'name') sortObj = { name: 1 };
    else if (sort === 'established') sortObj = { establishedYear: 1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [universities, total] = await Promise.all([
      University.find(filter).sort(sortObj).skip(skip).limit(parseInt(limit)).populate('courses'),
      University.countDocuments(filter)
    ]);
    res.json({ success: true, data: universities, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    let university = await University.findOne({ slug: id }).populate('courses');
    
    if (!university && mongoose.Types.ObjectId.isValid(id)) {
      university = await University.findById(id).populate('courses');
    }
    
    if (!university) return res.status(404).json({ success: false, message: 'University not found' });
    
    // Increment views for trend analysis
    university.views = (university.views || 0) + 1;
    await university.save();

    res.json({ success: true, data: university });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUniversity = async (req, res) => {
  try {
    const university = await University.create(req.body);
    res.status(201).json({ success: true, data: university });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUniversity = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.name) payload.slug = slugify(payload.name, { lower: true, strict: true });
    const university = await University.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
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
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchUniversities = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });
    const universities = await University.find({ $text: { $search: q } }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).limit(10).select('name city state type slug logoUrl');
    res.json({ success: true, data: universities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.compareUniversities = async (req, res) => {
  try {
    const requestedIds = uniq((req.body.universityIds || []).map((id) => id?.toString().trim()));

    if (requestedIds.length < 2) {
      return res.status(400).json({ success: false, message: 'Please select at least 2 universities to compare' });
    }

    const universities = await University.find({ _id: { $in: requestedIds } }).populate('courses');
    const orderedUniversities = requestedIds
      .map((id) => universities.find((university) => university._id.toString() === id))
      .filter(Boolean);

    if (orderedUniversities.length < 2) {
      return res.status(404).json({ success: false, message: 'Selected universities not found' });
    }

    const profiles = orderedUniversities.map(buildComparisonProfile);
    const comparisonRows = createComparisonRows(profiles);
    const getBestIds = (key) => comparisonRows.find((row) => row.key === key)?.bestUniversityIds || [];

    res.json({
      success: true,
      data: {
        universities: profiles,
        comparisonRows,
        summary: {
          commonCourseCategories: uniq(
            profiles.reduce((common, profile, index) => {
              if (index === 0) return profile.courseSummary.categories;
              return common.filter((category) => profile.courseSummary.categories.includes(category));
            }, [])
          ),
          commonEntranceExams: uniq(
            profiles.reduce((common, profile, index) => {
              if (index === 0) return profile.courseSummary.entranceExams;
              return common.filter((exam) => profile.courseSummary.entranceExams.includes(exam));
            }, [])
          ),
          bestFor: {
            ranking: getBestIds('nirfRank'),
            placements: getBestIds('avgPackageLPA'),
            affordability: getBestIds('minFees'),
            courseBreadth: getBestIds('totalCourses'),
          },
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTrends = async (req, res) => {
  try {
    const popularUniversities = await University.find().sort({ views: -1 }).limit(6).select('name slug views logoUrl city state');
    const trendingCourses = await Course.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);
    res.json({ success: true, popularUniversities, trendingCourses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
