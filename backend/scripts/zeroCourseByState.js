require('dotenv').config();
const mongoose = require('mongoose');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const grouped = await Course.aggregate([{ $group: { _id: '$universityId', count: { $sum: 1 } } }]);
  const actual = new Map(grouped.map(g => [String(g._id), g.count]));
  const unis = await University.find({}, 'name state').lean();

  const perState = {}; // state -> { total, zero }
  for (const u of unis) {
    const s = u.state || '(no state)';
    perState[s] = perState[s] || { total: 0, zero: 0 };
    perState[s].total++;
    if ((actual.get(String(u._id)) || 0) === 0) perState[s].zero++;
  }
  console.log('State                         zero / total');
  Object.entries(perState)
    .filter(([, v]) => v.zero > 0)
    .sort((a, b) => b[1].zero - a[1].zero)
    .forEach(([s, v]) => console.log(`${s.padEnd(28)}  ${String(v.zero).padStart(3)} / ${v.total}`));
}
main().then(async () => { await mongoose.connection.close(); process.exit(0); })
  .catch(async e => { console.error(e); process.exit(1); });
