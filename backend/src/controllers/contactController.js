const ContactSubmission = require('../models/ContactSubmission');
const { logAction } = require('../services/auditService');
const { serverError, fail, paginated, parsePagination } = require('../utils/apiResponse');
const { validateSubmission, normalizeEmail, asString } = require('../utils/validators');

exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const { page, limit, skip, isPaginated } = parsePagination(req.query, { defaultLimit: 20 });

    // Pagination is opt-in: without ?page/?limit the full list is still returned,
    // so the existing admin screen (which renders everything) is unaffected.
    const query = ContactSubmission.find(filter)
      .sort({ createdAt: -1 })
      .populate('repliedBy', 'name');

    if (isPaginated) query.skip(skip).limit(limit);

    const [submissions, total] = await Promise.all([
      query,
      ContactSubmission.countDocuments(filter),
    ]);

    return paginated(res, {
      data: submissions,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : null,
    });
  } catch (error) {
    return serverError(res, error, 'contact.getAll');
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const updates = { status: req.body.status };
    if (req.body.notes) updates.notes = req.body.notes;
    if (req.body.status === 'replied') {
      updates.repliedBy = req.user._id;
      updates.repliedAt = new Date();
    }
    const submission = await ContactSubmission.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!submission) return fail(res, 404, 'Submission not found');
    await logAction({ userId: req.user._id, action: 'update', resource: 'ContactSubmission', resourceId: submission._id, description: `Updated contact status to: ${req.body.status}`, req });
    res.json({ success: true, data: submission });
  } catch (error) {
    return serverError(res, error, 'contact.updateStatus');
  }
};

exports.remove = async (req, res) => {
  try {
    const submission = await ContactSubmission.findByIdAndDelete(req.params.id);
    if (!submission) return fail(res, 404, 'Submission not found');
    res.json({ success: true, message: 'Submission deleted' });
  } catch (error) {
    return serverError(res, error, 'contact.remove');
  }
};

// Public
exports.submit = async (req, res) => {
  try {
    // Email format and field lengths are validated up-front. Previously any
    // non-empty string passed, so unreachable addresses were stored and only
    // discovered when an admin tried to reply.
    const problem = validateSubmission(req.body, {
      required: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'subject', label: 'Subject' },
        { key: 'message', label: 'Message' },
      ],
      email: true,
      phone: true, // optional here, but must be well-formed when supplied
    });
    if (problem) return fail(res, 400, problem);

    await ContactSubmission.create({
      name: asString(req.body.name),
      email: normalizeEmail(req.body.email),
      phone: asString(req.body.phone) || undefined,
      subject: asString(req.body.subject),
      message: asString(req.body.message),
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been received. We will get back to you soon.',
    });
  } catch (error) {
    return serverError(res, error, 'contact.submit');
  }
};
