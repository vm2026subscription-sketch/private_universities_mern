const Course = require('../models/Course');

exports.getCourses = async (req, res) => {
  try {
    const { category, universityId, name, state } = req.query;
    const filter = {};
    if (category) filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    if (universityId) filter.universityId = universityId;
    if (name) filter.name = { $regex: new RegExp(name, 'i') };
    
    let courses = await Course.find(filter).populate('universityId', 'name slug city state logoUrl');
    
    // Server-side state filter
    if (state && state !== 'All') {
      courses = courses.filter(c => c.universityId && c.universityId.state && c.universityId.state.toLowerCase() === state.toLowerCase());
    }

    res.json({ success: true, data: courses });
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

exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('universityId');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
