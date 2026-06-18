const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');
const { createUniversity, updateUniversity } = require('../src/controllers/adminController');

// Helper to mock Express req and res
function mockResponse() {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
}

async function run() {
  try {
    await connectDB();
    console.log('--- STARTING ROLE ACCESS VERIFICATION FOR SPONSORSHIP ---');

    // Clean up any old test universities first
    await University.deleteMany({ name: /Role Test Uni/ });

    // 1. Test creation by an ADMIN (role: admin)
    console.log('\nTesting University Creation by ADMIN role:');
    const reqAdminCreate = {
      user: { role: 'admin' },
      body: {
        name: 'Role Test Uni AdminCreated',
        state: 'Maharashtra',
        city: 'Pune',
        isSponsored: true,
        sponsorTier: 'gold',
        sponsorPriority: 99,
        sponsorExpiry: new Date()
      }
    };
    const resAdminCreate = mockResponse();
    await createUniversity(reqAdminCreate, resAdminCreate);

    const createdAdminUni = resAdminCreate.body.data;
    if (createdAdminUni) {
      console.log(`University Created: "${createdAdminUni.name}"`);
      console.log(`isSponsored = ${createdAdminUni.isSponsored} (Expected: false)`);
      console.log(`sponsorTier = ${createdAdminUni.sponsorTier} (Expected: none)`);
      
      if (!createdAdminUni.isSponsored && createdAdminUni.sponsorTier === 'none') {
        console.log('✅ Success: Admin was blocked from assigning sponsorship fields on creation.');
      } else {
        console.log('❌ Failure: Admin was allowed to set sponsorship fields on creation.');
      }
    } else {
      console.log('❌ Failure:', resAdminCreate.body);
    }

    // 2. Test creation by a SUPERADMIN (role: superadmin)
    console.log('\nTesting University Creation by SUPERADMIN role:');
    const reqSuperCreate = {
      user: { role: 'superadmin' },
      body: {
        name: 'Role Test Uni SuperCreated',
        state: 'Maharashtra',
        city: 'Pune',
        isSponsored: true,
        sponsorTier: 'gold',
        sponsorPriority: 100,
        sponsorExpiry: new Date(Date.now() + 1000 * 60 * 60)
      }
    };
    const resSuperCreate = mockResponse();
    await createUniversity(reqSuperCreate, resSuperCreate);

    const createdSuperUni = resSuperCreate.body.data;
    if (createdSuperUni) {
      console.log(`University Created: "${createdSuperUni.name}"`);
      console.log(`isSponsored = ${createdSuperUni.isSponsored} (Expected: true)`);
      console.log(`sponsorTier = ${createdSuperUni.sponsorTier} (Expected: gold)`);
      
      if (createdSuperUni.isSponsored && createdSuperUni.sponsorTier === 'gold') {
        console.log('✅ Success: Superadmin successfully set sponsorship fields.');
      } else {
        console.log('❌ Failure: Superadmin was blocked from setting sponsorship fields.');
      }
    } else {
      console.log('❌ Failure:', resSuperCreate.body);
    }

    // 3. Test update of an existing sponsored university by an ADMIN
    console.log('\nTesting University Update (adding sponsorship) by ADMIN role on organic university:');
    // Let's try to update "Role Test Uni AdminCreated" to isSponsored: true as an admin
    const reqAdminUpdate = {
      user: { role: 'admin' },
      params: { id: createdAdminUni._id },
      body: {
        name: 'Role Test Uni AdminCreated (Modified)',
        isSponsored: true,
        sponsorTier: 'gold',
        sponsorPriority: 50
      }
    };
    const resAdminUpdate = mockResponse();
    await updateUniversity(reqAdminUpdate, resAdminUpdate);

    const updatedAdminUni = resAdminUpdate.body.data;
    if (updatedAdminUni) {
      console.log(`isSponsored = ${updatedAdminUni.isSponsored} (Expected: false)`);
      if (!updatedAdminUni.isSponsored) {
        console.log('✅ Success: Admin was blocked from updating sponsorship status.');
      } else {
        console.log('❌ Failure: Admin successfully updated sponsorship.');
      }
    } else {
      console.log('❌ Failure:', resAdminUpdate.body);
    }

    // 4. Test update of an existing sponsored university by a SUPERADMIN
    console.log('\nTesting University Update (modifying sponsorship) by SUPERADMIN:');
    const reqSuperUpdate = {
      user: { role: 'superadmin' },
      params: { id: createdAdminUni._id },
      body: {
        name: 'Role Test Uni AdminCreated (Modified by Super)',
        isSponsored: true,
        sponsorTier: 'silver',
        sponsorPriority: 10
      }
    };
    const resSuperUpdate = mockResponse();
    await updateUniversity(reqSuperUpdate, resSuperUpdate);

    const updatedSuperUni = resSuperUpdate.body.data;
    if (updatedSuperUni) {
      console.log(`isSponsored = ${updatedSuperUni.isSponsored} (Expected: true)`);
      console.log(`sponsorTier = ${updatedSuperUni.sponsorTier} (Expected: silver)`);
      if (updatedSuperUni.isSponsored && updatedSuperUni.sponsorTier === 'silver') {
        console.log('✅ Success: Superadmin successfully updated sponsorship details.');
      } else {
        console.log('❌ Failure: Superadmin was blocked from updating sponsorship.');
      }
    } else {
      console.log('❌ Failure:', resSuperUpdate.body);
    }

    // Clean up
    await University.deleteMany({ name: /Role Test Uni/ });
    console.log('\n🧹 Cleaned up test data.');
    console.log('--- ALL ROLE CHECKS COMPLETED ---');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during role checks:', error);
    process.exit(1);
  }
}

run();
