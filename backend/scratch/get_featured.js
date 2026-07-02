require('dotenv').config();
const mongoose = require('mongoose');
const University = require('../src/models/University');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  // Get universities with logos and courses
  const unis = await University.find(
    { status: 'published', 'stats.totalCoursesCount': { $gt: 0 } },
    'name slug city state _id naacGrade logoUrl'
  ).sort({ 'stats.totalCoursesCount': -1, views: -1 }).limit(15);
  unis.forEach(u => console.log(JSON.stringify({ _id: u._id, name: u.name, slug: u.slug, city: u.city, state: u.state, naacGrade: u.naacGrade, logo: u.logoUrl ? 'YES' : 'no' })));
  await mongoose.connection.close();
}
run();
