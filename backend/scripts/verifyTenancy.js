/**
 * Tenancy verification — the acceptance test for university isolation.
 *
 * Proves the one property the portal cannot be shipped without: a university
 * account can reach its own record and nothing else. Every case below is written
 * from the attacker's side — "here is how University A would try to reach
 * University B" — because a test that only exercises the happy path cannot tell
 * you whether the guard works, only that it does not fire when it shouldn't.
 *
 *   node scripts/verifyTenancy.js
 *
 * SAFETY: every document this script creates is tracked by _id and deleted by
 * _id at the end. It never issues a broad delete, and it never touches a record
 * it did not create — so it is safe to point at a database with real data.
 */

const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const University = require('../src/models/University');
const UniversityClaim = require('../src/models/UniversityClaim');
const { roleRank, requireRole } = require('../src/middleware/auth');
const {
  requireUniversityAccess,
  requireUniversityOwner,
  rejectUniversityIdInPayload,
  stripPlatformControlledFields,
} = require('../src/middleware/universityTenancy');
const { removeTeamMember } = require('../src/controllers/universityPortalController');
const {
  updateMyUniversity,
  addGalleryImages,
  approveChanges,
} = require('../src/controllers/universityProfileController');
const { classifyUpdate } = require('../src/config/universityEditPolicy');

/* ── Harness ──────────────────────────────────────────────────────────────── */

const created = { users: [], universities: [], claims: [] };
const results = [];
const RUN = crypto.randomBytes(4).toString('hex');

const mockRes = () => {
  const res = { statusCode: null, body: null, finished: false };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    res.finished = true;
    return res;
  };
  return res;
};

/** Runs a middleware/handler and reports whether it allowed the request. */
const run = async (handler, req) => {
  const res = mockRes();
  let passedThrough = false;
  await handler(req, res, () => {
    passedThrough = true;
  });
  return { allowed: passedThrough && !res.finished, status: res.statusCode, body: res.body, req };
};

const check = (name, passed, detail) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? '  PASS' : '  FAIL'}  ${name}${detail ? `\n        ${detail}` : ''}`);
};

/* ── Fixtures ─────────────────────────────────────────────────────────────── */

const makeUniversity = async (label) => {
  const uni = await University.create({
    name: `ZZ Tenancy Test ${label} ${RUN}`,
    slug: `zz-tenancy-test-${label.toLowerCase()}-${RUN}`,
    status: 'draft', // keeps state/city optional and keeps it out of public listings
    type: 'private',
    website: `https://${label.toLowerCase()}-${RUN}.example.edu.in`,
  });
  created.universities.push(uni._id);
  return uni;
};

const makeUser = async (attrs) => {
  const user = await User.create({
    email: `zz-tenancy-${attrs.label}-${RUN}@example.com`,
    name: `Tenancy ${attrs.label}`,
    password: 'Str0ng-Tenancy-Pass!42',
    isEmailVerified: true,
    status: 'active',
    ...attrs.fields,
  });
  created.users.push(user._id);
  return user;
};

/* ── Scenarios ────────────────────────────────────────────────────────────── */

