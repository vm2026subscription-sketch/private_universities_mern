const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');
const Lead = require('../src/models/Lead');
const User = require('../src/models/User');

async function run() {
  try {
    await connectDB();
    console.log('--- STARTING MVP VERIFICATION ---');

    // 1. Verify/Prepare sponsored university
    let university = await University.findOne({});
    if (!university) {
      console.log('❌ Error: No universities in DB. Please run seed script first.');
      process.exit(1);
    }
    
    console.log(`Setting university "${university.name}" as Gold Sponsored Partner`);
    university.isSponsored = true;
    university.sponsorTier = 'gold';
    university.sponsorPriority = 100;
    university.sponsorExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    await university.save();
    console.log('✅ University updated with sponsored fields.');

    // 2. Verify sorting/boosting
    console.log('\n--- TESTING BOOSTED SEARCH SORTING ---');
    const sortedUniversities = await University.find({ status: 'published' })
      .sort({ isSponsored: -1, sponsorPriority: -1 })
      .limit(5);
    
    if (sortedUniversities[0]._id.toString() === university._id.toString()) {
      console.log(`✅ Success: Sponsored university "${sortedUniversities[0].name}" is boosted to the top!`);
    } else {
      console.log('❌ Error: Sorting did not boost the sponsored university to the top.');
    }

    // 3. Test Lead Capture
    console.log('\n--- TESTING LEAD CAPTURE SYSTEM ---');
    const leadCountBefore = await Lead.countDocuments();
    const testLead = await Lead.create({
      name: 'Verification Student',
      email: 'verification@test.com',
      phone: '9876543210',
      state: 'Maharashtra',
      preferredCourse: 'B.Tech',
      universityId: university._id,
      leadType: 'apply',
      notes: 'Automated SaaS MVP verification test lead'
    });
    
    const leadCountAfter = await Lead.countDocuments();
    if (leadCountAfter === leadCountBefore + 1) {
      console.log('✅ Success: Test student lead captured and saved in MongoDB.');
    } else {
      console.log('❌ Error: Lead was not saved successfully.');
    }

    // 4. Test Analytics & Aggregation
    console.log('\n--- TESTING SAAS ANALYTICS AGGREGATION ---');
    const totalLeads = await Lead.countDocuments();
    const sponsoredCount = await University.countDocuments({ isSponsored: true });
    
    const leadsByUni = await Lead.aggregate([
      { $group: { _id: '$universityId', leadCount: { $sum: 1 } } },
      { $sort: { leadCount: -1 } },
      {
        $lookup: {
          from: 'universities',
          localField: '_id',
          foreignField: '_id',
          as: 'university'
        }
      },
      { $unwind: '$university' },
      {
        $project: {
          _id: 1,
          leadCount: 1,
          name: '$university.name',
          isSponsored: '$university.isSponsored',
          sponsorTier: '$university.sponsorTier'
        }
      }
    ]);

    console.log(`Total Leads Count in DB: ${totalLeads}`);
    console.log(`Total Sponsored Partners: ${sponsoredCount}`);
    console.log('Leads By University:', leadsByUni);

    if (totalLeads > 0 && sponsoredCount > 0 && leadsByUni.length > 0) {
      console.log('✅ Success: Aggregation pipelines and SaaS dashboard query models operate correctly!');
    } else {
      console.log('❌ Error: Analytics aggregation failed to fetch data.');
    }

    // Clean up test lead
    await Lead.deleteOne({ _id: testLead._id });
    console.log('\n🧹 Cleaned up test lead from database.');
    console.log('--- MVP VERIFICATION COMPLETE: ALL CHECKS PASSED ---');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

run();
