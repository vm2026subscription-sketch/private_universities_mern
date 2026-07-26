/**
 * Model-level regression tests. Uses real mongoose document construction and
 * validation — no database connection is opened.
 *
 * The slug case here is a genuine bug that was found by running the importers
 * against a live datastore: University's pre('save') hook regenerated the slug
 * from the name for any new document, overwriting the collision-free slug that
 * utils/slug.buildUniqueSlug had just computed. Creating a second university
 * whose name slugifies identically — the same institution name in a different
 * state, which is exactly what the name+state import fix now does — therefore
 * failed on the unique index with E11000.
 */

const assert = require('assert');
const { test, section } = require('./helpers');

const University = require('../src/models/University');
const Course = require('../src/models/Course');

/** Runs the schema's validate hooks + validators without touching a database. */
const validate = async (doc) => {
  try {
    await doc.validate();
    return null;
  } catch (error) {
    return error;
  }
};

module.exports = async () => {
  section('University slug generation');

  /** A stand-in for a mongoose document's isModified(). */
  const doc = (...modified) => ({ isModified: (path) => modified.includes(path) });

  await test('regenerates the slug when only the name changed', () => {
    assert.strictEqual(University.shouldRegenerateSlug(doc('name')), true);
  });

  await test('does NOT overwrite a slug the caller set deliberately', () => {
    // This is the bug: buildUniqueSlug computes 'sanskriti-university-2' because
    // 'sanskriti-university' is taken, and the hook used to clobber it -> E11000.
    assert.strictEqual(University.shouldRegenerateSlug(doc('name', 'slug')), false);
  });

  await test('leaves the slug alone when the name did not change', () => {
    assert.strictEqual(University.shouldRegenerateSlug(doc('city')), false);
    assert.strictEqual(University.shouldRegenerateSlug(doc()), false);
  });

  await test('a new document with a name and no slug gets one generated', async () => {
    const created = new University({
      name: 'Amity University', state: 'Haryana', city: 'Gurgaon', type: 'private',
    });
    assert.strictEqual(University.shouldRegenerateSlug(created), true,
      'a brand-new document counts every set path as modified');
  });

  await test('a new document that already carries an explicit slug keeps it', async () => {
    const created = new University({
      name: 'Sanskriti University', slug: 'sanskriti-university-2',
      state: 'Madhya Pradesh', city: 'Indore', type: 'private',
    });
    assert.strictEqual(University.shouldRegenerateSlug(created), false);
    assert.strictEqual(created.slug, 'sanskriti-university-2');
  });

  section('University classification and validation');

  await test('a published university requires state and city', async () => {
    const err = await validate(new University({ name: 'No Location', type: 'private' }));
    assert.ok(err, 'expected a ValidationError');
    assert.ok(err.errors.state || err.errors.city);
  });

  await test('a DRAFT university does not require state or city', async () => {
    const err = await validate(new University({ name: 'Draft', status: 'draft' }));
    assert.strictEqual(err, null, err && err.message);
  });

  await test('classification derives segment/institutionKind/type', async () => {
    const doc = new University({ name: 'X', state: 'Goa', city: 'Panaji', type: 'deemed' });
    await validate(doc);
    assert.strictEqual(doc.segment, 'normal');
    assert.strictEqual(doc.institutionKind, 'deemed');
  });

  await test('an invalid status is rejected', async () => {
    const err = await validate(new University({
      name: 'X', state: 'Goa', city: 'Panaji', type: 'private', status: 'nonsense',
    }));
    assert.ok(err && err.errors.status);
  });

  await test('an invalid sponsorTier is rejected', async () => {
    const err = await validate(new University({
      name: 'X', state: 'Goa', city: 'Panaji', type: 'private', sponsorTier: 'diamond',
    }));
    assert.ok(err && err.errors.sponsorTier);
  });

  section('Course');

  await test('a course slug is derived from the name when absent', async () => {
    const doc = new Course({
      universityId: '507f1f77bcf86cd799439011', name: 'B.Tech in CSE', category: 'UG',
    });
    await validate(doc);
    // slugify({ strict: true }) drops the dot, so "B.Tech" becomes "btech".
    assert.strictEqual(doc.slug, 'btech-in-cse');
  });

  await test('an explicitly supplied course slug is kept', async () => {
    const doc = new Course({
      universityId: '507f1f77bcf86cd799439011', name: 'B.Tech in CSE',
      slug: 'btech-in-cse-2', category: 'UG',
    });
    await validate(doc);
    assert.strictEqual(doc.slug, 'btech-in-cse-2');
  });

  await test('a course requires a universityId, name and category', async () => {
    const err = await validate(new Course({}));
    assert.ok(err, 'expected a ValidationError');
    assert.ok(err.errors.universityId && err.errors.name && err.errors.category);
  });
};