const run_scenarios = async ({ uniA, uniB, ownerA, memberA, ownerB, applicant, student }) => {
  console.log('\n── 1. Session-derived targeting ───────────────────────────────');

  const aAccess = await run(requireUniversityAccess, { user: ownerA, body: {} });
  check(
    'Owner A resolves to University A',
    aAccess.allowed && String(aAccess.req.university?._id) === String(uniA._id),
    aAccess.allowed ? `resolved: ${aAccess.req.university?.name}` : `denied ${aAccess.status}`
  );

  check(
    'Owner A never resolves to University B',
    String(aAccess.req.university?._id) !== String(uniB._id)
  );

  const bAccess = await run(requireUniversityAccess, { user: ownerB, body: {} });
  check(
    'Owner B resolves to University B',
    bAccess.allowed && String(bAccess.req.university?._id) === String(uniB._id)
  );

  console.log('\n── 2. Tampering with the request payload ──────────────────────');

  const idInBody = await run(rejectUniversityIdInPayload, {
    user: ownerA,
    body: { universityId: String(uniB._id), description: 'takeover' },
  });
  check(
    'A supplying universityId=B in the body is rejected',
    !idInBody.allowed && idInBody.status === 400,
    `status ${idInBody.status}`
  );

  const idInQuery = await run(rejectUniversityIdInPayload, {
    user: ownerA,
    body: {},
    query: { universityId: String(uniB._id) },
  });
  check(
    'A supplying universityId=B in the query string is rejected',
    !idInQuery.allowed && idInQuery.status === 400
  );

  // The decisive case: even WITH a forged id present, targeting still comes from
  // the session. This is what makes the whole class of bug unreachable.
  const forged = await run(requireUniversityAccess, {
    user: ownerA,
    body: { universityId: String(uniB._id), _id: String(uniB._id) },
  });
  check(
    'Forged ids are ignored — targeting still comes from the session',
    String(forged.req.university?._id) === String(uniA._id),
    `resolved: ${forged.req.university?.name}`
  );

  console.log('\n── 3. Accounts without tenancy ────────────────────────────────');

  const applicantAccess = await run(requireUniversityAccess, { user: applicant, body: {} });
  check(
    'Unapproved applicant is denied',
    !applicantAccess.allowed && applicantAccess.status === 403,
    `code: ${applicantAccess.body?.code}`
  );
  check(
    'Denial is distinguishable so the UI can explain why',
    applicantAccess.body?.code === 'CLAIM_NOT_APPROVED'
  );

  const studentAccess = await run(requireUniversityAccess, { user: student, body: {} });
  check(
    'Student account is denied the university area',
    !studentAccess.allowed && studentAccess.status === 403
  );

  console.log('\n── 4. Owner vs member ─────────────────────────────────────────');

  const memberOwnerCheck = await run(requireUniversityOwner, { user: memberA });
  check(
    'Member cannot perform owner-only actions (invite)',
    !memberOwnerCheck.allowed && memberOwnerCheck.status === 403
  );

  const ownerOwnerCheck = await run(requireUniversityOwner, { user: ownerA });
  check('Owner can perform owner-only actions', ownerOwnerCheck.allowed);

  console.log('\n── 5. Cross-tenant writes through a real handler ──────────────');

  // Owner B tries to remove a team member belonging to University A.
  const crossRemove = mockRes();
  await removeTeamMember(
    { user: ownerB, university: uniB, params: { userId: String(memberA._id) } },
    crossRemove
  );
  check(
    'Owner B cannot remove a member of University A',
    crossRemove.statusCode === 404,
    `status ${crossRemove.statusCode} — ${crossRemove.body?.message}`
  );

  const stillThere = await User.findById(memberA._id);
  check(
    'Member A still belongs to University A afterwards',
    String(stillThere.universityId) === String(uniA._id)
  );

  console.log('\n── 6. Platform-controlled fields ──────────────────────────────');

  const stripReq = {
    user: ownerA,
    body: { description: 'legit', isSponsored: true, sponsorTier: 'platinum', status: 'published' },
  };
  await run(stripPlatformControlledFields, stripReq);
  check(
    'Self-granted sponsorship is stripped',
    !('isSponsored' in stripReq.body) && !('sponsorTier' in stripReq.body)
  );
  check('Publication status is stripped', !('status' in stripReq.body));
  check('Legitimate fields survive', stripReq.body.description === 'legit');

  console.log('\n── 7. Role ladder isolation ───────────────────────────────────');

  check(
    'university is absent from the privilege ladder',
    roleRank('university') === -1,
    `roleRank('university') = ${roleRank('university')}`
  );

  const uniHitsAdmin = await run(requireRole('admin'), { user: ownerA });
  check('University account cannot reach admin routes', !uniHitsAdmin.allowed && uniHitsAdmin.status === 403);

  const uniHitsUser = await run(requireRole('user'), { user: ownerA });
  check('University account cannot reach student routes', !uniHitsUser.allowed);

  const uniHitsOwn = await run(requireRole('university', { exact: true }), { user: ownerA });
  check('University account CAN reach its own routes', uniHitsOwn.allowed);

  const adminHitsUniExact = await run(requireRole('university', { exact: true }), {
    user: { role: 'admin' },
  });
  check(
    'Admin does not inherit tenant routes via the ladder',
    !adminHitsUniExact.allowed,
    'exact matching prevents an admin being treated as a tenant'
  );

  console.log('\n── 8. Edit policy classification ──────────────────────────────');

  const split = classifyUpdate({
    description: 'We are a great university',
    vision: 'To lead',
    campus: { hostelDetails: 'AC rooms' },
    stats: { avgPackageLPA: 99, placementPercentage: 100, rating: 5 },
    naacGrade: 'A++',
    isSponsored: true,
    slug: 'hijacked-slug',
  });

  check(
    'Narrative fields go live immediately',
    ['description', 'vision', 'campus.hostelDetails'].every((f) => f in split.selfServe)
  );
  check(
    'Placement and accreditation claims are held for review',
    ['stats.avgPackageLPA', 'stats.placementPercentage', 'naacGrade'].every((f) => f in split.review),
    'a university cannot publish its own placement numbers unchecked'
  );
  check(
    'Sponsorship and slug are refused outright',
    split.rejected.includes('isSponsored') && split.rejected.includes('slug')
  );
  check(
    'Student-owned rating is not editable by the university',
    split.rejected.includes('stats.rating')
  );
  check(
    'Unknown fields fail closed rather than passing through',
    classifyUpdate({ somethingNewInTheSchema: 'x' }).rejected.includes('somethingNewInTheSchema')
  );

  console.log('\n── 9. Editing writes only to the caller\'s own record ──────────');

  const editRes = mockRes();
  await updateMyUniversity(
    {
      user: ownerA,
      university: await University.findById(uniA._id),
      body: { description: 'Edited by A', stats: { avgPackageLPA: 42 } },
    },
    editRes
  );

  const afterA = await University.findById(uniA._id);
  const afterB = await University.findById(uniB._id);

  check('A\'s self-serve edit applied to A', afterA.description === 'Edited by A');
  check('B is completely untouched by A\'s edit', afterB.description !== 'Edited by A');
  check(
    'A\'s placement claim did NOT go live',
    afterA.stats?.avgPackageLPA !== 42,
    'queued instead of published'
  );
  check(
    'A\'s placement claim is queued for review',
    afterA.pendingChanges?.data?.['stats.avgPackageLPA'] === 42
  );
  check(
    'Public visibility is unaffected by a pending review',
    afterA.status !== 'needs_review',
    'status stays as-is, so the public page is never pulled from listings'
  );

  console.log('\n── 10. Moderation ─────────────────────────────────────────────');

  const approveRes = mockRes();
  await approveChanges(
    { user: { _id: ownerB._id, role: 'admin' }, params: { id: String(uniA._id) }, body: {} },
    approveRes
  );

  const approved = await University.findById(uniA._id);
  check('Approving publishes the queued value', approved.stats?.avgPackageLPA === 42);
  check('Queue is emptied after approval', !approved.pendingChanges?.data);

  console.log('\n── 11. Gallery is per-tenant ──────────────────────────────────');

  const galleryRes = mockRes();
  await addGalleryImages(
    {
      user: ownerA,
      university: await University.findById(uniA._id),
      body: { images: ['https://res.cloudinary.com/x/a1.jpg', 'https://res.cloudinary.com/x/a1.jpg'] },
    },
    galleryRes
  );

  const galleryA = await University.findById(uniA._id);
  const galleryB = await University.findById(uniB._id);
  check('Gallery image saved to A', (galleryA.campus?.galleryImages || []).length === 1);
  check('Duplicate submission does not double up', (galleryA.campus?.galleryImages || []).length === 1);
  check('B\'s gallery stays empty', (galleryB.campus?.galleryImages || []).length === 0);

  const badUrlRes = mockRes();
  await addGalleryImages(
    {
      user: ownerA,
      university: await University.findById(uniA._id),
      body: { images: ['javascript:alert(1)'] },
    },
    badUrlRes
  );
  check('Non-https image URLs are refused', badUrlRes.statusCode === 400);

  console.log('\n── 12. Revocation takes effect immediately ────────────────────');

  ownerB.universityId = undefined;
  ownerB.universityRole = undefined;
  await ownerB.save();

  const revoked = await run(requireUniversityAccess, {
    user: await User.findById(ownerB._id),
    body: {},
  });
  check(
    'Revoked owner is denied on the very next request',
    !revoked.allowed && revoked.status === 403,
    'tenancy is re-read from the database, never trusted from the token'
  );
};

