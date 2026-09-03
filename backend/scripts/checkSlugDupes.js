require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const University = require('../src/models/University');

function slugify(text) {
  if (!text) return null;
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const all = await University.find().select('name slug').lean();
  
  // Check which universities would produce the same slug
  const slugMap = {};
  all.forEach(u => {
    const computed = slugify(u.name);
    if (!slugMap[computed]) slugMap[computed] = [];
    slugMap[computed].push(u.name);
  });
  
  const dupes = Object.entries(slugMap).filter(([,names]) => names.length > 1);
  console.log('Universities with same computed slug:');
  dupes.forEach(([slug, names]) => {
    console.log(`  slug "${slug}": ${names.join(' | ')}`);
  });
  
  console.log(`\nTotal: ${dupes.length} slug conflicts`);
  
  await mongoose.disconnect();
}
main();
