const mongoose = require('mongoose');
require('dotenv').config();

const Course = mongoose.model('Course', new mongoose.Schema({
  name: String,
  baseCourse: String,
  specializationName: String,
  category: String,
  stream: String,
  universityId: mongoose.Schema.Types.ObjectId
}));

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const pipeline = [
    {
      $group: {
        _id: '$baseCourse',
        count: { $sum: 1 },
        specializations: { $addToSet: '$specializationName' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ];

  const result = await Course.aggregate(pipeline);
  console.log(JSON.stringify(result, null, 2));

  await mongoose.disconnect();
}

run();
