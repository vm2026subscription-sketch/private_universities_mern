/**
 * fixForeignUniversities.js
 * 1. Delete foreign unis NOT in the Excel
 * 2. Fix state/city/admissionLink for the 6 correct ones from Excel
 */
const mongoose = require('mongoose');
require('dotenv').config();

// Column interpretation from Excel:
// Col5 = city (mostly), Col6 = state (mostly)
// EXCEPT for Aberdeen, York, Bristol, Illinois, Victoria where Col5=state, Col6=city
// Liverpool: Col5="Bengaluru" (city), Col6="Karnataka" (state)

const correctForeign = [
  {
    name: 'University of York',
    country: 'United Kingdom',
    state: 'Maharashtra',
    city: 'Mumbai',
    admissionLink: 'https://c360.me/PTHFDR/a76447',
    fees: '₹12,50,000/year',
    description: 'University of York is a leading UK research university ranked in the top 10 in the UK. Its Mumbai campus offers world-class Computer Science degrees with specialisations in AI and Cyber Security.',
    website: 'https://www.york.ac.uk'
  },
  {
    name: 'University of Bristol',
    country: 'United Kingdom',
    state: 'Maharashtra',
    city: 'Mumbai',
    admissionLink: 'https://c360.me/PTHFDR/9bf6ed',
    fees: '₹15,00,000/year',
    description: 'University of Bristol is a prestigious Russell Group university. Its Mumbai campus offers innovative Data Science and Economics & Data Science programmes preparing graduates for data-led careers globally.',
    website: 'https://www.bristol.ac.uk'
  },
  {
    name: 'University of Liverpool',
    country: 'United Kingdom',
    state: 'Karnataka',
    city: 'Bengaluru',
    admissionLink: 'https://c360.me/PTHFDR/a378b0',
    fees: '₹11,50,000/year',
    description: 'University of Liverpool, a member of the prestigious Russell Group of universities, offers undergraduate programmes in Computer Science, Software Development and Game Design at its Bengaluru campus.',
    website: 'https://www.liverpool.ac.uk'
  },
  {
    name: 'University of Aberdeen',
    country: 'United Kingdom',
    state: 'Maharashtra',
    city: 'Mumbai',
    admissionLink: 'https://c360.me/PTHFDR/468197',
    fees: '₹12,00,000/year',
    description: 'Ranked 18th in the UK by Guardian University Rankings 2026 and 121st globally by TIME, University of Aberdeen\'s Mumbai campus offers Computing Science and Data Science honours degrees.',
    website: 'https://www.abdn.ac.uk'
  },
  {
    name: 'Illinois Institute of Technology',
    country: 'United States',
    state: 'Maharashtra',
    city: 'Mumbai',
    admissionLink: 'https://c360.me/PTHFDR/5a650c',
    fees: 'As per UGC norms',
    description: 'Illinois Institute of Technology (Illinois Tech) is a premier US technology university. Its Mumbai campus offers BS programmes in Computer Science, Artificial Intelligence, and Business & Information Technology.',
    website: 'https://www.iit.edu'
  },
  {
    name: 'Victoria University',
    country: 'Australia',
    state: 'Delhi NCR',
    city: 'Delhi',
    admissionLink: 'https://c360.me/PTHFDR/d707b9',
    fees: '₹11,00,000/year',
    description: 'Victoria University, ranked in the top 400 globally for Computer Science, offers bachelor\'s programmes in Business, Information Technology, Data Science and Cyber Security at its Delhi NCR campus.',
    website: 'https://www.vu.edu.au'
  }
];

// Universities NOT in the Excel — to be deleted
const wrongForeignNames = [
  'Western Sydney University India (Greater Noida Campus)',
  'Istituto Europeo di Design (IED) India',
  'University of Lancaster India',
  'University of Liverpool India',
  'University of Aberdeen India',
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection('universities');

  let deleted = 0, updated = 0;

  // 1. Delete wrong ones
  for (const name of wrongForeignNames) {
    const r = await col.deleteOne({ name, type: 'foreign' });
    if (r.deletedCount) { console.log('DELETED wrong foreign:', name); deleted++; }
  }

  // 2. Update/fix the 6 correct ones
  for (const u of correctForeign) {
    const r = await col.updateOne(
      { name: u.name, type: 'foreign' },
      {
        $set: {
          state: u.state,
          city: u.city,
          description: u.description,
          website: u.website,
          'links.admissionLink': u.admissionLink,
          'stats.avgFees': u.fees,
          highlights: [
            `${u.country} University`,
            `Campus in ${u.city}, India`,
            'UGC Approved',
            'International Degree',
          ]
        }
      }
    );
    if (r.modifiedCount) {
      console.log(`UPDATED: ${u.name} → ${u.city}, ${u.state}`);
      updated++;
    } else {
      // Try to find if it exists with slightly different name
      const exists = await col.findOne({ name: u.name });
      if (!exists) {
        console.log(`NOT FOUND in DB: ${u.name} — skipping`);
      } else {
        console.log(`No change needed: ${u.name}`);
      }
    }
  }

  console.log('\n=============================');
  console.log(`Deleted: ${deleted} | Updated: ${updated}`);
  console.log('=============================\n');

  // Final list
  const remaining = await col.find({ type: 'foreign' }, { projection: { name: 1, state: 1, city: 1 } }).toArray();
  console.log('Final foreign universities (' + remaining.length + '):');
  remaining.forEach(u => console.log(' ', u.name, '|', u.city + ',', u.state));

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
