/**
 * Creates a ready-to-use university account for local testing, and prints an
 * access token for it.
 *
 * Exists because the real path to a working university session is deliberately
 * long: sign up, verify an emailed code, wait for an admin to approve the claim,
 * then log in and clear an emailed OTP. That is correct for production and
 * useless for poking at the dashboard API on a laptop — especially since the
 * OTP would be sent to whatever fake address the tester invented.
 *
 * So this bypasses the gates it is not testing (email delivery, human review)
 * and hands back a token, leaving the thing under test — tenancy — untouched.
 * The account it produces is an ordinary tenant with no special powers.
 *
 *   node scripts/demoUniversityAccount.js            # create / reuse + print token
 *   node scripts/demoUniversityAccount.js --cleanup  # delete everything it made
 *
 * SAFETY: only ever touches records whose name/email carry the DEMO_ prefix.
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const University = require('../src/models/University');
const Course = require('../src/models/Course');
const { signAccessToken } = require('../src/utils/tokenService');

const DEMO_UNIVERSITY_NAME = 'DEMO_ Sunrise Private University';
const DEMO_SLUG = 'demo-sunrise-private-university';
const DEMO_OWNER_EMAIL = 'demo_owner@demo-sunrise.example.edu.in';
const DEMO_MEMBER_EMAIL = 'demo_member@demo-sunrise.example.edu.in';
const DEMO_PASSWORD = 'Demo-Sunrise-Pass!42';

const PORT = process.env.PORT || 5001;
const BASE = `http://localhost:${PORT}/api/v1/university-portal`;

const cleanup = async () => {
  const uni = await University.findOne({ slug: DEMO_SLUG });

  if (uni) {
    const courses = await Course.deleteMany({ universityId: uni._id });
    console.log(`Deleted ${courses.deletedCount} demo course(s).`);
    await University.deleteOne({ _id: uni._id });
    console.log('Deleted demo university.');
  }

  const users = await User.deleteMany({ email: { $in: [DEMO_OWNER_EMAIL, DEMO_MEMBER_EMAIL] } });
  console.log(`Deleted ${users.deletedCount} demo user(s).`);
  console.log('\nDemo data removed.');
};

const setup = async () => {
  let university = await University.findOne({ slug: DEMO_SLUG });

  if (!university) {
    university = await University.create({
      name: DEMO_UNIVERSITY_NAME,
      slug: DEMO_SLUG,
      // draft keeps it out of the public listing, so a demo record cannot end up
      // on the live site while someone is testing.
      status: 'draft',
      type: 'private',
      state: 'Maharashtra',
      city: 'Pune',
      website: 'https://demo-sunrise.example.edu.in',
      description: 'A demo university used for local testing.',
    });
    console.log('Created demo university.');
  } else {
    console.log('Reusing existing demo university.');
  }

  let owner = await User.findOne({ email: DEMO_OWNER_EMAIL });

  if (!owner) {
    owner = new User({
      name: 'Demo Registrar',
      email: DEMO_OWNER_EMAIL,
      password: DEMO_PASSWORD,
      role: 'university',
      authProvider: 'local',
      status: 'active',
    });
    console.log('Created demo owner account.');
  }

  // The two gates this script deliberately skips.
  owner.isEmailVerified = true;
  owner.universityId = university._id;
  owner.universityRole = 'owner';
  await owner.save();

  const token = signAccessToken(owner);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  DEMO UNIVERSITY ACCOUNT READY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  University : ${university.name}`);
  console.log(`  ID         : ${university._id}`);
  console.log(`  Email      : ${DEMO_OWNER_EMAIL}`);
  console.log(`  Password   : ${DEMO_PASSWORD}`);
  console.log('\n  ACCESS TOKEN (valid ~15 minutes):\n');
  console.log(token);
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('  Try it:\n');
  console.log(`  curl -H "Authorization: Bearer <TOKEN>" ${BASE}/my-university`);
  console.log('');
  console.log(`  curl -X PUT ${BASE}/my-university \\`);
  console.log('    -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \\');
  console.log('    -d \'{"description":"Edited locally","stats":{"avgPackageLPA":99}}\'');
  console.log('');
  console.log('  The description saves immediately; avgPackageLPA is queued for');
  console.log('  admin review. The response reports both separately.');
  console.log('\n  Re-run this script for a fresh token when it expires.');
  console.log('  node scripts/demoUniversityAccount.js --cleanup  removes all of it.');
  console.log('═══════════════════════════════════════════════════════════════\n');
};

const main = async () => {
  await connectDB();

  if (process.argv.includes('--cleanup')) {
    await cleanup();
  } else {
    await setup();
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('Failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* already closed */
  }
  process.exitCode = 1;
});
