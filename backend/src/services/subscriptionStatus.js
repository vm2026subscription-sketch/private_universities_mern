const Subscription = require('../models/Subscription');
const User = require('../models/User');

/**
 * One answer to "what is this university's subscription state, and may students
 * still enquire?" — used by the public profile and by admin screens alike, so
 * the two can never disagree about whether a university is locked.
 *
 * The rule that matters most is the one about unclaimed universities.
 */

/** A trial with no end date. Far enough out to be permanent in practice. */
const LIFETIME_YEARS = 100;

const isLifetime = (expiryDate) => {
  if (!expiryDate) return false;
  const yearsOut = (expiryDate.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000);
  return yearsOut > 50;
};

/**
 * @returns {{
 *   claimed: boolean,
 *   subscription: object|null,
 *   isActive: boolean,
 *   lifetime: boolean,
 *   expiryDate: Date|null,
 *   enquiriesEnabled: boolean,
 *   state: 'unclaimed'|'never_subscribed'|'active'|'expired'
 * }}
 */
const getSubscriptionState = async (universityId) => {
  const [owner, subscription] = await Promise.all([
    User.exists({ universityId, role: 'university' }),
    Subscription.findOne({ universityId }).sort({ expiryDate: -1 }),
  ]);

  const claimed = Boolean(owner);
  const expiryDate = subscription?.expiryDate || null;
  const isActive = Boolean(expiryDate && expiryDate > new Date());

  /**
   * Enquiries are only ever withheld from a university that CLAIMED its profile
   * and then let the subscription lapse.
   *
   * Most of the catalogue — hundreds of universities — was added by the platform
   * and has no account and no subscription. Treating "no active subscription" as
   * "lock the page" would strip the Apply button, phone number and brochure from
   * every one of them at once, gutting the site's usefulness and its lead flow to
   * punish universities that never agreed to anything. The lock is leverage over
   * a customer who stopped paying, and it only makes sense pointed at one.
   */
  const enquiriesEnabled = !claimed || isActive;

  const state = !claimed
    ? 'unclaimed'
    : !subscription
    ? 'never_subscribed'
    : isActive
    ? 'active'
    : 'expired';

  return {
    claimed,
    subscription: subscription || null,
    isActive,
    lifetime: isLifetime(expiryDate),
    expiryDate,
    enquiriesEnabled,
    state,
  };
};

/**
 * Public-facing shape. Deliberately thin: a student's browser has no business
 * knowing the plan, the amount, or when it lapsed — only whether the enquiry
 * controls should be there, and what to say if they are not.
 */
const getPublicEnquiryState = async (universityId) => {
  const { enquiriesEnabled } = await getSubscriptionState(universityId);

  return {
    enabled: enquiriesEnabled,
    message: enquiriesEnabled
      ? null
      : 'This university profile is temporarily unavailable for enquiries. Please check back later.',
  };
};

module.exports = {
  getSubscriptionState,
  getPublicEnquiryState,
  isLifetime,
  LIFETIME_YEARS,
};
