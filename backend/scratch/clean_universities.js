require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const University = require('../src/models/University');
const Course = require('../src/models/Course');
const slugify = require('slugify');

async function cleanUniversities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const unis = await University.find({}).lean();
    console.log(`Starting with ${unis.length} universities.`);

    // Group by clean name
    const groups = new Map();

    for (const uni of unis) {
      // Clean name: remove numbers like '1-', '5-', etc.
      const cleanName = uni.name.replace(/^\d+-/, '').trim();
      const lowerName = cleanName.toLowerCase();

      if (!groups.has(lowerName)) {
        groups.set(lowerName, []);
      }
      
      // We also fetch course count to decide which one to keep
      const courseCount = await Course.countDocuments({ universityId: uni._id });
      groups.get(lowerName).push({ ...uni, cleanName, courseCount });
    }

    let mergedCount = 0;
    let renameCount = 0;

    for (const [lowerName, group] of groups.entries()) {
      if (group.length > 1) {
        // Sort by course count descending, so the one with most courses is first
        group.sort((a, b) => b.courseCount - a.courseCount);

        const keep = group[0];
        const removes = group.slice(1);

        console.log(`\nGroup: ${keep.cleanName}`);
        console.log(`  Keep: ${keep.name} (Courses: ${keep.courseCount})`);

        for (const remove of removes) {
          console.log(`  Remove: ${remove.name} (Courses: ${remove.courseCount})`);
          
          // Reassign courses
          await Course.updateMany(
            { universityId: remove._id },
            { $set: { universityId: keep._id } }
          );

          // Delete the duplicate
          await University.deleteOne({ _id: remove._id });
          mergedCount++;
        }

        // After deleting duplicates, if the keep one had a prefix, rename it safely
        if (keep.name !== keep.cleanName) {
           const newSlug = slugify(keep.cleanName, { lower: true, strict: true });
           await University.updateOne(
             { _id: keep._id }, 
             { $set: { name: keep.cleanName, slug: newSlug } }
           );
           renameCount++;
        }
      } else {
        // Single item, just check if it needs renaming
        const item = group[0];
        if (item.name !== item.cleanName) {
           // We might hit a slug conflict if another university has the same slug but different name? 
           // Shouldn't happen since we grouped by clean name.
           const newSlug = slugify(item.cleanName, { lower: true, strict: true });
           
           try {
              await University.updateOne(
                { _id: item._id }, 
                { $set: { name: item.cleanName, slug: newSlug } }
              );
              renameCount++;
           } catch (e) {
              console.log(`Failed to rename ${item.name} to ${item.cleanName} due to slug conflict.`);
           }
        }
      }
    }

    console.log(`\nMerged ${mergedCount} duplicate universities.`);
    console.log(`Renamed/stripped prefixes for ${renameCount} universities.`);

    const finalCount = await University.countDocuments();
    console.log(`Final total universities: ${finalCount}`);

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

cleanUniversities();
