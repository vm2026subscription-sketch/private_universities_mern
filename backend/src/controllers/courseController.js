const Course = require('../models/Course');

exports.getCourses = async (req, res) => {
  try {
    const { category, universityId, name } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (universityId) filter.universityId = universityId;
    if (name) filter.name = { $regex: new RegExp(`^${name}$`, 'i') };
    const courses = await Course.find(filter).populate('universityId', 'name slug city state');
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
