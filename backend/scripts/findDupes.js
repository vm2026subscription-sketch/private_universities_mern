require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const University = require('../src/models/University');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Find duplicate slugs
  const dupes = await University.aggregate([
    { $group: { _id: '$slug', count: { $sum: 1 }, names: { $push: '$name' }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  console.log('Duplicate slugs:', dupes.length);
  dupes.forEach(d => console.log(`  slug: ${d._id} -> ${d.names.join(' | ')}`));

  // Check for JECRC specifically
  const jecrc = await University.find({ name: { $regex: 'jecrc', $options: 'i' } }).select('name slug state');
  console.log('\nJECRC universities:');
  jecrc.forEach(u => console.log(`  ${u.name} [${u.slug}] (${u.state})`));

  // Check for universities with very similar names
  const all = await University.find().select('name slug').lean();
  const slugCount = {};
  all.forEach(u => { slugCount[u.slug] = (slugCount[u.slug] || 0) + 1; });
  const dupSlugs = Object.entries(slugCount).filter(([,c]) => c > 1);
  if (dupSlugs.length > 0) {
    console.log('\nAll duplicate slugs:');
    dupSlugs.forEach(([s, c]) => {
      const matches = all.filter(u => u.slug === s);
      console.log(`  ${s} (${c}x): ${matches.map(u => u.name).join(' | ')}`);
    });
  }

  await mongoose.disconnect();
}
main();
