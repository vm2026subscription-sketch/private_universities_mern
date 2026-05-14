const mongoose = require('mongoose');
const Course = require('../models/Course');

exports.getCourses = async (req, res) => {
  try {
    const { category, universityId, name, baseCourse, state, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const pipeline = [];

    // Basic filters on Course model
    const match = {};
    if (category && category !== 'All') match.category = { $regex: new RegExp(`^${category}$`, 'i') };
    if (universityId) match.universityId = new mongoose.Types.ObjectId(universityId);
    if (name) match.name = { $regex: new RegExp(name, 'i') };
    if (baseCourse) match.baseCourse = { $regex: new RegExp(`^${baseCourse}$`, 'i') };
    
    pipeline.push({ $match: match });

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

    // Filter by university state
    if (state && state !== 'All') {
      pipeline.push({ $match: { 'universityId.state': { $regex: new RegExp(`^${state}$`, 'i') } } });
    }

    // Sort and Paginate
    pipeline.push({ $sort: { createdAt: -1 } });
    
    // Get total count before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Course.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    const courses = await Course.aggregate(pipeline);

    res.json({ 
      success: true, 
      data: courses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Course.distinct('category');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGroupedCourses = async (req, res) => {
  try {
    const { category, state, universityId, stream } = req.query;
    
    const pipeline = [];

    // Filter by universityId if provided
    if (universityId) {
      pipeline.push({ $match: { universityId: new mongoose.Types.ObjectId(universityId) } });
    }

    // Filter by category if provided
    if (category && category !== 'All') {
      pipeline.push({ $match: { category: { $regex: new RegExp(`^${category}$`, 'i') } } });
    }

    // Filter by stream if provided
    if (stream && stream !== 'All') {
      pipeline.push({ $match: { stream: { $regex: new RegExp(`^${stream}$`, 'i') } } });
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

    if (state && state !== 'All') {
      pipeline.push({ $match: { 'university.state': { $regex: new RegExp(`^${state}$`, 'i') } } });
    }

    // Group by normalized base course
    pipeline.push({
      $group: {
        _id: '$baseCourse',
        name: { $first: '$baseCourse' },
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
            cond: { $ne: ['$$spec', 'General'] }
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

    res.json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStreamStats = async (req, res) => {
  try {
    const stats = await Course.aggregate([
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
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('universityId');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
