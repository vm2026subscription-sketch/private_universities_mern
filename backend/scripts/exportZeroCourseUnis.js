require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const grouped = await Course.aggregate([{ $group: { _id: '$universityId', count: { $sum: 1 } } }]);
  const actual = new Map(grouped.map(g => [String(g._id), g.count]));
  const unis = await University.find({}, 'name state city segment type slug').lean();
  const zero = unis
    .filter(u => (actual.get(String(u._id)) || 0) === 0)
    .sort((a, b) => (a.state || '').localeCompare(b.state || '') || (a.name || '').localeCompare(b.name || ''));

  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = ['State,University,City,Segment,Slug'];
  zero.forEach(u => rows.push([u.state, u.name, u.city, u.segment || u.type, u.slug].map(esc).join(',')));
  const out = 'universities_with_zero_courses.csv';
  fs.writeFileSync(out, rows.join('\n'));
  console.log(`Wrote ${zero.length} universities to backend/${out}`);
}
main().then(async () => { await mongoose.connection.close(); process.exit(0); })
  .catch(async e => { console.error(e); process.exit(1); });
