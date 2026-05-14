require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const University = require('../src/models/University');

const ALL_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi NCR', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal'
];

async function audit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB for Audit\n');

    const stats = await University.aggregate([
      { $group: { _id: '$state', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const stateMap = {};
    stats.forEach(s => {
      stateMap[s._id] = s.count;
    });

    console.log('--- University Distribution by State ---');
    console.log(''.padEnd(30) + ' | ' + 'Count');
    console.log('-'.repeat(40));

    let totalUniversities = 0;
    ALL_STATES.sort().forEach(state => {
      const count = stateMap[state] || 0;
      totalUniversities += count;
      const status = count === 0 ? '⚠️ MISSING' : '✅ OK';
      console.log(`${state.padEnd(30)} | ${String(count).padEnd(5)} | ${status}`);
    });

    console.log('-'.repeat(40));
    console.log(`TOTAL UNIVERSITIES: ${totalUniversities}`);

    // Check for states in DB that are not in our list (mismatches/typos)
    const extraStates = stats.filter(s => !ALL_STATES.includes(s._id));
    if (extraStates.length > 0) {
      console.log('\n❌ ANOMALIES DETECTED (Mismatched State Names):');
      extraStates.forEach(s => {
        console.log(`- "${s._id}": ${s.count} universities`);
      });
    }

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

audit();
