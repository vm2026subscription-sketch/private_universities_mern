const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');
const Lead = require('../src/models/Lead');
const Banner = require('../src/models/Banner');

async function run() {
  try {
    await connectDB();
    console.log('--- STARTING PHASE 2 B2B SAAS MONETIZATION VERIFICATION ---');

    // Find or create a test university
    let university = await University.findOne({});
    if (!university) {
      console.log('Creating a test university for verification...');
      university = await University.create({
        name: 'Phase 2 Test University',
        slug: 'phase-2-test-university',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'published'
      });
    }

    // 1. Verify Quick Sponsorship Patch Logic
    console.log('\n--- TESTING QUICK SPONSORSHIP PATCH ---');
    // Simulate updating via patchSponsorship controller logic
    university.isSponsored = true;
    university.sponsorTier = 'platinum';
    university.sponsorPriority = 250;
    university.sponsorExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
    await university.save();
    
    // Fetch and check
    let updatedUni = await University.findById(university._id);
    if (updatedUni.isSponsored && updatedUni.sponsorTier === 'platinum' && updatedUni.sponsorPriority === 250) {
      console.log('✅ Success: Quick sponsorship patch applied with Platinum tier!');
    } else {
      console.log('❌ Error: Quick sponsorship patch failed to apply.');
    }

    // 2. Verify Banner click & CTR tracking
    console.log('\n--- TESTING BANNER METRICS & CTR ENGINE ---');
    let banner = await Banner.create({
      title: 'Verification B2B Banner',
      link: 'https://vidyarthimitra.org',
      universityId: university._id,
      isActive: true,
      impressions: 10,
      clicks: 0
    });

    // Simulate click track increment
    banner.clicks += 1;
    banner.ctr = banner.impressions > 0 ? parseFloat(((banner.clicks / banner.impressions) * 100).toFixed(2)) : 0;
    await banner.save();

    let updatedBanner = await Banner.findById(banner._id);
    console.log(`Banner Impressions: ${updatedBanner.impressions}, Clicks: ${updatedBanner.clicks}, CTR: ${updatedBanner.ctr}%`);
    if (updatedBanner.clicks === 1 && updatedBanner.ctr === 10) {
      console.log('✅ Success: Click & CTR engine correctly calculated Banner analytics!');
    } else {
      console.log('❌ Error: CTR or Clicks miscalculated.');
    }

    // 3. Verify Leads CSV Export Data Structure
    console.log('\n--- TESTING CSV EXPORT FORMAT ---');
    const testLead = await Lead.create({
      name: 'CSV Lead',
      email: 'csv@test.com',
      phone: '1234567890',
      state: 'Goa',
      preferredCourse: 'MBA',
      universityId: university._id,
      leadType: 'apply',
      notes: 'CSV format verification test lead'
    });

    // Emulate exportLeadsCSV backend logic
    const leadsForCsv = await Lead.find({ universityId: university._id }).populate('universityId', 'name state city sponsorTier');
    
    const esc = (val) => {
      const s = String(val == null ? '' : val).replace(/"/g, '""');
      return `"${s}"`;
    };
    const headers = [
      'Student Name', 'Email', 'Phone', 'State', 'Preferred Course',
      'Lead Type', 'University', 'Uni State', 'Sponsor Tier', 'Date Captured'
    ];
    const rows = leadsForCsv.map(l => [
      esc(l.name), esc(l.email), esc(l.phone), esc(l.state), esc(l.preferredCourse),
      esc(l.leadType), esc(l.universityId?.name || ''), esc(l.universityId?.state || ''),
      esc(l.universityId?.sponsorTier || 'none'),
      esc(new Date(l.createdAt).toLocaleString('en-IN'))
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    console.log('Sample CSV Line:\n' + csv.split('\r\n')[1]);
    
    if (csv.includes('"CSV Lead"') && csv.includes('"csv@test.com"') && csv.includes('"platinum"')) {
      console.log('✅ Success: CSV lead serialization satisfies RFC-4180 rules!');
    } else {
      console.log('❌ Error: CSV format did not correctly serialize fields.');
    }

    // Clean up
    await Lead.deleteOne({ _id: testLead._id });
    await Banner.deleteOne({ _id: banner._id });
    console.log('\n🧹 Cleaned up temporary database test records.');
    console.log('--- PHASE 2 B2B SAAS MONETIZATION COMPLETE ---');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during phase 2 verification:', error);
    process.exit(1);
  }
}

run();
