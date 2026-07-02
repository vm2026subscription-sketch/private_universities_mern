require('dotenv').config();
const mongoose = require('mongoose');
const University = require('../src/models/University');
const Course = require('../src/models/Course');
const User = require('../src/models/User');
const Question = require('../src/models/Question');

// ─── DESTRUCTIVE-RUN GUARD ───────────────────────────────────────────────────
// This script DELETES ALL universities & courses. Because MONGODB_URI usually
// points at the production database, an accidental or automated run would wipe
// every Excel-imported university. Refuse unless intent is explicit.
(function guardDestructiveRun() {
  const confirmed = process.argv.includes('--force') || process.env.ALLOW_DESTRUCTIVE === 'true';
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE !== 'true') {
    console.error('[reset][GUARD] Refusing to wipe the catalog in production (NODE_ENV=production). This would delete all imported universities.');
    console.error('[reset][GUARD] If you truly intend to reset production, set ALLOW_DESTRUCTIVE=true explicitly.');
    process.exit(1);
  }
  if (!confirmed) {
    console.error('[reset][GUARD] This DELETES ALL universities & courses. Re-run intentionally with:  npm run reset:catalog -- --force');
    process.exit(1);
  }
})();

async function resetUniversityCatalog() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const before = {
    universities: await University.countDocuments(),
    courses: await Course.countDocuments(),
    linkedQuestions: await Question.countDocuments({ universityId: { $exists: true, $ne: null } }),
  };

  console.log('Starting catalog reset...');
  console.log(`Universities: ${before.universities}`);
  console.log(`Courses: ${before.courses}`);
  console.log(`Questions linked to universities: ${before.linkedQuestions}`);

  const [courseResult, universityResult, userResult, questionResult] = await Promise.all([
    Course.deleteMany({}),
    University.deleteMany({}),
    User.updateMany(
      {},
      {
        $set: {
          savedUniversities: [],
          savedCourses: [],
          applications: [],
          ratings: {},
          notes: {},
        },
      }
    ),
    Question.updateMany(
      { universityId: { $exists: true } },
      { $unset: { universityId: 1 } }
    ),
  ]);

  const after = {
    universities: await University.countDocuments(),
    courses: await Course.countDocuments(),
    linkedQuestions: await Question.countDocuments({ universityId: { $exists: true, $ne: null } }),
  };

  console.log('Catalog reset complete.');
  console.log(`Deleted universities: ${universityResult.deletedCount}`);
  console.log(`Deleted courses: ${courseResult.deletedCount}`);
  console.log(`Updated users: ${userResult.modifiedCount}`);
  console.log(`Unlinked questions: ${questionResult.modifiedCount}`);
  console.log(`Remaining universities: ${after.universities}`);
  console.log(`Remaining courses: ${after.courses}`);
  console.log(`Remaining linked questions: ${after.linkedQuestions}`);
}

resetUniversityCatalog()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Catalog reset failed:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  });
