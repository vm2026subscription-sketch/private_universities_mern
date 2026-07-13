/**
 * READ-ONLY. Investigates WHY 179 universities have 0 courses.
 *  (a) breakdown by segment/type (foreign/twinning may legitimately have none)
 *  (b) duplicate clusters: a 0-course uni whose normalized name matches ANOTHER
 *      uni that DOES have courses -> courses landed on the wrong/duplicate record.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

function normNameKey(name) {
  return String(name || '')
    .replace(/[ ​﻿]/g, ' ')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[.,\-–—'’"`]/g, ' ')
    .replace(/\b(the|of)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  await mongoose.connect(process.env.MONGODB_URI);

  const grouped = await Course.aggregate([{ $group: { _id: '$universityId', count: { $sum: 1 } } }]);
  const actualByUni = new Map(grouped.map(g => [String(g._id), g.count]));

  const unis = await University.find({}, 'name slug state segment type institutionKind status').lean();

  const zero = unis.filter(u => (actualByUni.get(String(u._id)) || 0) === 0);

  // (a) breakdown
  const bySeg = {};
  const byStatus = {};
  for (const u of zero) {
    const seg = u.segment || u.type || 'unknown';
    bySeg[seg] = (bySeg[seg] || 0) + 1;
    byStatus[u.status || 'published'] = (byStatus[u.status || 'published'] || 0) + 1;
  }

  // (b) duplicate clusters keyed by normalized name
  const byKey = new Map();
  for (const u of unis) {
    const k = normNameKey(u.name);
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(u);
  }

  const splitDupes = []; // same name: one copy 0 courses, another >0
  for (const [k, list] of byKey) {
    if (list.length < 2) continue;
    const withCourses = list.filter(u => (actualByUni.get(String(u._id)) || 0) > 0);
    const without = list.filter(u => (actualByUni.get(String(u._id)) || 0) === 0);
    if (withCourses.length && without.length) {
      splitDupes.push({ key: k, withCourses, without });
    }
  }

  console.log('======== ZERO-COURSE UNIVERSITY DIAGNOSTIC (read-only) ========');
  console.log(`Total 0-course universities: ${zero.length}`);
  console.log('\nBy segment/type:');
  Object.entries(bySeg).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`   ${k}: ${v}`));
  console.log('\nBy status:');
  Object.entries(byStatus).forEach(([k,v]) => console.log(`   ${k}: ${v}`));

  console.log(`\n[DUPLICATE SPLIT] name clusters where a 0-course copy shadows a copy WITH courses: ${splitDupes.length}`);
  splitDupes.slice(0, 25).forEach(d => {
    const w = d.withCourses.map(u => `${u.name} [${u.state||'?'} • ${actualByUni.get(String(u._id))} courses]`).join('  |  ');
    const o = d.without.map(u => `${u.name} [${u.state||'?'} • 0]`).join('  |  ');
    console.log(`   • has: ${w}\n     dup: ${o}`);
  });
  if (splitDupes.length > 25) console.log(`   ...and ${splitDupes.length - 25} more`);

  // A sample of the genuinely-alone zero-course unis (no duplicate with courses)
  const dupWithoutIds = new Set(splitDupes.flatMap(d => d.without.map(u => String(u._id))));
  const lonelyZero = zero.filter(u => !dupWithoutIds.has(String(u._id)));
  console.log(`\n[NO DUPLICATE] 0-course unis with no course-bearing twin: ${lonelyZero.length}`);
  lonelyZero.slice(0, 20).forEach(u => console.log(`   - ${u.name} (${u.state||'?'} • ${u.segment||u.type||'?'} • ${u.status||'published'})`));
  console.log('================================================================');
}

main()
  .then(async () => { await mongoose.connection.close(); process.exit(0); })
  .catch(async (e) => { console.error('failed:', e); if (mongoose.connection.readyState !== 0) await mongoose.connection.close(); process.exit(1); });
