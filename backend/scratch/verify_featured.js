require('dotenv').config();
const mongoose = require('mongoose');
const University = require('../src/models/University');

const FEATURED = [
  { _id: '6a38ecb709d1ea2fa4750e7b', name: 'Sister Nivedita University', slug: 'sister-nivedita-university' },
  { _id: '6a33a472a987160772861e5e', name: 'Amity University Haryana', slug: 'amity-university-haryana-gurugram-manesar' },
  { _id: '6a33a472a987160772861e6d', name: 'GD Goenka University', slug: 'gd-goenka-university' },
  { _id: '6a33a472a987160772861e76', name: 'K.R. Mangalam University', slug: 'kr-mangalam-university' },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to', mongoose.connection.name, '\n');

  for (const f of FEATURED) {
    console.log('--- claimed:', f.name, '| _id:', f._id, '| slug:', f.slug);
    let byId = null;
    if (mongoose.Types.ObjectId.isValid(f._id)) {
      byId = await University.findById(f._id).select('name slug status logoUrl city state');
    }
    const bySlug = await University.findOne({ slug: f.slug }).select('name slug status logoUrl city state');
    console.log('   byId   ->', byId ? `${byId.name} (status:${byId.status}, slug:${byId.slug})` : 'NOT FOUND');
    console.log('   bySlug ->', bySlug ? `${bySlug.name} (status:${bySlug.status}, _id:${bySlug._id})` : 'NOT FOUND');
    if (byId) console.log('   byId.logoUrl:', byId.logoUrl || '(none)');
    console.log('');
  }

  // Does SAGE exist? (user mentioned SAGE)
  const sage = await University.find({ name: { $regex: 'sage', $options: 'i' } }).select('name slug _id status');
  console.log('SAGE matches:', sage.map(s => ({ name: s.name, slug: s.slug, _id: s._id.toString(), status: s.status })));

  await mongoose.connection.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
