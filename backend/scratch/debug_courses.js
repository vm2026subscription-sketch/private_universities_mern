require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');
const University = require('../src/models/University');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  const totalCourses = await Course.countDocuments();
  console.log('Total Courses:', totalCourses);

  const coursesWithUni = await Course.countDocuments({ universityId: { $exists: true, $ne: null } });
  console.log('Courses with universityId:', coursesWithUni);

  // Check how many actually match a university
  const pipeline = [
    {
      $lookup: {
        from: 'universities',
        localField: 'universityId',
        foreignField: '_id',
        as: 'university'
      }
    },
    { $unwind: '$university' },
    { $count: 'count' }
  ];
  const result = await Course.aggregate(pipeline);
  console.log('Courses with valid matching university:', result[0]?.count || 0);

  process.exit(0);
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
