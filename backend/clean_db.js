const mongoose = require('mongoose');
require('dotenv').config();

async function cleanDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collection = db.collection('universities');

    // 1. Remove non-Chhattisgarh Amity records
    console.log('Removing extra Amity campuses...');
    const amityResult = await collection.deleteMany({ 
      name: /Amity/i, 
      state: { $ne: 'Chhattisgarh' } 
    });
    console.log(`Removed ${amityResult.deletedCount} Amity records.`);

    // 2. Find and remove exact name duplicates
    console.log('Scanning for duplicate names...');
    const duplicates = await collection.aggregate([
      { $group: { _id: '$name', count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    console.log(`Found ${duplicates.length} duplicate name groups.`);
    for (const group of duplicates) {
      const keepId = group.ids[0];
      const toDelete = group.ids.slice(1);
      await collection.deleteMany({ _id: { $in: toDelete } });
      console.log(`Cleaned duplicates for: ${group._id}`);
    }

    console.log('Database cleanup completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanDatabase();
