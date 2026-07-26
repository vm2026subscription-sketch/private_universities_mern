const Testimonial = require('../models/Testimonial');
const { logAction } = require('../services/auditService');
const { serverError, fail, paginated, parsePagination } = require('../utils/apiResponse');
const { validateSubmission, asString, isSafeHttpUrl } = require('../utils/validators');

exports.getAll = async (req, res) => {
  try {
    const { approved } = req.query;
    const filter = {};
    if (approved === 'true') filter.isApproved = true;
    if (approved === 'false') filter.isApproved = false;

    const { page, limit, skip, isPaginated } = parsePagination(req.query, { defaultLimit: 20 });

    const query = Testimonial.find(filter).sort({ createdAt: -1 });
    if (isPaginated) query.skip(skip).limit(limit);

    const [testimonials, total] = await Promise.all([
      query,
      Testimonial.countDocuments(filter),
    ]);

    return paginated(res, {
      data: testimonials,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : null,
    });
  } catch (error) {
    return serverError(res, error, 'testimonial.getAll');
  }
};

exports.create = async (req, res) => {
  try {
    const testimonial = await Testimonial.create(req.body);
    await logAction({ userId: req.user._id, action: 'create', resource: 'Testimonial', resourceId: testimonial._id, description: `Created testimonial by: ${testimonial.name}`, req });
    res.status(201).json({ success: true, data: testimonial });
  } catch (error) {
    return serverError(res, error, 'testimonial.create');
  }
};

exports.update = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!testimonial) return fail(res, 404, 'Testimonial not found');
    await logAction({ userId: req.user._id, action: 'update', resource: 'Testimonial', resourceId: testimonial._id, description: `Updated testimonial by: ${testimonial.name}`, req });
    res.json({ success: true, data: testimonial });
  } catch (error) {
    return serverError(res, error, 'testimonial.update');
  }
};

exports.remove = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return fail(res, 404, 'Testimonial not found');
    await logAction({ userId: req.user._id, action: 'delete', resource: 'Testimonial', resourceId: testimonial._id, req });
    res.json({ success: true, message: 'Testimonial deleted' });
  } catch (error) {
    return serverError(res, error, 'testimonial.remove');
  }
};

// Public submission
exports.submitPublic = async (req, res) => {
  try {
    // Validate required fields up-front so an empty/invalid body returns a clean
    // 400 instead of a raw Mongoose ValidationError surfaced as a 500.
    const problem = validateSubmission(req.body, {
      required: [
        { key: 'name', label: 'Name' },
        { key: 'content', label: 'Feedback' },
      ],
    });
    if (problem) return fail(res, 400, problem);

    // Explicit allowlist instead of `...req.body`. The spread only forced
    // isApproved:false, so an anonymous submitter could still set isFeatured
    // (and any other schema field) on their own testimonial.
    const rating = Number(req.body.rating);

    // The feedback widget sends a `blob:` object URL, which only resolves inside
    // the submitting browser — storing it produced a permanently broken image.
    // Only absolute http(s) URLs are kept.
    const imageUrl = isSafeHttpUrl(req.body.imageUrl) ? asString(req.body.imageUrl) : undefined;

    await Testimonial.create({
      name: asString(req.body.name),
      content: asString(req.body.content),
      role: asString(req.body.role) || undefined,
      university: asString(req.body.university) || undefined,
      imageUrl,
      rating: Number.isFinite(rating) && rating >= 1 && rating <= 5 ? Math.round(rating) : 5,
      isApproved: false, // Requires admin approval
      isFeatured: false,
    });

    res.status(201).json({ success: true, message: 'Thank you! Your feedback has been submitted for review.' });
  } catch (error) {
    return serverError(res, error, 'testimonial.submitPublic');
  }
};

// Public fetch
exports.getApproved = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isApproved: true }).sort({ isFeatured: -1, createdAt: -1 }).limit(20);
    res.set('Cache-Control', 'public, max-age=300, s-maxage=1200');
    res.json({ success: true, data: testimonials });
  } catch (error) {
    return serverError(res, error, 'testimonial.getApproved');
  }
};