/* ── Entry point ──────────────────────────────────────────────────────────── */

const cleanup = async () => {
  // Strictly by the ids this run created. No filters, no regex, no deleteMany
  // over a query that could match anything pre-existing.
  if (created.claims.length) await UniversityClaim.deleteMany({ _id: { $in: created.claims } });
  if (created.users.length) await User.deleteMany({ _id: { $in: created.users } });
  if (created.universities.length) await University.deleteMany({ _id: { $in: created.universities } });
};

const main = async () => {
  await connectDB();
  console.log(`\nTenancy verification — run ${RUN}`);

  try {
    const uniA = await makeUniversity('Alpha');
    const uniB = await makeUniversity('Bravo');

    const ownerA = await makeUser({
      label: 'owner-a',
      fields: { role: 'university', universityId: uniA._id, universityRole: 'owner' },
    });
    const memberA = await makeUser({
      label: 'member-a',
      fields: { role: 'university', universityId: uniA._id, universityRole: 'member' },
    });
    const ownerB = await makeUser({
      label: 'owner-b',
      fields: { role: 'university', universityId: uniB._id, universityRole: 'owner' },
    });
    const applicant = await makeUser({
      label: 'applicant',
      fields: { role: 'university' }, // approved? no — universityId deliberately unset
    });
    const student = await makeUser({ label: 'student', fields: { role: 'user' } });

    const claim = await UniversityClaim.create({
      user: applicant._id,
      university: uniB._id,
      contactPerson: 'Tenancy Applicant',
      designation: 'Registrar',
      officialEmail: applicant.email,
      phone: '9000000000',
      emailSignal: 'free',
      emailDomain: 'example.com',
      status: 'pending',
    });
    created.claims.push(claim._id);

    await run_scenarios({ uniA, uniB, ownerA, memberA, ownerB, applicant, student });
  } finally {
    await cleanup();
  }

  const failed = results.filter((r) => !r.passed);
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log(`${results.length - failed.length}/${results.length} checks passed`);

  if (failed.length) {
    console.log('\nFAILED:');
    failed.forEach((f) => console.log(`  - ${f.name}`));
    console.log('\nTENANCY IS NOT SAFE. Do not ship the university portal.');
    process.exitCode = 1;
  } else {
    console.log('Tenancy isolation holds: a university account can reach only its own record.');
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('\nVerification crashed:', error);
  try {
    await cleanup();
    await mongoose.disconnect();
  } catch (cleanupError) {
    console.error('Cleanup also failed — check for leftover "ZZ Tenancy Test" records:', cleanupError.message);
  }
  process.exitCode = 1;
});
