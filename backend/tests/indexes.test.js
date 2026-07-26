/**
 * Verifies the index declarations on every schema.
 *
 * These are the indexes `npm run indexes:ensure` builds. Asserting them here
 * means an index cannot be silently dropped by a future edit to a model — the
 * queries they back (documented in each model) would quietly start scanning.
 *
 * No database connection is needed: schema.indexes() reads the declarations.
 */

const assert = require('assert');
const { test, section } = require('./helpers');

const MODELS = [
  'AuditLog', 'Banner', 'ContactSubmission', 'Course', 'Exam', 'FAQ', 'Lead',
  'News', 'Newsletter', 'Notification', 'OtpLog', 'Page', 'Question', 'Session',
  'SiteSetting', 'Testimonial', 'University', 'User',
];

// Loaded at module scope on purpose: the models need mongoose, and requiring
// them here means a missing dependency surfaces as MODULE_NOT_FOUND while the
// suite is being loaded, so run.js skips the whole suite. Requiring them lazily
// inside a test instead turned one missing package into 39 confusing failures.
const SCHEMAS = Object.fromEntries(
  MODELS.map((name) => [name, require(`../src/models/${name}`).schema])
);

/** Indexes that must exist, with the query each one serves. */
const REQUIRED = {
  University: [
    [{ name: 1, state: 1 }, 'import matching (universityMatching) and bulk-import lookup'],
    [{ status: 1, isSponsored: -1, sponsorPriority: -1, nirfRank: 1 }, 'default university listing sort'],
    [{ views: -1 }, 'trending + top-viewed reports'],
    [{ updatedAt: -1 }, 'admin content listing'],
    [{ 'admissions.acceptedExams': 1 }, '?entranceExam filter'],
    [{ status: 1, 'seo.indexStatus': 1 }, 'sitemap filter'],
    // pre-existing, must not regress
    [{ state: 1, type: 1, naacGrade: 1 }, 'existing filter index'],
    [{ isSponsored: -1, sponsorPriority: -1 }, 'existing sponsor sort'],
    [{ status: 1, segment: 1, institutionKind: 1 }, 'existing segment filter'],
  ],
  Course: [
    [{ universityId: 1, baseCourse: 1, specializationName: 1 }, 'per-row Excel import dedup lookup'],
    [{ universityId: 1, name: 1 }, 'bulk course import dedup lookup'],
    [{ feesPerYear: 1 }, 'fee-range filter and fee sorting'],
    [{ category: 1, feesPerYear: 1 }, 'category + fee-range distinct()'],
    [{ updatedAt: -1 }, 'admin content listing'],
    [{ universityId: 1 }, 'existing index'],
  ],
  News: [
    [{ publishedAt: -1 }, 'news feed sort'],
    [{ category: 1, publishedAt: -1 }, 'category-filtered feed'],
    [{ isFeatured: 1, publishedAt: -1 }, 'featured strip'],
  ],
  Exam: [
    [{ examDate: 1 }, 'exam listing sort and upcoming filter'],
    [{ category: 1, examDate: 1 }, 'category-filtered exams'],
    [{ scope: 1, state: 1, examDate: 1 }, 'scope/state-filtered exams'],
  ],
  Lead: [
    [{ createdAt: -1 }, 'unfiltered lead list and CSV export'],
    [{ universityId: 1, leadType: 1 }, 'per-partner apply/brochure counts'],
    [{ universityId: 1, createdAt: -1 }, 'existing index'],
  ],
  ContactSubmission: [[{ createdAt: -1 }, 'unfiltered admin list']],
  Newsletter: [[{ createdAt: -1 }, 'subscriber list sort']],
  Banner: [
    [{ isActive: 1, page: 1, position: 1, priority: -1 }, 'public active-banner query'],
    [{ impressions: -1 }, 'banner analytics sort'],
  ],
  FAQ: [[{ isPublished: 1, order: 1 }, 'public FAQ list']],
  Page: [[{ order: 1, createdAt: -1 }, 'admin page list']],
  Question: [
    [{ createdAt: -1 }, 'unfiltered community feed'],
    [{ category: 1, createdAt: -1 }, 'existing index'],
  ],
  AuditLog: [[{ createdAt: -1 }, 'unfiltered audit log view']],
  User: [
    [{ createdAt: -1 }, 'admin user list'],
    [{ role: 1, status: 1 }, 'dashboard role counts'],
    [{ isEmailVerified: 1 }, 'dashboard verification count'],
  ],
  Notification: [[{ createdAt: -1 }, 'admin notification list']],
  Testimonial: [[{ isApproved: 1, isFeatured: -1, createdAt: -1 }, 'public approved testimonials']],
};

module.exports = async () => {
  const declared = Object.fromEntries(
    Object.entries(SCHEMAS).map(([name, schema]) => [
      name,
      schema.indexes().map(([keys]) => JSON.stringify(keys)),
    ])
  );

  section('schema index declarations');

  await test('every model was loaded', () => {
    assert.strictEqual(Object.keys(declared).length, MODELS.length);
  });

  for (const [model, expectations] of Object.entries(REQUIRED)) {
    for (const [keys, why] of expectations) {
      await test(`${model} indexes ${JSON.stringify(keys)} (${why})`, () => {
        assert.ok(
          declared[model].includes(JSON.stringify(keys)),
          `declared indexes are:\n       ${declared[model].join('\n       ')}`
        );
      });
    }
  }

  await test('no model declares the same index twice', () => {
    const duplicates = [];
    for (const [model, list] of Object.entries(declared)) {
      const seen = new Set();
      list.forEach((key) => {
        if (seen.has(key)) duplicates.push(`${model} ${key}`);
        seen.add(key);
      });
    }
    assert.deepStrictEqual(duplicates, []);
  });
};
