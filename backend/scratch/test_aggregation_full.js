require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  try {
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
      {
        $group: {
          _id: '$name',
          name: { $first: '$name' },
          category: { $first: '$category' },
          entranceExams: { $addToSet: '$entranceExams' }
        }
      },
      {
        $project: {
          entranceExams: {
            $reduce: {
              input: '$entranceExams',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] }
            }
          }
        }
      }
    ];

    const result = await Course.aggregate(pipeline);
    console.log('SUCCESS: Got ' + result.length + ' groups');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
