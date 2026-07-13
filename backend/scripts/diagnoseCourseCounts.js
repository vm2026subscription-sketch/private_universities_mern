/**
 * READ-ONLY diagnostic for the "universities showing 0 courses" issue.
 * Compares the stored University.stats.totalCoursesCount against the ACTUAL
 * number of Course docs linked by Course.universityId, and surfaces orphaned
 * courses (universityId not pointing at any university). Makes NO writes.
 *
 * Run:  node scripts/diagnoseCourseCounts.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  await mongoose.connect(process.env.MONGODB_URI);

  const totalUnis = await University.countDocuments();
  const totalCourses = await Course.countDocuments();

  // Actual course count per university, straight from the Course collection.
  const grouped = await Course.aggregate([
    { $group: { _id: '$universityId', count: { $sum: 1 } } },
  ]);
  const actualByUni = new Map(grouped.map(g => [String(g._id), g.count]));

  const unis = await University.find({}, 'name slug state stats.totalCoursesCount courses').lean();
  const uniIds = new Set(unis.map(u => String(u._id)));

  let staleZero = [];   // stored count 0/undefined but real courses exist
  let mismatch = [];    // stored count differs from real count (non-zero cases)
  let genuineZero = 0;  // really have no courses

  for (const u of unis) {
    const actual = actualByUni.get(String(u._id)) || 0;
    const stored = u.stats?.totalCoursesCount ?? 0;
    if (actual === 0) { genuineZero++; continue; }
    if (stored === 0) staleZero.push({ name: u.name, state: u.state, stored, actual });
    else if (stored !== actual) mismatch.push({ name: u.name, stored, actual });
  }

  // Orphan courses: universityId does not resolve to any existing university.
  const orphanGroups = grouped.filter(g => g._id && !uniIds.has(String(g._id)));
  const orphanCourseCount = orphanGroups.reduce((s, g) => s + g.count, 0);
  const nullUniCourses = await Course.countDocuments({ universityId: null });

  console.log('======== COURSE-COUNT DIAGNOSTIC (read-only) ========');
  console.log(`Universities:            ${totalUnis}`);
  console.log(`Courses:                 ${totalCourses}`);
  console.log(`Universities w/ 0 real courses: ${genuineZero}`);
  console.log('');
  console.log(`[STALE] show 0 but HAVE courses: ${staleZero.length}`);
  staleZero.slice(0, 30).forEach(u => console.log(`   - ${u.name} (${u.state || '?'}): stored=${u.stored} actual=${u.actual}`));
  if (staleZero.length > 30) console.log(`   ...and ${staleZero.length - 30} more`);
  console.log('');
  console.log(`[MISMATCH] non-zero but wrong count: ${mismatch.length}`);
  mismatch.slice(0, 20).forEach(u => console.log(`   - ${u.name}: stored=${u.stored} actual=${u.actual}`));
  console.log('');
  console.log(`[ORPHAN] courses whose universityId has no university: ${orphanCourseCount} (across ${orphanGroups.length} ids)`);
  console.log(`[NULL]   courses with universityId = null: ${nullUniCourses}`);
  console.log('=====================================================');
  console.log(staleZero.length || mismatch.length
    ? '\n>> Fix available: run  node scripts/fixCourseCounts.js  to recompute all counts.'
    : '\n>> Counts are already consistent.');
}

main()
  .then(async () => { await mongoose.connection.close(); process.exit(0); })
  .catch(async (e) => { console.error('Diagnostic failed:', e); if (mongoose.connection.readyState !== 0) await mongoose.connection.close(); process.exit(1); });
