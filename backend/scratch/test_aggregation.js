require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Course = require('../src/models/Course');

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  try {
    const pipeline = [];
    
    pipeline.push({
      $lookup: {
        from: 'universities',
        localField: 'universityId',
        foreignField: '_id',
        as: 'university'
      }
    });
    pipeline.push({ $unwind: '$university' });

    pipeline.push({
      $group: {
        _id: '$name',
        name: { $first: '$name' },
        category: { $first: '$category' },
        duration: { $first: '$duration' },
        collegeCount: { $sum: 1 },
        entranceExams: { $addToSet: '$entranceExams' }
      }
    });

    pipeline.push({
      $project: {
        name: 1,
        category: 1,
        duration: 1,
        collegeCount: 1,
        entranceExams: {
          $reduce: {
            input: '$entranceExams',
            initialValue: [],
            in: { $setUnion: ['$$value', { $ifNull: ['$$this', []] }] }
          }
        }
      }
    });

    pipeline.push({ $sort: { collegeCount: -1 } });
    pipeline.push({ $limit: 5 });

    const result = await Course.aggregate(pipeline);
    console.log('SUCCESS:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
