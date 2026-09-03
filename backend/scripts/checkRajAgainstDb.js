require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const University = require('../src/models/University');

function slugify(text) {
  if (!text) return null;
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

const RAJASTHAN_EXCEL_NAMES = [
  'Amity University, Jaipur', 'Apex University', 'Bhagwant University', 'Bhartiya Skill Development University',
  'Bhupal Nobles University', 'Career Point University', 'Dr. K.N. Modi University', 'Geetanjali University',
  'Homoeopathy University', 'ICFAI University, Jaipur', 'IIHMR University', 'J.E.C.R.C. University',
  'Jagannath University', 'Jai Minesh Adivasi University', 'Jaipur National University',
  'Jayoti Vidyapeet Women\'s University', 'JK Lakshmipat University', 'Jodhpur National University',
  'Lords University', 'Madhav University', 'Maharaj Vinayak Global University',
  'Maharishi Arvind University, Jaipur', 'Mahatma Gandhi University of Medical Sciences & Technology',
  'Mahatma Jyoti Rao Phoole University', 'Manipal University, Jaipur', 'Maulana Azad University',
  'Mewar University', 'Mody University of Science & Technology', 'NIIT University', 'NIMS University',
  'Nirwan University', 'OPJS University', 'Pacific Academy of Higher Education & Research (PAHER) University',
  'Pacific Medical University', 'Poornima University', 'Pratap University', 'R.N.B. Global University',
  'Raffles University', 'Sai Tirupati University', 'Sangam University',
  'Shri Jagdish Prasad Jhabarmal Tibrewala University', 'Shri Kallaji Vedic Vishvavidyalaya',
  'Shri Khushal Das University', 'Shridhar University', 'Shyam University', 'Singhania University',
  'Sir Padmapat Singhania University', 'Sunrise University', 'Suresh Gyan Vihar University',
  'Tantia University', 'University of Engineering & Management', 'University of Technology',
  'Vivekananda Global University'
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const all = await University.find().select('name slug').lean();
  
  console.log('Checking Rajasthan Excel names against DB:\n');
  let found = 0, missing = 0;
  for (const name of RAJASTHAN_EXCEL_NAMES) {
    const slug = slugify(name);
    const existing = all.find(u => u.slug === slug || u.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      found++;
      if (existing.name !== name) {
        console.log(`  MATCH: "${name}" -> DB: "${existing.name}" (slug: ${slug})`);
      }
    } else {
      missing++;
      console.log(`  MISSING: "${name}" (slug: ${slug})`);
    }
  }
  
  console.log(`\nFound: ${found}, Missing: ${missing}`);
  
  // Check what JECRC entries exist
  const jecrc = all.filter(u => u.slug.includes('jecrc'));
  console.log('\nJECRC in DB:');
  jecrc.forEach(u => console.log(`  ${u.name} [${u.slug}]`));
  
  await mongoose.disconnect();
}
main();
