const mongoose = require('mongoose');

const Subscription = require('../models/Subscription');
const University = require('../models/University');
const { logAction } = require('../services/auditService');
const { getSubscriptionState, LIFETIME_YEARS } = require('../services/subscriptionStatus');

/**
 * Admin-granted trials.
 *
 * A sales conversation routinely needs to unlock a university before any money
 * moves — a pilot, a goodwill extension, a university whose transfer is still
 * clearing. Doing that by hand in the database is how a fake payment id ends up
 * in the revenue report, so trials are first-class records with
 * `source: 'trial'` and no Razorpay fields, and every revenue query filters on
 * source to keep them out of the numbers.
 */

const fail = (res, status, message, code) =>
  res.status(status).json({ success: false, ...(code ? { code } : {}), message });

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

/** Preset lengths the UI offers. Any positive integer is accepted. */
const PRESET_DAYS = [7, 15, 30];

/**
 * Grants or extends a trial.
 *
 * Extends from the current expiry when one is still in the future, so a
 * university with three days left that is granted seven ends up with ten rather
 * than seven — the alternative silently takes time away from the customer it was
 * meant to help.
 */
exports.grantTrial = async (req, res) => {
  try {
    const { universityId } = req.params;
    const { days, lifetime, note } = req.body || {};

    if (!isValidObjectId(universityId)) return fail(res, 400, 'Invalid university id');

    const university = await University.findById(universityId).select('name');
    if (!university) return fail(res, 404, 'University not found');

    const numericDays = Number(days);
    if (!lifetime && (!Number.isFinite(numericDays) || numericDays <= 0)) {
      return fail(res, 400, 'Provide a positive number of days, or set lifetime: true.');
    }

    const state = await getSubscriptionState(universityId);
    const base = state.isActive && state.expiryDate ? new Date(state.expiryDate) : new Date();

    const expiryDate = lifetime
      ? new Date(Date.now() + LIFETIME_YEARS * 365.25 * 24 * 60 * 60 * 1000)
      : new Date(base.getTime() + numericDays * 24 * 60 * 60 * 1000);

    /**
     * One trial row per university, extended in place.
     *
     * Creating a row per extension would leave a trail of overlapping trials
     * that "remove trial" then has to reason about, and it collides outright on
     * the unique razorpayPaymentId index: every trial leaves that field null, and
     * the index in the database was built before the schema made it sparse —
     * changing a schema does not rebuild an existing index. Extending the single
     * row sidesteps both, and matches what the admin means by "extend".
     */
    const trialFields = {
      universityId,
      source: 'trial',
      // Recorded so reports can separate granted time from sold time. A trial
      // reporting its plan as "monthly" would inflate the monthly count.
      plan: lifetime || numericDays > 60 ? 'yearly' : 'monthly',
      amount: 0,
      expiryDate,
      grantedBy: req.user._id,
      ...(String(note || '').trim() ? { grantNote: String(note).trim() } : {}),
    };

    const trial = await Subscription.findOneAndUpdate(
      { universityId, source: 'trial' },
      { $set: trialFields, $setOnInsert: { startDate: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await logAction({
      userId: req.user._id,
      action: 'create',
      resource: 'subscription_trial',
      resourceId: trial._id,
      description: lifetime
        ? `Granted lifetime access to ${university.name}`
        : `Granted ${numericDays}-day trial to ${university.name} (until ${expiryDate.toDateString()})`,
      req,
    });

    return res.status(201).json({
      success: true,
      message: lifetime
        ? `${university.name} now has lifetime access.`
        : `${university.name} unlocked for ${numericDays} day(s), until ${expiryDate.toDateString()}.`,
      data: {
        id: trial._id,
        universityId,
        expiryDate,
        lifetime: Boolean(lifetime),
        extendedFromExisting: state.isActive,
      },
    });
  } catch (error) {
    console.error('[trial] grantTrial failed:', error);
    return fail(res, 500, 'Could not grant the trial.');
  }
};

/**
 * Removes admin-granted trials, leaving paid subscriptions untouched.
 *
 * Scoped to `source: 'trial'` on purpose: an admin revoking a trial must not be
 * able to delete a subscription somebody paid for, whether by accident or
 * otherwise. Removing a paid subscription is a refund, and refunds go through
 * Razorpay.
 */
exports.removeTrial = async (req, res) => {
  try {
    const { universityId } = req.params;
    if (!isValidObjectId(universityId)) return fail(res, 400, 'Invalid university id');

    const university = await University.findById(universityId).select('name');
    if (!university) return fail(res, 404, 'University not found');

    const result = await Subscription.deleteMany({ universityId, source: 'trial' });

    if (!result.deletedCount) {
      return fail(res, 404, 'No trial found for this university. Paid subscriptions are not removable here.');
    }

    await logAction({
      userId: req.user._id,
      action: 'delete',
      resource: 'subscription_trial',
      resourceId: universityId,
      description: `Removed ${result.deletedCount} trial(s) from ${university.name}`,
      req,
    });

    const state = await getSubscriptionState(universityId);

    return res.json({
      success: true,
      message: `Trial removed from ${university.name}.`,
      // A university may still be active from a real payment underneath.
      stillActive: state.isActive,
      expiryDate: state.expiryDate,
    });
  } catch (error) {
    console.error('[trial] removeTrial failed:', error);
    return fail(res, 500, 'Could not remove the trial.');
  }
};

/** Current state for one university — what the admin row renders. */
exports.getUniversitySubscriptionState = async (req, res) => {
  try {
    const { universityId } = req.params;
    if (!isValidObjectId(universityId)) return fail(res, 400, 'Invalid university id');

    const state = await getSubscriptionState(universityId);

    return res.json({
      success: true,
      data: {
        state: state.state,
        isActive: state.isActive,
        lifetime: state.lifetime,
        expiryDate: state.expiryDate,
        enquiriesEnabled: state.enquiriesEnabled,
        source: state.subscription?.source || null,
        plan: state.subscription?.plan || null,
        grantNote: state.subscription?.grantNote || null,
      },
    });
  } catch (error) {
    console.error('[trial] getUniversitySubscriptionState failed:', error);
    return fail(res, 500, 'Could not read the subscription state.');
  }
};

exports.PRESET_DAYS = PRESET_DAYS;
