require('dotenv').config();
const mongoose = require('mongoose');
const University = require('../src/models/University');
const Course = require('../src/models/Course');
const User = require('../src/models/User');
const Question = require('../src/models/Question');

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
