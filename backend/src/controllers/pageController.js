const Page = require('../models/Page');
const { logAction } = require('../services/auditService');
const { serverError, fail, paginated, parsePagination } = require('../utils/apiResponse');

exports.getAll = async (req, res) => {
  try {
    const { published } = req.query;
    const filter = {};
    if (published === 'true') filter.isPublished = true;
    if (published === 'false') filter.isPublished = false;

    // Pagination is opt-in (?page/?limit); without it the full list is returned
    // so the existing admin screen is unaffected.
    const { page, limit, skip, isPaginated } = parsePagination(req.query, { defaultLimit: 20 });

    const query = Page.find(filter).sort({ order: 1, createdAt: -1 }).populate('author', 'name');
    if (isPaginated) query.skip(skip).limit(limit);

    const [pages, total] = await Promise.all([query, Page.countDocuments(filter)]);

    return paginated(res, {
      data: pages,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : null,
    });
  } catch (error) {
    return serverError(res, error, 'page.getAll');
  }
};

exports.create = async (req, res) => {
  try {
    const page = await Page.create({ ...req.body, author: req.user._id });
    await logAction({ userId: req.user._id, action: 'create', resource: 'Page', resourceId: page._id, description: `Created page: ${page.title}`, req });
    res.status(201).json({ success: true, data: page });
  } catch (error) {
    return serverError(res, error, 'page.create');
  }
};

exports.update = async (req, res) => {
  try {
    const page = await Page.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!page) return fail(res, 404, 'Page not found');
    await logAction({ userId: req.user._id, action: 'update', resource: 'Page', resourceId: page._id, description: `Updated page: ${page.title}`, req });
    res.json({ success: true, data: page });
  } catch (error) {
    return serverError(res, error, 'page.update');
  }
};

exports.remove = async (req, res) => {
  try {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) return fail(res, 404, 'Page not found');
    await logAction({ userId: req.user._id, action: 'delete', resource: 'Page', resourceId: page._id, req });
    res.json({ success: true, message: 'Page deleted' });
  } catch (error) {
    return serverError(res, error, 'page.remove');
  }
};

// Public
exports.getBySlug = async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug, isPublished: true });
    if (!page) return fail(res, 404, 'Page not found');
    res.json({ success: true, data: page });
  } catch (error) {
    return serverError(res, error, 'page.getBySlug');
  }
};
