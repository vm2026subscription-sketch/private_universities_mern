const mongoose = require('mongoose');
const University = require('../src/models/University');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function findDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const unis = await University.find({}, 'name isForeign state').lean();
    
    // Check for duplicates by name (case-insensitive, trimming spaces)
    const nameMap = new Map();
    const duplicates = [];

    // Check for prefixed names (e.g., "1-Coventry", "5-Coventry")
    const prefixed = [];

    for (const uni of unis) {
        let cleanName = uni.name.replace(/^\d+-/, '').toLowerCase().trim();
        if (nameMap.has(cleanName)) {
            duplicates.push({ name: uni.name, id: uni._id, existingName: nameMap.get(cleanName).originalName, existingId: nameMap.get(cleanName).id });
        } else {
            nameMap.set(cleanName, { id: uni._id, originalName: uni.name });
        }

        if (/^\d+-/.test(uni.name)) {
            prefixed.push({ id: uni._id, name: uni.name });
        }
    }

    console.log(`Total Universities: ${unis.length}`);
    console.log(`Found ${duplicates.length} duplicate names (ignoring case and number prefixes).`);
    if (duplicates.length > 0) {
        console.log("Sample duplicates:");
        console.log(duplicates.slice(0, 15));
    }

    console.log(`Found ${prefixed.length} names with number prefixes.`);

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

findDuplicates();
