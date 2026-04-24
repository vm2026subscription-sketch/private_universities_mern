const News = require('../models/News');

exports.getNews = async (req, res) => {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    const filter = category && category !== 'all' ? { category } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [news, total] = await Promise.all([
      News.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(parseInt(limit)),
      News.countDocuments(filter)
    ]);
    res.json({ success: true, data: news, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFeatured = async (req, res) => {
  try {
    const news = await News.find({ isFeatured: true }).sort({ publishedAt: -1 }).limit(6);
    res.json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    res.json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
