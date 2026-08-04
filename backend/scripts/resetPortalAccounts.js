/**
 * Resets the university portal to a clean state for testing.
 *
 * Removes the accounts and claims created while trying the portal out, so the
 * next run starts from nothing. It does NOT touch the university catalogue,
 * courses, students, admins or leads — those are product data, and a testing
 * script has no business deleting them.
 *
 *   node scripts/resetPortalAccounts.js          # preview only, deletes nothing
 *   node scripts/resetPortalAccounts.js --yes    # actually delete
 *
 * The preview is the default on purpose: a destructive script that runs on a
 * bare invocation gets run by accident exactly once, and there is no undo.
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const University = require('../src/models/University');
const Course = require('../src/models/Course');
const UniversityClaim = require('../src/models/UniversityClaim');

/** Demo records this repo's own scripts create, identified by their prefix. */
const DEMO_NAME = /^DEMO_/;

const line = (label, value) => console.log(`  ${String(label).padEnd(34)} ${value}`);

const run = async () => {
  const confirmed = process.argv.includes('--yes');

  await connectDB();

  // ── What would go ─────────────────────────────────────────────────────
  const accounts = await User.find({ role: 'university' })
    .populate('universityId', 'name')
    .select('email universityRole universityId');

  const claims = await UniversityClaim.find({}).select('officialEmail status');

  const demoUniversities = await University.find({ name: DEMO_NAME }).select('name');
  const demoUniversityIds = demoUniversities.map((u) => u._id);

  const demoCourseCount = demoUniversityIds.length
    ? await Course.countDocuments({ universityId: { $in: demoUniversityIds } })
    : 0;

  const withPendingEdits = await University.countDocuments({
    'pendingChanges.submittedAt': { $exists: true, $ne: null },
  });

  console.log(`\n${confirmed ? 'DELETING' : 'WOULD DELETE'} — university portal test data\n`);

  line('university login accounts', accounts.length);
  accounts.forEach((a) =>
    console.log(`      - ${a.email}  (${a.universityRole || 'no access'}${a.universityId ? ` → ${a.universityId.name}` : ''})`)
  );

  line('claims', claims.length);
  claims.forEach((c) => console.log(`      - ${c.officialEmail}  [${c.status}]`));

  line('demo universities', demoUniversities.length);
  demoUniversities.forEach((u) => console.log(`      - ${u.name}`));

  line('courses under demo universities', demoCourseCount);
  line('universities with queued edits', `${withPendingEdits}  (queue cleared, university kept)`);

  // ── What stays ────────────────────────────────────────────────────────
  const keptUniversities = await University.countDocuments({ name: { $not: DEMO_NAME } });
  const keptCourses = demoUniversityIds.length
    ? await Course.countDocuments({ universityId: { $nin: demoUniversityIds } })
    : await Course.countDocuments({});

  console.log('\nKEEPING\n');
  line('universities', keptUniversities);
  line('courses', keptCourses);
  line('student accounts', await User.countDocuments({ role: 'user' }));
  line('admin accounts', await User.countDocuments({ role: { $in: ['admin', 'superadmin'] } }));

  if (!confirmed) {
    console.log('\nNothing was deleted. Re-run with --yes to apply:\n');
    console.log('  npm run reset:portal -- --yes\n');
    await mongoose.disconnect();
    return;
  }

  // ── Apply ─────────────────────────────────────────────────────────────
  console.log('\nApplying…\n');

  const claimResult = await UniversityClaim.deleteMany({});
  line('claims deleted', claimResult.deletedCount);

  const accountResult = await User.deleteMany({ role: 'university' });
  line('accounts deleted', accountResult.deletedCount);

  if (demoUniversityIds.length) {
    const courseResult = await Course.deleteMany({ universityId: { $in: demoUniversityIds } });
    line('demo courses deleted', courseResult.deletedCount);

    // Detach from the parent's courses[] before removing, so no University is
    // left holding ids that no longer resolve.
    await University.updateMany(
      { _id: { $in: demoUniversityIds } },
      { $set: { courses: [] } }
    );

    const uniResult = await University.deleteMany({ _id: { $in: demoUniversityIds } });
    line('demo universities deleted', uniResult.deletedCount);
  }

  /**
   * Queued edits are cleared, but the university itself is kept — the record is
   * catalogue data that existed before anyone tested the portal. Only the
   * portal's own review state is discarded.
   */
  const pendingResult = await University.updateMany(
    { 'pendingChanges.submittedAt': { $exists: true, $ne: null } },
    { $unset: { pendingChanges: '' } }
  );
  line('edit queues cleared', pendingResult.modifiedCount);

  console.log('\nPortal reset. The catalogue is untouched.\n');
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('\nReset failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* already closed */
  }
  process.exitCode = 1;
});
