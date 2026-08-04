const router = require('express').Router();

/**
 * Endpoint for an external scheduler to drive periodic work.
 *
 * The in-process `setInterval` in server.js is not dependable here: this deploy
 * sleeps when idle, and a sleeping process does not fire a timer. On a quiet
 * week the subscription sweep would simply never run, and the first anyone would
 * know is a university that was never told its plan lapsed. A scheduler that
 * calls this on a fixed clock also wakes the instance, which is the behaviour we
 * actually want.
 *
 * Point any cron service at:
 *   POST https://<host>/api/v1/cron/run
 *   Header: x-cron-key: <CRON_SECRET>
 *
 * Authenticated by a shared secret rather than a session, because the caller is
 * a machine with no user. Without CRON_SECRET set the route refuses everything —
 * failing closed, so a missing variable cannot leave an unauthenticated trigger
 * exposed on the public internet.
 */
router.post('/run', async (req, res) => {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    console.warn('[cron] CRON_SECRET is not set — refusing the request.');
    return res.status(503).json({ success: false, message: 'Scheduled tasks are not configured.' });
  }

  const supplied = req.get('x-cron-key') || '';

  // Length check first: timingSafeEqual throws on a length mismatch.
  const crypto = require('crypto');
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  const authorised = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!authorised) {
    console.warn('[cron] Rejected a request with a bad or missing key.');
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  const results = {};

  try {
    // subscriptionCron, not subscriptionChecker: the latter predates the
    // Subscription model and reads sponsorTier/sponsorExpiry, which describe a
    // sponsorship rather than a plan.
    const { checkExpiringSubscriptions, checkExpiredSubscriptions } = require('../services/subscriptionCron');
    await checkExpiringSubscriptions();
    await checkExpiredSubscriptions();
    results.subscriptionExpiry = 'ok';
  } catch (error) {
    console.error('[cron] subscription sweep failed:', error);
    results.subscriptionExpiry = `failed: ${error.message}`;
  }

  // Reported rather than thrown: a scheduler reading a 500 will retry the whole
  // run, repeating whatever already succeeded.
  return res.json({ success: true, ranAt: new Date().toISOString(), results });
});

module.exports = router;
