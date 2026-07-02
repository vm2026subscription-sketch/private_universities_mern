require('dotenv').config();
const mongoose = require('mongoose');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

const line = (t) => console.log('\n========== ' + t + ' ==========');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to', mongoose.connection.name);

  // ---------- ISSUE 1: TCET / Thakur ----------
  line('ISSUE 1: Thakur / TCET university record');
  const thakur = await University.find({
    $or: [
      { name: { $regex: 'thakur', $options: 'i' } },
      { slug: { $regex: 'thakur', $options: 'i' } },
      { universityCode: { $regex: 'TCET', $options: 'i' } },
      { name: { $regex: 'TCET', $options: 'i' } },
    ],
  }).select('name slug status type segment state city universityCode courses');
  console.log('Matches found:', thakur.length);
  thakur.forEach((u) =>
    console.log({
      _id: u._id.toString(),
      name: u.name,
      slug: u.slug,
      status: u.status,
      type: u.type,
      segment: u.segment,
      state: u.state,
      city: u.city,
      coursesArrayLen: (u.courses || []).length,
    })
  );

  // ---------- ISSUE 2: Categories / Streams ----------
  line('ISSUE 2: Distinct categories & streams');
  const categories = await Course.distinct('category');
  const streams = await Course.distinct('stream');
  console.log('Distinct categories:', JSON.stringify(categories));
  console.log('Distinct streams:', JSON.stringify(streams));

  console.log('\nCounts by stream:');
  console.log(await Course.aggregate([{ $group: { _id: '$stream', count: { $sum: 1 } } }, { $sort: { count: -1 } }]));
  console.log('\nCounts by category:');
  console.log(await Course.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]));

  // Show how raw stream values look for the problem categories (whitespace / case)
  console.log('\nRaw stream values containing mba/medical/design/management (quoted to expose whitespace):');
  const sampleStreams = await Course.aggregate([
    { $match: { stream: { $regex: 'mba|pgdm|medical|design|management|health', $options: 'i' } } },
    { $group: { _id: '$stream', count: { $sum: 1 } } },
  ]);
  sampleStreams.forEach((s) => console.log(`  "${s._id}" -> ${s.count}`));

  // ---------- ISSUE 3: University-Course relationship integrity ----------
  line('ISSUE 3: University<->Course relationship integrity');
  const totalCourses = await Course.countDocuments();
  const totalUniversities = await University.countDocuments();
  console.log('Total courses:', totalCourses, '| Total universities:', totalUniversities);

  // Courses missing universityId
  const orphanNoUni = await Course.countDocuments({ universityId: { $in: [null, undefined] } });
  console.log('Courses with null/undefined universityId:', orphanNoUni);

  // Courses whose universityId does NOT exist in universities collection
  const orphanAgg = await Course.aggregate([
    { $lookup: { from: 'universities', localField: 'universityId', foreignField: '_id', as: 'u' } },
    { $match: { u: { $size: 0 } } },
    { $count: 'orphans' },
  ]);
  console.log('Courses whose universityId has no matching university (orphans):', orphanAgg[0]?.orphans || 0);

  // Top 5 universities by actual course count (aggregation)
  const counts = await Course.aggregate([
    { $group: { _id: '$universityId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);
  console.log('\nTop 5 universityId by course count (aggregation):');
  for (const c of counts) {
    const u = c._id ? await University.findById(c._id).select('name courses stats.totalCoursesCount') : null;
    console.log({
      universityId: c._id ? c._id.toString() : null,
      aggregationCount: c.count,
      universityName: u?.name || '(no matching university)',
      coursesArrayLen: u ? (u.courses || []).length : 'n/a',
      statsTotalCoursesCount: u ? u.stats?.totalCoursesCount : 'n/a',
    });
  }

  // Type check: is universityId stored as ObjectId or string?
  const sampleCourse = await Course.findOne().select('universityId name');
  if (sampleCourse) {
    console.log('\nSample course universityId type:', typeof sampleCourse.universityId, '| constructor:', sampleCourse.universityId?.constructor?.name);
  }

  await mongoose.connection.close();
  console.log('\nDone.');
}
run().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
