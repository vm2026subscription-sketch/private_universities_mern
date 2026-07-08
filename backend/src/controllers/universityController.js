const mongoose = require('mongoose');
const University = require('../models/University');
const Course = require('../models/Course');
const { buildUniqueSlug } = require('../utils/slug');
const { escapeRegExp } = require('../utils/regex');
const { getDisplayUniversityType, normalizeUniversityClassification } = require('../utils/universityClassification');

const uniq = (items) => [...new Set(items.filter(Boolean))];
const PUBLISHED_UNIVERSITY_FILTER = {
  $or: [
    { status: 'published' },
    { status: { $exists: false } },
  ],
};

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
  const displayType = getDisplayUniversityType(university);

  return {
    _id: university._id,
    name: university.name,
    slug: university.slug,
    state: university.state,
    city: university.city,
    type: displayType,
    segment: university.segment,
    institutionKind: university.institutionKind,
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
      totalStudentsLabel: university.stats?.totalStudentsLabel || null,
      campusSizeAcres: university.stats?.campusSizeAcres || null,
      campusSizeLabel: university.stats?.campusSizeLabel || null,
      avgPackageLPA: university.stats?.avgPackageLPA || null,
      avgPackageLPALabel: university.stats?.avgPackageLPALabel || null,
      highestPackageLPA: university.stats?.highestPackageLPA || null,
      highestPackageLPALabel: university.stats?.highestPackageLPALabel || null,
      placementPercentage: university.stats?.placementPercentage || null,
      placementPercentageLabel: university.stats?.placementPercentageLabel || null,
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
      feesPerYearLabel: course.feesPerYearLabel || null,
      entranceExams: course.entranceExams || [],
      totalSeats: course.totalSeats || null,
      totalSeatsLabel: course.totalSeatsLabel || null,
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

const buildSegmentFilter = (requestedType) => {
  if (requestedType === 'foreign' || requestedType === 'twinning') {
    return {
      $or: [
        { segment: requestedType },
        { segment: { $exists: false }, type: requestedType },
      ],
    };
  }

  const conditions = [
    {
      $or: [
        { segment: 'normal' },
        { segment: { $exists: false }, type: { $nin: ['foreign', 'twinning'] } },
      ],
    },
  ];

  if (requestedType === 'private' || requestedType === 'deemed') {
    conditions.push({
      $or: [
        { institutionKind: requestedType },
        { segment: { $exists: false }, type: requestedType },
      ],
    });
  }

  return { $and: conditions };
};

exports.getUniversities = async (req, res) => {
  try {
    const {
      search,
      state,
      city,
      type,
      naacGrade,
      minFees,
      maxFees,
      entranceExam,
      avgPackage,
      nirfRank,
      approvals,
      sort,
      page = 1,
      limit = 12,
      courseCategory,
    } = req.query;
    const filter = {};
    const normalizedPage = Math.max(parseInt(page, 10) || 1, 1);
    const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
    const skip = (normalizedPage - 1) * normalizedLimit;

    if (search) {
      const safeSearch = escapeRegExp(search.trim());
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { city: { $regex: safeSearch, $options: 'i' } },
        { state: { $regex: safeSearch, $options: 'i' } }
      ];
    }
    if (state) filter.state = { $in: state.split(',').map((item) => item.trim()).filter(Boolean) };
    if (city) filter.city = { $regex: escapeRegExp(city.trim()), $options: 'i' };
    
    const requestedType = String(type || '').trim().toLowerCase();
    const segmentFilter = buildSegmentFilter(requestedType);
    filter.$and = [...(filter.$and || []), PUBLISHED_UNIVERSITY_FILTER, segmentFilter];
    
    if (naacGrade) filter.naacGrade = { $in: naacGrade.split(',').map((item) => item.trim()).filter(Boolean) };
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
      approvals
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .forEach((approval) => {
          filter[`approvals.${approval}`] = true;
        });
    }
    if (entranceExam) {
      filter['admissions.acceptedExams'] = {
        $in: entranceExam
          .split(',')
          .map((exam) => exam.trim())
          .filter(Boolean)
          .map((exam) => new RegExp(escapeRegExp(exam), 'i')),
      };
    }

    const parsedMinFees = Number(minFees);
    const parsedMaxFees = Number(maxFees);
    const hasMinFees = Number.isFinite(parsedMinFees);
    const hasMaxFees = Number.isFinite(parsedMaxFees);

    if (courseCategory || hasMinFees || hasMaxFees) {
      const courseFilter = {};

      if (courseCategory) {
        courseFilter.category = { $regex: new RegExp(`^${escapeRegExp(courseCategory)}$`, 'i') };
      }

      if (hasMinFees || hasMaxFees) {
        const feeRange = {};
        if (hasMinFees) feeRange.$gte = parsedMinFees;
        if (hasMaxFees) feeRange.$lte = parsedMaxFees;
        courseFilter.$or = [
          { feesPerYear: feeRange },
          { 'specializations.feesPerYear': feeRange },
        ];
      }

      const uniIds = await Course.distinct('universityId', courseFilter);
      filter._id = { $in: uniIds };
    }

    let sortObj = {
      isSponsored: -1,
      sponsorPriority: -1
    };

    if (sort === 'fees_asc' || sort === 'fees_desc') {
      sortObj = null;
    } else if (sort === 'package') {
      sortObj['stats.avgPackageLPA'] = -1;
    } else if (sort === 'name') {
      sortObj.name = 1;
    } else if (sort === 'name_desc') {
      sortObj.name = -1;
    } else if (sort === 'established') {
      sortObj.establishedYear = 1;
    } else {
      sortObj.nirfRank = 1;
    }

    const LIST_FIELDS = 'name slug state city type segment institutionKind establishedYear naacGrade nirfRank logoUrl links.brochureLink description stats views approvals isSponsored sponsorTier sponsorPriority sponsorExpiry';

    // "By Ranking" is the default sort. A plain ascending sort on nirfRank puts
    // universities WITHOUT a NIRF rank first (null sorts before numbers in
    // MongoDB), burying the top-ranked ones. For this sort we use an aggregation
    // that treats "no rank" as last, so NIRF-ranked colleges appear first (by
    // rank), then the unranked ones — while keeping server-side pagination.
    const isRankingSort = !['fees_asc', 'fees_desc', 'package', 'name', 'name_desc', 'established'].includes(sort);
    const needsCoursePopulate = requestedType === 'foreign' || requestedType === 'twinning';

    let universities;
    let total;

    if (sort === 'fees_asc' || sort === 'fees_desc') {
      const allUniversities = await University.find(filter, LIST_FIELDS).populate({
        path: 'courses',
        select: 'feesPerYear specializations.feesPerYear'
      });
      const sortedUniversities = allUniversities.sort((a, b) => {
        // Prepend sponsorship sorting
        const aSponsored = a.isSponsored && (!a.sponsorExpiry || new Date(a.sponsorExpiry) > new Date());
        const bSponsored = b.isSponsored && (!b.sponsorExpiry || new Date(b.sponsorExpiry) > new Date());

        if (aSponsored && !bSponsored) return -1;
        if (!aSponsored && bSponsored) return 1;
        if (aSponsored && bSponsored) {
          if ((b.sponsorPriority || 0) !== (a.sponsorPriority || 0)) {
            return (b.sponsorPriority || 0) - (a.sponsorPriority || 0);
          }
        }

        const aMinFees = collectCourseFees(a.courses)?.min ?? Number.MAX_SAFE_INTEGER;
        const bMinFees = collectCourseFees(b.courses)?.min ?? Number.MAX_SAFE_INTEGER;
        return sort === 'fees_desc' ? bMinFees - aMinFees : aMinFees - bMinFees;
      });

      total = sortedUniversities.length;
      universities = sortedUniversities.slice(skip, skip + normalizedLimit);
    } else if (isRankingSort && !needsCoursePopulate) {
      const projection = LIST_FIELDS.split(' ').reduce((acc, field) => {
        acc[field] = 1;
        return acc;
      }, {});

      const [result] = await University.aggregate([
        { $match: filter },
        {
          $addFields: {
            // Ranked universities keep their rank; unranked sort to the very end.
            _rankOrder: {
              $cond: [{ $gt: ['$nirfRank', 0] }, '$nirfRank', Number.MAX_SAFE_INTEGER],
            },
          },
        },
        { $sort: { isSponsored: -1, sponsorPriority: -1, _rankOrder: 1, name: 1 } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: normalizedLimit }, { $project: projection }],
            total: [{ $count: 'count' }],
          },
        },
      ]);

      universities = result?.data || [];
      total = result?.total?.[0]?.count || 0;
    } else {
      let query = University.find(filter, LIST_FIELDS).sort(sortObj).skip(skip).limit(normalizedLimit);

      if (requestedType === 'foreign' || requestedType === 'twinning') {
        query = query.populate({
          path: 'courses',
          select: 'name baseCourse stream category duration feesPerYear specializationName'
        });
      }

      [universities, total] = await Promise.all([
        query,
        University.countDocuments(filter)
      ]);
    }

    res.set('Cache-Control', 'public, max-age=120, s-maxage=600');
    res.json({
      success: true,
      data: universities,
      total,
      page: normalizedPage,
      pages: Math.ceil(total / normalizedLimit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    let university = await University.findOne({ slug: { $regex: new RegExp('^' + escapeRegExp(id) + '$', 'i') }, ...PUBLISHED_UNIVERSITY_FILTER }).populate('courses');
    
    if (!university && mongoose.Types.ObjectId.isValid(id)) {
      university = await University.findOne({ _id: id, ...PUBLISHED_UNIVERSITY_FILTER }).populate('courses');
    }
    
    if (!university) return res.status(404).json({ success: false, message: 'University not found' });

    // Fallback: If courses array is empty (due to seeder logic), fetch them manually
    if (!university.courses || university.courses.length === 0) {
      const manualCourses = await Course.find({ universityId: university._id });
      if (manualCourses.length > 0) {
        university = university.toObject();
        university.courses = manualCourses;
      }
    }
    
    // Increment views for trend analysis. Use an atomic, non-blocking $inc so a
    // read no longer triggers a full-document save() (which ran schema
    // validation + pre-save hooks, risked lost-update races under concurrency,
    // and added write latency to the hottest endpoint). The in-memory bump keeps
    // the response payload byte-for-byte identical to the previous behaviour.
    university.views = (university.views || 0) + 1;
    University.updateOne({ _id: university._id }, { $inc: { views: 1 } }).catch(() => {});

    res.json({ success: true, data: university });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUniversity = async (req, res) => {
  try {
    const payload = { ...req.body };
    Object.assign(payload, normalizeUniversityClassification(payload));
    if (payload.name) {
      payload.slug = await buildUniqueSlug({
        model: University,
        value: payload.name,
        fallback: 'university',
      });
    }

    const university = await University.create(payload);
    res.status(201).json({ success: true, data: university });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUniversity = async (req, res) => {
  try {
    const payload = { ...req.body };
    Object.assign(payload, normalizeUniversityClassification(payload));
    if (payload.name) {
      payload.slug = await buildUniqueSlug({
        model: University,
        value: payload.name,
        currentId: req.params.id,
        fallback: 'university',
      });
    }
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
    const universities = await University.find(
      { $and: [{ $text: { $search: q } }, PUBLISHED_UNIVERSITY_FILTER] },
      { score: { $meta: 'textScore' } }
    )
      .sort({ isSponsored: -1, sponsorPriority: -1, score: { $meta: 'textScore' } })
      .limit(10)
      .select('name city state type slug logoUrl isSponsored sponsorTier sponsorPriority sponsorExpiry');
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

    const universities = await University.find({ _id: { $in: requestedIds }, ...PUBLISHED_UNIVERSITY_FILTER }).populate('courses');
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
    const popularUniversities = await University.find({
      $and: [
        PUBLISHED_UNIVERSITY_FILTER,
        {
          $or: [
            { segment: 'normal' },
            { segment: { $exists: false }, type: { $nin: ['foreign', 'twinning'] } },
          ],
        },
      ],
    }).sort({ views: -1 }).limit(6).select('name slug views logoUrl city state segment institutionKind type');
    const trendingCourses = await Course.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);
    res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
    res.json({ success: true, popularUniversities, trendingCourses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Real per-state university counts (published, normal segment) for the homepage.
exports.getStateCounts = async (req, res) => {
  try {
    const rows = await University.aggregate([
      {
        $match: {
          $and: [
            PUBLISHED_UNIVERSITY_FILTER,
            {
              $or: [
                { segment: 'normal' },
                { segment: { $exists: false }, type: { $nin: ['foreign', 'twinning'] } },
              ],
            },
          ],
        },
      },
      { $match: { state: { $nin: [null, ''] } } },
      { $group: { _id: '$state', count: { $sum: 1 } } },
    ]);
    const counts = {};
    rows.forEach((r) => { counts[r._id] = r.count; });
    res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
    res.json({ success: true, data: counts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const recommender = require('../utils/recommender');

exports.getSimilarUniversities = async (req, res) => {
  try {
    const { id } = req.params;
    // Guard against a non-ObjectId id (otherwise a CastError leaks as a 500).
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'University not found' });
    }
    const university = await University.findOne({ _id: id, ...PUBLISHED_UNIVERSITY_FILTER });
    if (!university) return res.status(404).json({ success: false, message: 'University not found' });
    const classification = normalizeUniversityClassification(university);

    // Fetch pool of potential similar universities
    let pool = await University.find({
      _id: { $ne: university._id },
      ...PUBLISHED_UNIVERSITY_FILTER,
      ...(classification.segment === 'normal'
        ? {
            $or: [
              { segment: 'normal', institutionKind: classification.institutionKind },
              { segment: { $exists: false }, type: classification.institutionKind },
            ],
          }
        : {
            $or: [
              { segment: classification.segment },
              { segment: { $exists: false }, type: classification.segment },
            ],
          }),
    }).limit(20);

    // If same type pool is small, add other universities in same state
    if (pool.length < 4) {
      const statePool = await University.find({
        _id: { $ne: university._id },
        ...PUBLISHED_UNIVERSITY_FILTER,
        state: university.state,
        ...(classification.segment === 'normal'
          ? {
              $or: [
                { segment: 'normal', institutionKind: { $ne: classification.institutionKind } },
                { segment: { $exists: false }, type: { $nin: [classification.institutionKind, 'foreign', 'twinning'] } },
              ],
            }
          : {
              $or: [
                { segment: classification.segment },
                { segment: { $exists: false }, type: classification.segment },
              ],
            })
      }).limit(20);
      pool = [...pool, ...statePool];
    }

    // Still small? Add any universities
    if (pool.length < 4) {
      const generalPool = await University.find({
        _id: { $ne: university._id, $nin: pool.map(p => p._id) },
        ...PUBLISHED_UNIVERSITY_FILTER,
      }).limit(20);
      pool = [...pool, ...generalPool];
    }

    const recommendations = recommender.getRecommendations(
      university, 
      pool, 
      ['description', 'overview', 'state', 'city', 'name'], 
      4
    );

    res.json({ success: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
