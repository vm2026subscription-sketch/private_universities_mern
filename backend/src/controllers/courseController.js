const Course = require('../models/Course');

exports.getCourses = async (req, res) => {
  try {
    const { category, universityId, name, state, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const filter = {};
    if (category && category !== 'All') filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    if (universityId) filter.universityId = universityId;
    if (name) filter.name = { $regex: new RegExp(name, 'i') };
    
    // Optimized query with projection and lean()
    let query = Course.find(filter)
      .populate('universityId', 'name slug city state logoUrl')
      .lean();

    // If state filter is provided, we might need a more complex aggregation or just fetch more and filter
    // But for performance with 13k records, let's just use the limit for now
    let courses = await query.sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    
    const total = await Course.countDocuments(filter);

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
    const { category, state, universityId } = req.query;
    
    const pipeline = [];

    // Filter by universityId if provided
    if (universityId) {
      pipeline.push({ $match: { universityId: new mongoose.Types.ObjectId(universityId) } });
    }

    // Filter by category if provided
    if (category && category !== 'All') {
      pipeline.push({ $match: { category: { $regex: new RegExp(`^${category}$`, 'i') } } });
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

    // Group by normalized name
    pipeline.push({
      $group: {
        _id: '$name',
        name: { $first: '$name' },
        category: { $first: '$category' },
        duration: { $first: '$duration' },
        university: { $first: '$university' },
        collegeCount: { $sum: 1 },
        entranceExams: { $addToSet: '$entranceExams' }
      }
    });

    // Flatten entranceExams and project university
    pipeline.push({
      $project: {
        name: 1,
        category: 1,
        duration: 1,
        university: 1,
        collegeCount: 1,
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

    const grouped = await Course.aggregate(pipeline);

    res.json({ success: true, data: grouped });
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
