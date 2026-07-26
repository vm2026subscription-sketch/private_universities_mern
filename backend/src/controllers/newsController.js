const News = require('../models/News');
const { serverError, fail, paginated, parsePagination } = require('../utils/apiResponse');

exports.getNews = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category && category !== 'all' ? { category } : {};

    // parsePagination replaces the bare parseInt() arithmetic, which produced
    // NaN skip/limit for ?page=abc and accepted an unbounded ?limit=100000.
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12 });

    const [news, total] = await Promise.all([
      News.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limit),
      News.countDocuments(filter),
    ]);

    res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
    return paginated(res, { data: news, total, page, limit });
  } catch (error) {
    return serverError(res, error, 'news.getNews');
  }
};

exports.getFeatured = async (req, res) => {
  try {
    const news = await News.find({ isFeatured: true }).sort({ publishedAt: -1 }).limit(6);
    res.json({ success: true, data: news });
  } catch (error) {
    return serverError(res, error, 'news.getFeatured');
  }
};

exports.getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return fail(res, 404, 'News not found');
    res.json({ success: true, data: news });
  } catch (error) {
    return serverError(res, error, 'news.getNewsById');
  }
};
