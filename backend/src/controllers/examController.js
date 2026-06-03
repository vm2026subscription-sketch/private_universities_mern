const Exam = require('../models/Exam');

exports.getExams = async (req, res) => {
  try {
    const { category, scope, state } = req.query;
    const filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (scope && scope !== 'all') {
      filter.scope = scope;
    }
    if (state && state !== 'all') {
      filter.state = state;
    }
    const exams = await Exam.find(filter).sort({ examDate: 1 });
    res.set('Cache-Control', 'public, max-age=120, s-maxage=600');
    res.json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUpcoming = async (req, res) => {
  try {
    const requestedLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 20);
    const exams = await Exam.find({ examDate: { $gte: new Date() } }).sort({ examDate: 1 }).limit(requestedLimit);
    res.set('Cache-Control', 'public, max-age=120, s-maxage=600');
    res.json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
