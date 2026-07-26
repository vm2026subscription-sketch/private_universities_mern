const FAQ = require('../models/FAQ');
const { logAction } = require('../services/auditService');
const { serverError, fail, paginated, parsePagination } = require('../utils/apiResponse');

exports.getAll = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};

    // Pagination is opt-in (?page/?limit); without it the full list is returned
    // so the existing admin screen is unaffected.
    const { page, limit, skip, isPaginated } = parsePagination(req.query, { defaultLimit: 50 });

    const query = FAQ.find(filter).sort({ category: 1, order: 1 });
    if (isPaginated) query.skip(skip).limit(limit);

    const [faqs, total] = await Promise.all([query, FAQ.countDocuments(filter)]);

    return paginated(res, {
      data: faqs,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : null,
    });
  } catch (error) {
    return serverError(res, error, 'faq.getAll');
  }
};

exports.create = async (req, res) => {
  try {
    const faq = await FAQ.create(req.body);
    await logAction({ userId: req.user._id, action: 'create', resource: 'FAQ', resourceId: faq._id, description: `Created FAQ: ${faq.question.slice(0, 50)}`, req });
    res.status(201).json({ success: true, data: faq });
  } catch (error) {
    return serverError(res, error, 'faq.create');
  }
};

exports.update = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!faq) return fail(res, 404, 'FAQ not found');
    await logAction({ userId: req.user._id, action: 'update', resource: 'FAQ', resourceId: faq._id, req });
    res.json({ success: true, data: faq });
  } catch (error) {
    return serverError(res, error, 'faq.update');
  }
};

exports.remove = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return fail(res, 404, 'FAQ not found');
    await logAction({ userId: req.user._id, action: 'delete', resource: 'FAQ', resourceId: faq._id, req });
    res.json({ success: true, message: 'FAQ deleted' });
  } catch (error) {
    return serverError(res, error, 'faq.remove');
  }
};

// Public
exports.getPublished = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;
    const faqs = await FAQ.find(filter).sort({ order: 1 });
    res.set('Cache-Control', 'public, max-age=600, s-maxage=3600');
    res.json({ success: true, data: faqs });
  } catch (error) {
    return serverError(res, error, 'faq.getPublished');
  }
};
