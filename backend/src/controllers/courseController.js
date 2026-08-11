const mongoose = require('mongoose');
const Course = require('../models/Course');
const { escapeRegExp } = require('../utils/regex');
const {
  canonicalStream,
  streamVariants,
  categoryVariants,
  stateVariants,
  canonicalCourseKey,
  courseMatchRegex,
} = require('../utils/courseTaxonomy');

const PUBLISHED_UNIVERSITY_MATCH = {
  $or: [
    { 'universityId.status': 'published' },
    { 'universityId.status': { $exists: false } },
  ],
};

exports.getCourses = async (req, res) => {
  try {
    const { category, stream, universityId, name, baseCourse, state, segment = 'normal', page = 1, limit = 50 } = req.query;
    const normalizedPage = Math.max(parseInt(page, 10) || 1, 1);
    const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const skip = (normalizedPage - 1) * normalizedLimit;
    
    const pipeline = [];

    // Basic filters on Course model.
    // category/stream are matched against EVERY raw spelling that folds into the
    // chosen bucket (see utils/courseTaxonomy) so one button catches all its
    // synonyms instead of the single exact label it was generated from.
    const match = {};
    if (category && category !== 'All') match.category = { $in: categoryVariants(category) };

    // In drill mode (a specific baseCourse is requested) the chosen course
    // already identifies the programme. The same course is tagged under
    // different streams at different universities (e.g. "BPT" is filed under
    // "Science" at some Assam colleges and "Medical & Health Sciences"
    // elsewhere), so keeping the stream filter here wrongly hides valid
    // colleges and can empty the list. Skip it when drilling; the grouped view
    // still uses stream to build the cards.
    if (stream && stream !== 'All' && !baseCourse) {
      match.stream = { $in: streamVariants(stream) };
    }
    
    if (universityId) {
      if (!mongoose.Types.ObjectId.isValid(universityId)) {
        return res.status(400).json({ success: false, message: 'Invalid universityId' });
      }
      match.universityId = new mongoose.Types.ObjectId(universityId);
    }
    if (name) match.name = { $regex: new RegExp(escapeRegExp(name), 'i') };
    if (baseCourse) {
      // The same programme is spelled inconsistently across colleges — e.g.
      // "BPT" at one university and "B.P.T" at another (Jamia Hamdard), or
      // "Ph.D" / "Ph.D." / "PhD". Match tolerant of punctuation/spacing so the
      // clicked card finds every spelling. Uses the same normalisation the
      // grouped view folds by, so card-count always equals drill-count.
      const rx = courseMatchRegex(baseCourse);
      match.$or = [{ baseCourse: rx }, { name: rx }];
    }
    
    pipeline.push({ $match: match });

    // Sort before $lookup so MongoDB can use indexes on the courses collection
    pipeline.push({ $sort: { _id: -1 } });

    // Join with University to filter by state
    pipeline.push({
      $lookup: {
        from: 'universities',
        localField: 'universityId',
        foreignField: '_id',
        as: 'universityId'
      }
    });
    pipeline.push({ $unwind: '$universityId' });

    // Collected under $and: the published check and the segment check are both
    // top-level $or clauses, so assigning them to the same object made the
    // segment filter silently overwrite the published filter — letting draft
    // universities into the course→state college list, where clicking one 404s
    // (getUniversity only serves published records). Mirrors getGroupedCourses.
    const universityMatch = { $and: [PUBLISHED_UNIVERSITY_MATCH] };
    if (state && state !== 'All') {
      universityMatch.$and.push({
        'universityId.state': { $in: stateVariants(state) },
      });
    }
    if (segment && segment !== 'all' && !universityId) {
      if (segment === 'foreign' || segment === 'twinning') {
        universityMatch.$and.push({
          $or: [
            { 'universityId.segment': segment },
            { 'universityId.segment': { $exists: false }, 'universityId.type': segment },
          ],
        });
      } else {
        universityMatch.$and.push({
          $or: [
            { 'universityId.segment': 'normal' },
            { 'universityId.segment': { $exists: false }, 'universityId.type': { $nin: ['foreign', 'twinning'] } },
          ],
        });
      }
    }
    pipeline.push({ $match: universityMatch });
    
    // Get total count before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Course.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: normalizedLimit });

    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        category: 1,
        stream: 1,
        baseCourse: 1,
        specializationName: 1,
        duration: 1,
        specializations: 1,
        totalSeats: 1,
        totalSeatsLabel: 1,
        feesPerYear: 1,
        feesPerYearLabel: 1,
        entranceExams: 1,
        eligibility: 1,
        'universityId._id': 1,
        'universityId.name': 1,
        'universityId.slug': 1,
        'universityId.logoUrl': 1,
        'universityId.city': 1,
        'universityId.state': 1,
        'universityId.type': 1,
        'universityId.segment': 1,
        'universityId.institutionKind': 1,
      }
    });

    const courses = await Course.aggregate(pipeline);

    res.set('Cache-Control', 'public, max-age=120, s-maxage=600');
    res.json({
      success: true,
      data: courses,
      pagination: {
        total,
        page: normalizedPage,
        limit: normalizedLimit,
        pages: Math.ceil(total / normalizedLimit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Course.distinct('category');
    res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGroupedCourses = async (req, res) => {
  try {
    const { category, state, universityId, stream, segment = 'normal' } = req.query;
    
    const pipeline = [];

    // Filter by universityId if provided
    if (universityId) {
      if (!mongoose.Types.ObjectId.isValid(universityId)) {
        return res.status(400).json({ success: false, message: 'Invalid universityId' });
      }
      pipeline.push({ $match: { universityId: new mongoose.Types.ObjectId(universityId) } });
    }

    // Filter by category if provided (matches every raw spelling in the bucket)
    if (category && category !== 'All') {
      pipeline.push({ $match: { category: { $in: categoryVariants(category) } } });
    }

    // Filter by stream if provided (matches every raw spelling in the bucket)
    if (stream && stream !== 'All') {
      pipeline.push({ $match: { stream: { $in: streamVariants(stream) } } });
    }

    // To filter by state, we need to join with University
    pipeline.push({
      $lookup: {
        from: 'universities',
        localField: 'universityId',
        foreignField: '_id',
        as: 'university'
      }
    });
    pipeline.push({ $unwind: '$university' });

    const universityMatch = {};
    universityMatch.$and = [
      {
        $or: [
          { 'university.status': 'published' },
          { 'university.status': { $exists: false } },
        ],
      },
    ];
    if (state && state !== 'All') {
      universityMatch.$and.push({ 'university.state': { $in: stateVariants(state) } });
    }
    if (segment && segment !== 'all' && !universityId) {
      if (segment === 'foreign' || segment === 'twinning') {
        universityMatch.$and.push({
          $or: [
            { 'university.segment': segment },
            { 'university.segment': { $exists: false }, 'university.type': segment },
          ],
        });
      } else {
        universityMatch.$and.push({
          $or: [
            { 'university.segment': 'normal' },
            { 'university.segment': { $exists: false }, 'university.type': { $nin: ['foreign', 'twinning'] } },
          ],
        });
      }
    }
    if (universityMatch.$and.length) {
      pipeline.push({ $match: universityMatch });
    }

    // Group by the RAW baseCourse/name first, collecting everything needed to
    // fold spelling variants together in JS afterwards.
    pipeline.push({
      $group: {
        _id: { $ifNull: ['$baseCourse', '$name'] },
        courseCount: { $sum: 1 },
        category: { $first: '$category' },
        stream: { $first: '$stream' },
        duration: { $first: '$duration' },
        university: { $first: '$university' },
        universityIds: { $addToSet: '$universityId' },
        specializations: { $addToSet: '$specializationName' },
        entranceExams: { $push: '$entranceExams' },
      }
    });

    const rawGroups = await Course.aggregate(pipeline);

    // Fold the many spellings of one programme — "Ph.D" / "Ph.D." / "PhD",
    // "BPT" / "B.P.T", "BA LLB" / "B.A. LL.B." — into a single card keyed by its
    // canonical form, so the grouped view shows each programme once with its true
    // distinct-college count. The card's college count therefore matches the
    // punctuation-tolerant drill in getCourses (both use courseTaxonomy).
    const buckets = new Map();
    for (const group of rawGroups) {
      const rawName = group._id;
      if (rawName == null || String(rawName).trim() === '') continue;
      const key = canonicalCourseKey(rawName);
      if (!key) continue;

      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          labelCounts: new Map(),
          category: group.category,
          stream: group.stream,
          duration: group.duration,
          university: group.university,
          universityIds: new Set(),
          specializations: new Set(),
          entranceExams: new Set(),
        };
        buckets.set(key, bucket);
      }

      bucket.labelCounts.set(rawName, (bucket.labelCounts.get(rawName) || 0) + (group.courseCount || 0));
      for (const id of (group.universityIds || [])) bucket.universityIds.add(String(id));
      for (const spec of (group.specializations || [])) {
        if (spec && spec !== 'General') bucket.specializations.add(spec);
      }
      for (const examList of (group.entranceExams || [])) {
        if (Array.isArray(examList)) {
          for (const exam of examList) { if (exam) bucket.entranceExams.add(exam); }
        }
      }
    }

    const trimUniversity = (u) => (u
      ? { name: u.name, slug: u.slug, logoUrl: u.logoUrl, city: u.city, state: u.state }
      : null);

    let grouped = [...buckets.entries()].map(([key, bucket]) => {
      // Show the spelling used by the most courses as the card label.
      let name = null;
      let bestCount = -1;
      for (const [label, count] of bucket.labelCounts) {
        if (count > bestCount) { bestCount = count; name = label; }
      }
      return {
        _id: key,
        name,
        category: bucket.category,
        stream: bucket.stream,
        duration: bucket.duration,
        university: trimUniversity(bucket.university),
        collegeCount: bucket.universityIds.size,
        specializations: [...bucket.specializations],
        entranceExams: [...bucket.entranceExams],
      };
    });

    grouped.sort((a, b) => b.collegeCount - a.collegeCount);

    // Safety cap when no specific filter is applied (mirrors the previous limit).
    if (!stream && !category && !universityId) {
      grouped = grouped.slice(0, 1000);
    }

    res.set('Cache-Control', 'public, max-age=120, s-maxage=600');
    res.json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStreamStats = async (req, res) => {
  try {
    // Group by the RAW stream first, keeping the set of universities per spelling,
    // then fold the raw spellings into their canonical bucket in JS. Folding after
    // the $group lets us union the university sets so each canonical stream reports
    // the true number of DISTINCT colleges (not the sum of its variants' counts).
    const rawStats = await Course.aggregate([
      {
        $lookup: {
          from: 'universities',
          localField: 'universityId',
          foreignField: '_id',
          as: 'university'
        }
      },
      { $unwind: '$university' },
      {
        $match: {
          $and: [
            {
              $or: [
                { 'university.status': 'published' },
                { 'university.status': { $exists: false } },
              ],
            },
            {
              $or: [
                { 'university.segment': 'normal' },
                { 'university.segment': { $exists: false }, 'university.type': { $nin: ['foreign', 'twinning'] } },
              ],
            },
          ],
        },
      },
      {
        $group: {
          _id: '$stream',
          universityIds: { $addToSet: '$universityId' }
        }
      },
    ]);

    const buckets = new Map(); // canonical stream -> Set of university id strings
    for (const row of rawStats) {
      const canonical = canonicalStream(row._id) || 'Others';
      const set = buckets.get(canonical) || new Set();
      for (const id of row.universityIds) set.add(String(id));
      buckets.set(canonical, set);
    }

    const stats = [...buckets.entries()]
      .map(([stream, set]) => ({ stream, collegeCount: set.size }))
      .sort((a, b) => b.collegeCount - a.collegeCount);

    res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCourse = async (req, res) => {
  try {
    // Guard against a non-ObjectId id, which otherwise throws a Mongoose
    // CastError surfaced as a raw 500. A malformed id is simply "not found".
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    const course = await Course.findById(req.params.id).populate('universityId');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
