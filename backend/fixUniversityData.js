/**
 * fixUniversityData.js
 * Fixes: wrong states, duplicates, fake entries, abroad unis in wrong type
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection('universities');

  let deleted = 0, updated = 0;

  // ─────────────────────────────────────────────
  // 1. DELETE fake entries (course names, not universities)
  // ─────────────────────────────────────────────
  const fakeNames = [
    'BEng (Hons) – Civil Engineering',
    'BDS – Dental Surgery',
    'BPT – Physiotherapy',
    'MBBS – Medicine & Surgery',
    'Pre-Medical Science Certificate (MD Pathway)',
    '(UPES)',  // broken duplicate
  ];
  for (const name of fakeNames) {
    const r = await col.deleteOne({ name });
    if (r.deletedCount) { console.log('DELETED fake:', name); deleted++; }
  }

  // ─────────────────────────────────────────────
  // 2. DELETE duplicate truncated entries
  //    (keep the full-name deemed version, remove the truncated private one)
  // ─────────────────────────────────────────────
  const truncatedDuplicates = [
    'Sri Ramachandra Institute of',
    'VELS Institute of Science Te',
    'Vel Tech Rangarajan Dr. Sagu',
    'Vinayaka Missions Research',
    'St. Peters Institute of Hig',
    'The Gandhigram Rural Institu',
    'Vellore Institute of Technol',
    'Istituto Europeo di Design (',
    'Coventry University India (GI',
    'Deakin University India (GIFT',
    'Illinois Institute of Techno',
    'La Trobe University India',
    "Queen's University Belfast In",
    'University of Bristol India (',
    'University of Lancaster Indi',
    'University of Southampton Ind',
    'University of Western Austra',
    'University of Wollongong Indi',
    'Western Sydney University In',
    'Ras Bihari Bose Subharti',          // duplicate of full name
    'Maharaja Agrasen Himalayan',        // duplicate of full name
    'Jigyasa University',                // duplicate (keep "Formerly Himgiri" version)
    'The University of NWH',             // duplicate of "University of North West Himalayas"
  ];
  for (const name of truncatedDuplicates) {
    // Only delete exact match
    const r = await col.deleteOne({ name });
    if (r.deletedCount) { console.log('DELETED duplicate:', name); deleted++; }
  }

  // ─────────────────────────────────────────────
  // 3. FIX Uttar Pradesh → Uttarakhand
  //    (Uttarakhand universities wrongly placed in UP)
  // ─────────────────────────────────────────────
  const upToUttarakhand = [
    'Amrapali University',
    'Bhagwant Global University',
    'COER University',
    'DBS Global University',
    'DIT University',
    'Dev Bhoomi University',
    'Dev Bhoomi Uttarakhand University',
    'Ethics University',
    'Forest Research Institute',
    'Graphic Era',
    'Graphic Era (Deemed to be University)',
    'Graphic Era Hill University',
    'Gurukul Kangri Vidyapeeth',
    'Haridwar University',
    'IMS Unison University',
    'Jigyasa University (Formerly Himgiri Zee University)',
    'Maharaja Agrasen Himalayan Garhwal University',
    'Maya Devi University',
    'Mind Power University',
    'Motherhood University',
    'Phonics University',
    'Quantum University',
    'Ras Bihari Bose Subharti University',
    'Sardar Bhagwan Singh University',
    'Shree Om University',
    'Shri Guru Ram Rai University',
    'Smt. Manjira Devi University',
    'Sparsh Himalaya University',
    'Surajmal University',
    'Swami Rama Himalayan University',
    'The ICFAI University, Dehradun',
    'University of Patanjali',
    'University of Petroleum and Energy Studies (UPES)',
    'Uttaranchal University',
    'Dev Sanskriti Vishwavidyalaya',
  ];
  for (const name of upToUttarakhand) {
    const r = await col.updateOne(
      { name, state: { $in: ['Uttar Pradesh', 'Unknown'] } },
      { $set: { state: 'Uttarakhand' } }
    );
    if (r.modifiedCount) { console.log('FIXED → Uttarakhand:', name); updated++; }
  }

  // Fix "The University of North West Himalayas" → Himachal Pradesh
  {
    const r = await col.updateOne(
      { name: 'The University of North West Himalayas' },
      { $set: { state: 'Himachal Pradesh' } }
    );
    if (r.modifiedCount) { console.log('FIXED → Himachal Pradesh: The University of North West Himalayas'); updated++; }
  }

  // ─────────────────────────────────────────────
  // 4. FIX Unknown → Uttar Pradesh (domestic UP universities)
  // ─────────────────────────────────────────────
  const unknownToUP = [
    'AAFT University of Media and Arts',
    'AMITY University',
    'Agrawan Heritage University',
    'Babu Banarasi Das University',
    'Bareilly International University',
    'Bennett University',
    'Era University',
    'G L A University',
    'Galgotias University',
    'HRIT University',
    'IFTM University',
    'IILM University',
    'IIMT University',
    'Integral University',
    'Invertis University',
    'J.S. University',
    'JSS University, Noida, Uttar Pradesh',
    'Jaypee University',
    'K. D. University, Mathura, Uttar Pradesh',
    'K.M. (Krishna Mohan) University',
    'Mahaveer University',
    'Mahayogi Gorakhnath University Gorakhpur',
    'Major S. D. Singh University',
    'Mangalayatan University',
    'Mohammad Ali Jauhar University',
    'Monad University',
    'Noida International University',
    'Rama University',
    'Sanskriti University',
    'Saroj International University',
    'Sharda University',
    'Sharda University Agra',
    'Shobhit University',
    'Shri Ramswaroop Memorial University',
    'Shri Venkateshwara University',
    'Swami Vivekananda Subharti University',
    'T. S. Mishra University',
    'Teerthanker Mahaveer University',
    'The Glocal University',
    'United University',
    'Varun Arjun University',
    'Vidya University',
    'Vivek University',
    'Maharishi Mahesh Yogi Ramayan University, Ayodhya, Uttar Pradesh',
    'Maharishi University of Information Technology',
    'Dr. K. N. Modi University, Modinagar, Ghaziabad, Uttar Pradesh',
    'F.S. University',
    'G. S. University',
    'Central Institute of Higher Tibetan Studies',
    'Dayalbagh Educational Institute',
    'Indian Veterinary Research Institute',
    'Jaypee Institute of Information Technology',
    'Kendriya Hindi Sansthan',
    'Nehru Gram Bharati',
    'Sam Higginbottom Institute of Agriculture, Technology & Sciences',
    'Santosh',
    'Shobhit Institute of Engineering & Technology',
  ];
  for (const name of unknownToUP) {
    const r = await col.updateOne(
      { name, state: 'Unknown' },
      { $set: { state: 'Uttar Pradesh' } }
    );
    if (r.modifiedCount) { console.log('FIXED → Uttar Pradesh:', name); updated++; }
  }

  // ─────────────────────────────────────────────
  // 5. FIX Unknown → Chhattisgarh
  // ─────────────────────────────────────────────
  const unknownToCG = [
    'Amity University Chhattisgarh',
    'Anjaneya University',
    'Bharti Vishwavidyalay',
    'Bodhisatva University',
    'Dr. C.V. Raman University',
    'ICFAI University Chhattisgarh',
    'ISBM University',
    'ITM University',
    'Kalinga University',
    'K.K. Modi University',
    'MATS University',
    'Maharishi University of Management & Technology',
    'O.P. Jindal University',
    'Rungta International Skills University',
    'S. K. S. International University',
    'SDGI Global University',
    'Shri Rawatpura Sarkar University',
    'Shri Shankaracharya Professional University',
    'Shri Davara University',
    'Future University',
  ];
  for (const name of unknownToCG) {
    const r = await col.updateOne(
      { name, state: 'Unknown' },
      { $set: { state: 'Chhattisgarh' } }
    );
    if (r.modifiedCount) { console.log('FIXED → Chhattisgarh:', name); updated++; }
  }

  // ─────────────────────────────────────────────
  // 6. FIX Unknown → Punjab (Chandigarh University is in Mohali, Punjab)
  // ─────────────────────────────────────────────
  {
    const r = await col.updateOne(
      { name: 'Chandigarh University', state: 'Unknown' },
      { $set: { state: 'Punjab', city: 'Mohali' } }
    );
    if (r.modifiedCount) { console.log('FIXED → Punjab: Chandigarh University'); updated++; }
  }

  // ─────────────────────────────────────────────
  // 7. MARK foreign campus universities as type='foreign'
  //    (Indian campuses of foreign universities)
  // ─────────────────────────────────────────────
  const foreignCampusNames = [
    'Coventry University India (GIFT City)',
    'Deakin University India (GIFT City)',
    'Illinois Institute of Technology',
    'Istituto Europeo di Design (IED) India',
    'La Trobe University India',
    "Queen's University Belfast India",
    'University of Aberdeen India',
    'University of Bristol India (GIFT City)',
    'University of Lancaster India',
    'University of Liverpool India',
    'University of Southampton India',
    'University of Western Australia',
    'University of Wollongong India',
    'Western Sydney University India',
    'Western Sydney University India (Greater Noida Campus)',
  ];
  // Also update by partial name match for truncated entries that survived
  for (const name of foreignCampusNames) {
    const r = await col.updateOne(
      { name },
      { $set: { type: 'foreign' } }
    );
    if (r.modifiedCount) { console.log('FIXED → type=foreign:', name); updated++; }
  }

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  console.log('\n=============================');
  console.log(`Done! Deleted: ${deleted}, Updated: ${updated}`);
  console.log('=============================\n');

  // Print remaining Unknown count
  const unknownCount = await col.countDocuments({ state: 'Unknown' });
  const foreignCount = await col.countDocuments({ type: 'foreign' });
  console.log('Remaining "Unknown" state universities:', unknownCount);
  console.log('Total "foreign" type universities:', foreignCount);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
