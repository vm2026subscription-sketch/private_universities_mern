require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.client.db('vidyarthi-mitra');

  // 1. Check stream distribution
  const streams = await db.collection('courses').aggregate([
    { $group: { _id: '$stream', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\n=== STREAM DISTRIBUTION ===');
  streams.forEach(s => console.log(`  ${s._id || 'NULL'}: ${s.count}`));

  // 2. Check category distribution
  const categories = await db.collection('courses').aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\n=== CATEGORY DISTRIBUTION ===');
  categories.forEach(c => console.log(`  ${c._id || 'NULL'}: ${c.count}`));

  // 3. Check baseCourse distribution (top 15)
  const baseCourses = await db.collection('courses').aggregate([
    { $group: { _id: '$baseCourse', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 }
  ]).toArray();
  console.log('\n=== TOP 15 BASE COURSES ===');
  baseCourses.forEach(b => console.log(`  ${b._id || 'NULL'}: ${b.count}`));

  // 4. Check duplicate universities per state
  const dupes = await db.collection('universities').aggregate([
    { $group: { _id: { name: '$name', state: '$state' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]).toArray();
  console.log('\n=== DUPLICATE UNIVERSITIES (same name + state) ===');
  if (dupes.length === 0) console.log('  None found!');
  dupes.forEach(d => console.log(`  ${d._id.name} (${d._id.state}): ${d.count} copies`));

  // 5. Universities per state
  const stateStats = await db.collection('universities').aggregate([
    { $group: { _id: '$state', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\n=== UNIVERSITIES PER STATE ===');
  stateStats.forEach(s => console.log(`  ${s._id || 'NULL'}: ${s.count}`));

  process.exit(0);
});
