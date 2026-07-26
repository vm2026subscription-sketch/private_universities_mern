const mongoose = require('mongoose');
const Course = require('../models/Course');
const { escapeRegExp } = require('../utils/regex');
const { serverError, fail, paginated } = require('../utils/apiResponse');
const { publishedUniversityFilter, segmentFilter } = require('../utils/universityFilters');

const STREAM_MAP = {
  'mba/pgdm': 'Management',
  'management': 'Management',
  'medical': 'Medical & Health Sciences',
  'medical & health sciences': 'Medical & Health Sciences',
  'design': 'Design & Architecture',
  'design & architecture': 'Design & Architecture',
  'engineering': 'Engineering',
  'law': 'Law',
  'science': 'Science',
};

const normalizeStream = (stream) => {
  if (!stream) return stream;
  const key = stream.toLowerCase().trim();
  return STREAM_MAP[key] || stream;
};

// The university is joined in under `universityId` here, hence the prefix.
const PUBLISHED_UNIVERSITY_MATCH = publishedUniversityFilter('universityId');

exports.getCourses = async (req, res) => {
  try {
    const { category, stream, universityId, name, baseCourse, state, segment = 'normal', page = 1, limit = 50 } = req.query;
    const normalizedPage = Math.max(parseInt(page, 10) || 1, 1);
    const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const skip = (normalizedPage - 1) * normalizedLimit;
    
    const pipeline = [];

    // Basic filters on Course model
    const match = {};
    if (category && category !== 'All') match.category = { $regex: new RegExp(`^${escapeRegExp(category)}$`, 'i') };
    
    // Filter by stream (uses the normalized canonical DB stream value)
    const normalizedStream = normalizeStream(stream);
    if (normalizedStream && normalizedStream !== 'All') {
      match.stream = { $regex: new RegExp(`^${escapeRegExp(normalizedStream)}$`, 'i') };
    }
    
    if (universityId) {
      if (!mongoose.Types.ObjectId.isValid(universityId)) {
        return fail(res, 400, 'Invalid universityId');
      }
      match.universityId = new mongoose.Types.ObjectId(universityId);
    }
    if (name) match.name = { $regex: new RegExp(escapeRegExp(name), 'i') };
    if (baseCourse) {
      const safeBaseCourse = escapeRegExp(baseCourse);
      match.$or = [
        { baseCourse: { $regex: new RegExp(`^${safeBaseCourse}$`, 'i') } },
        { name: { $regex: new RegExp(`^${safeBaseCourse}$`, 'i') } },
      ];
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

    /**
     * Both the published-status check and the segment check are $or clauses, so
     * they MUST be combined under $and. Assigning `universityMatch.$or` twice
     * (the previous code) silently discarded the published filter, which meant
     * courses belonging to DRAFT universities were served on the public course
     * list whenever a segment filter applied — i.e. by default.
     */
    const universityConditions = [PUBLISHED_UNIVERSITY_MATCH];

    if (segment && segment !== 'all' && !universityId) {
      universityConditions.push(segmentFilter(segment, 'universityId'));
    }

    const universityMatch = { $and: universityConditions };
    if (state && state !== 'All') {
      universityMatch['universityId.state'] = { $regex: new RegExp(`^${escapeRegExp(state)}$`, 'i') };
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
    // This endpoint used to be the ONLY one returning pagination nested under a
    // `pagination` key. It still does — plus the flat fields every other list
    // endpoint emits — so both conventions now resolve to the same numbers.
    return paginated(res, {
      data: courses,
      total,
      page: normalizedPage,
      limit: normalizedLimit,
    });
  } catch (error) {
    return serverError(res, error, 'course.getCourses');
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Course.distinct('category');
    res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
    res.json({ success: true, data: categories });
  } catch (error) {
    return serverError(res, error, 'course.getCategories');
  }
};

exports.getGroupedCourses = async (req, res) => {
  try {
    const { category, state, universityId, stream, segment = 'normal' } = req.query;
    
    const pipeline = [];

    // Filter by universityId if provided
    if (universityId) {
      if (!mongoose.Types.ObjectId.isValid(universityId)) {
        return fail(res, 400, 'Invalid universityId');
      }
      pipeline.push({ $match: { universityId: new mongoose.Types.ObjectId(universityId) } });
    }

    // Filter by category if provided
    if (category && category !== 'All') {
      pipeline.push({ $match: { category: { $regex: new RegExp(`^${escapeRegExp(category)}$`, 'i') } } });
    }

    // Filter by stream if provided
    const normalizedStream = normalizeStream(stream);
    if (normalizedStream && normalizedStream !== 'All') {
      pipeline.push({ $match: { stream: { $regex: new RegExp(`^${escapeRegExp(normalizedStream)}$`, 'i') } } });
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
    universityMatch.$and = [publishedUniversityFilter('university')];
    if (state && state !== 'All') {
      universityMatch.$and.push({ 'university.state': { $regex: new RegExp(`^${escapeRegExp(state)}$`, 'i') } });
    }
    if (segment && segment !== 'all' && !universityId) {
      universityMatch.$and.push(segmentFilter(segment, 'university'));
    }
    if (universityMatch.$and.length) {
      pipeline.push({ $match: universityMatch });
    }

    // Group by normalized base course (fall back to course name if baseCourse is missing)
    pipeline.push({
      $group: {
        _id: { $ifNull: ['$baseCourse', '$name'] },
        name: { $first: { $ifNull: ['$baseCourse', '$name'] } },
        category: { $first: '$category' },
        stream: { $first: '$stream' },
        duration: { $first: '$duration' },
        university: { $first: '$university' },
        // Count unique universityIds for this base course
        universityIds: { $addToSet: '$universityId' },
        specializations: { $addToSet: '$specializationName' },
        entranceExams: { $addToSet: '$entranceExams' }
      }
    });

    // Exclude groups where name is null, empty, or whitespace-only
    pipeline.push({
      $match: {
        name: { $exists: true, $ne: null, $not: /^\s*$/ }
      }
    });

    // Flatten arrays and project
    pipeline.push({
      $project: {
        name: 1,
        category: 1,
        stream: 1,
        duration: 1,
        'university.name': 1,
        'university.slug': 1,
        'university.logoUrl': 1,
        'university.city': 1,
        'university.state': 1,
        collegeCount: { $size: '$universityIds' },
        specializations: {
          $filter: {
            input: '$specializations',
            as: 'spec',
            cond: { $and: [{ $ne: ['$$spec', null] }, { $ne: ['$$spec', 'General'] }] }
          }
        },
        entranceExams: {
          $reduce: {
            input: '$entranceExams',
            initialValue: [],
            in: { $setUnion: ['$$value', '$$this'] }
          }
        }
      }
    });

    pipeline.push({ $sort: { collegeCount: -1 } });

    // Note: We don't paginate here yet to keep the "All" view functional with frontend filtering,
    // but we limit to 1000 for safety if no specific filter is applied.
    if (!stream && !category && !universityId) {
      pipeline.push({ $limit: 1000 });
    }

    const grouped = await Course.aggregate(pipeline);

    res.set('Cache-Control', 'public, max-age=120, s-maxage=600');
    res.json({ success: true, data: grouped });
  } catch (error) {
    return serverError(res, error, 'course.getGroupedCourses');
  }
};

exports.getStreamStats = async (req, res) => {
  try {
    const stats = await Course.aggregate([
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
          $and: [publishedUniversityFilter('university'), segmentFilter('normal', 'university')],
        },
      },
      {
        $group: {
          _id: '$stream',
          // Count unique universities per stream
          universityIds: { $addToSet: '$universityId' }
        }
      },
      {
        $project: {
          stream: '$_id',
          collegeCount: { $size: '$universityIds' }
        }
      },
      { $sort: { collegeCount: -1 } }
    ]);
    res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
    res.json({ success: true, data: stats });
  } catch (error) {
    return serverError(res, error, 'course.getStreamStats');
  }
};

exports.getCourse = async (req, res) => {
  try {
    // Guard against a non-ObjectId id, which otherwise throws a Mongoose
    // CastError surfaced as a raw 500. A malformed id is simply "not found".
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return fail(res, 404, 'Course not found');
    }
    const course = await Course.findById(req.params.id).populate('universityId');
    if (!course) return fail(res, 404, 'Course not found');
    res.json({ success: true, data: course });
  } catch (error) {
    return serverError(res, error, 'course.getCourse');
  }
};
