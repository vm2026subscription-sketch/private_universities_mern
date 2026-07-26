const Newsletter = require('../models/Newsletter');
const { serverError, fail, paginated, parsePagination } = require('../utils/apiResponse');
const { isValidEmail, normalizeEmail } = require('../utils/validators');

exports.getSubscribers = async (req, res) => {
  try {
    const { subscribed } = req.query;
    const filter = {};
    if (subscribed === 'true') filter.isSubscribed = true;
    if (subscribed === 'false') filter.isSubscribed = false;

    const { page, limit, skip, isPaginated } = parsePagination(req.query, { defaultLimit: 50 });

    const query = Newsletter.find(filter).sort({ createdAt: -1 });
    if (isPaginated) query.skip(skip).limit(limit);

    // `active` used to be derived by filtering the fully-loaded array in Node.
    // countDocuments keeps it correct once the list itself is paginated, and
    // resolves it against the index instead of on the heap.
    const [subscribers, total, active] = await Promise.all([
      query,
      Newsletter.countDocuments(filter),
      Newsletter.countDocuments({ ...filter, isSubscribed: true }),
    ]);

    return paginated(res, {
      data: subscribers,
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : null,
      extra: { active },
    });
  } catch (error) {
    return serverError(res, error, 'newsletter.getSubscribers');
  }
};

exports.removeSubscriber = async (req, res) => {
  try {
    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);
    if (!subscriber) return fail(res, 404, 'Subscriber not found');
    res.json({ success: true, message: 'Subscriber removed' });
  } catch (error) {
    return serverError(res, error, 'newsletter.removeSubscriber');
  }
};

// Public
exports.subscribe = async (req, res) => {
  try {
    // Format is validated, not just presence: an unroutable address in this
    // collection is a permanent bounce on every future campaign.
    if (!isValidEmail(req.body?.email)) {
      return fail(res, 400, 'Please provide a valid email address');
    }
    const email = normalizeEmail(req.body.email);

    const existing = await Newsletter.findOne({ email });
    if (existing) {
      if (existing.isSubscribed) return res.json({ success: true, message: 'Already subscribed' });
      existing.isSubscribed = true;
      existing.subscribedAt = new Date();
      existing.unsubscribedAt = undefined;
      await existing.save();
      return res.json({ success: true, message: 'Re-subscribed successfully' });
    }

    await Newsletter.create({ email });
    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    return serverError(res, error, 'newsletter.subscribe');
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    // Guard: a missing email previously threw a TypeError (.toLowerCase on
    // undefined) surfaced as a 500. Mirrors subscribe()'s validation.
    if (!isValidEmail(req.body?.email)) {
      return fail(res, 400, 'Please provide a valid email address');
    }
    const subscriber = await Newsletter.findOne({ email: normalizeEmail(req.body.email) });
    if (!subscriber) return fail(res, 404, 'Not found');
    subscriber.isSubscribed = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();
    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    return serverError(res, error, 'newsletter.unsubscribe');
  }
};
