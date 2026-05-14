const mongoose = require('mongoose');
require('dotenv').config();

const CourseSchema = new mongoose.Schema({
  name: String,
  category: String,
  universityId: mongoose.Schema.Types.ObjectId
});

const Course = mongoose.model('Course', CourseSchema);

async function analyze() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const total = await Course.countDocuments();
  console.log('Total Courses:', total);

  const categories = await Course.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('Categories Distribution:', categories);

  const distinctNames = await Course.distinct('name');
  console.log('Unique Course Names:', distinctNames.length);

  const topNames = await Course.aggregate([
    { $group: { _id: '$name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
  console.log('Top Course Names:', topNames);

  await mongoose.disconnect();
}

analyze();
