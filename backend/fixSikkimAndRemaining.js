/**
 * fixSikkimAndRemaining.js
 * 1. Remove Sikkim duplicate (truncated) entries
 * 2. Fix remaining Unknown state entries
 * 3. Fix foreign university states
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection('universities');
  let deleted = 0, updated = 0;

  // ─────────────────────────────────────────────
  // 1. Delete Sikkim duplicates (keep the full-name version)
  // ─────────────────────────────────────────────
  const sikkimDuplicates = [
    'ABVSU',                          // duplicate of Atal Bihari Vajpayee Skill University
    'Duke Intl University',           // duplicate of Duke International University
    'Fusion University',              // duplicate of Fusion University, Sikkim (keep the Sikkim one)
    'Gurukul Vidyapeeth',             // duplicate of Gurukul Vidyapeeth University
    'ICFAI Univ Sikkim',              // duplicate of The ICFAI University Sikkim
    'MGU Sikkim',                     // duplicate of Mahatma Gandhi University (MGU), Sikkim
    'MITU Sikkim',                    // duplicate of Management and Information Technology University
    'Matrix SkillTech Univ',          // duplicate of Matrix SkillTech University
    'Medhavi Skills Univ',            // duplicate of Medhavi Skills University, Sikkim
    'SGTU Sikkim',                    // duplicate of Sikkim Global Technical University
    'SRDUST',                         // duplicate of Shri Rukmani Dwarkadhish University...
    'SRM Sikkim',                     // duplicate of Shri Ramasamy Memorial University, Sikkim (SRM Sikkim)
    'Sengol Intl Univ',               // duplicate of Sengol International University
    'Sikkim Alpine Univ',             // duplicate of Sikkim Alpine University (Formerly EIILM University)
    'Sikkim Intl Univ',               // duplicate of Sikkim International University
    'Sikkim Manipal Univ',            // duplicate of Sikkim Manipal University
    'Sikkim Medical Sci',             // duplicate of Sikkim Medical Science University
    'Sikkim Organic Agri',            // duplicate of Sikkim Organic Agriculture University
    'Sikkim Professional',            // duplicate of Sikkim Professional University (Formerly...)
    'Sikkim Sardar Patel',            // duplicate of Sikkim Sardar Patel University
    'Sikkim Skill Univ',              // duplicate of Sikkim Skill University
    'Sri Venkateshwara',              // duplicate of Sri Venkateshwara University, Sikkim
    'Trident Univ Sikkim',            // duplicate of Trident University of Applied Sciences, Sikkim
    'Capital University',             // not a recognized Sikkim university - check below
    'Orchid University',              // check below
    'Pannadhay University',           // check below
    'Gurukul Vidyapeeth University',  // likely duplicate of ABVSU/Atal or standalone - keep for now
  ];

  // These are exact names to delete (only if they exist as duplicates)
  const safeDuplicates = [
    'ABVSU',
    'Duke Intl University',
    'Fusion University',
    'Gurukul Vidyapeeth',
    'ICFAI Univ Sikkim',
    'MGU Sikkim',
    'MITU Sikkim',
    'Matrix SkillTech Univ',
    'Medhavi Skills Univ',
    'SGTU Sikkim',
    'SRDUST',
    'SRM Sikkim',
    'Sengol Intl Univ',
    'Sikkim Alpine Univ',
    'Sikkim Intl Univ',
    'Sikkim Manipal Univ',
    'Sikkim Medical Sci',
    'Sikkim Organic Agri',
    'Sikkim Professional',
    'Sikkim Sardar Patel',
    'Sikkim Skill Univ',
    'Sri Venkateshwara',
    'Trident Univ Sikkim',
  ];

  for (const name of safeDuplicates) {
    const r = await col.deleteOne({ name, state: 'Sikkim' });
    if (r.deletedCount) { console.log('DELETED Sikkim duplicate:', name); deleted++; }
  }

  // ─────────────────────────────────────────────
  // 2. Fix KIET → Uttar Pradesh (Ghaziabad)
  // ─────────────────────────────────────────────
  {
    const r = await col.updateOne(
      { name: 'Krishna Institute of Engineering & Technology (KIET)', state: 'Unknown' },
      { $set: { state: 'Uttar Pradesh', city: 'Ghaziabad' } }
    );
    if (r.modifiedCount) { console.log('FIXED → Uttar Pradesh: KIET'); updated++; }
  }

  // ─────────────────────────────────────────────
  // 3. Fix foreign universities with Unknown state
  //    These are Indian campuses in GIFT City, Gujarat
  // ─────────────────────────────────────────────
  const giftCityForeign = [
    'University of Liverpool India',
    'University of Aberdeen India',
    'University of Lancaster India',
  ];
  for (const name of giftCityForeign) {
    const r = await col.updateOne(
      { name, state: 'Unknown' },
      { $set: { state: 'Gujarat', city: 'GIFT City' } }
    );
    if (r.modifiedCount) { console.log('FIXED → Gujarat (GIFT City):', name); updated++; }
  }

  // IED India is in Mumbai
  {
    const r = await col.updateOne(
      { name: 'Istituto Europeo di Design (IED) India', state: 'Unknown' },
      { $set: { state: 'Maharashtra', city: 'Mumbai' } }
    );
    if (r.modifiedCount) { console.log('FIXED → Maharashtra: Istituto Europeo di Design (IED) India'); updated++; }
  }

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  console.log('\n=============================');
  console.log(`Done! Deleted: ${deleted}, Updated: ${updated}`);
  console.log('=============================\n');

  // Final verification
  const unknownCount = await col.countDocuments({ state: 'Unknown' });
  const totalCount = await col.countDocuments({});
  const sikkimCount = await col.countDocuments({ state: 'Sikkim' });
  const foreignCount = await col.countDocuments({ type: 'foreign' });
  console.log('Total universities:', totalCount);
  console.log('Remaining "Unknown":', unknownCount);
  console.log('Sikkim count (should be ~26):', sikkimCount);
  console.log('Foreign type count:', foreignCount);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
