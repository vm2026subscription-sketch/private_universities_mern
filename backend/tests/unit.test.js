/**
 * Unit tests for the shared helpers introduced alongside the API-consistency,
 * validation and upload-security work. Pure logic only — no database, no network.
 */

const assert = require('assert');
const zlib = require('zlib');
const { test, section, mockResponse } = require('./helpers');

const { classifyError, fail, parsePagination, paginated } = require('../src/utils/apiResponse');
const {
  isValidEmail, isValidPhone, isSafeHttpUrl, normalizeEmail, validateSubmission,
} = require('../src/utils/validators');
const { inspectImage, inspectSpreadsheet, looksLikeText } = require('../src/utils/fileSignature');
const { validateImageUpload, validateSpreadsheetUpload } = require('../src/middleware/fileValidation');
const errorHandler = require('../src/middleware/errorHandler');
const { notFoundHandler } = require('../src/middleware/errorHandler');
const {
  publishedUniversityFilter, indexableUniversityFilter, normalSegmentFilter, segmentFilter,
} = require('../src/utils/universityFilters');

/* ── fixtures: real file headers ─────────────────────────────────────────── */
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const GIF = Buffer.concat([Buffer.from('GIF89a', 'ascii'), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.alloc(4), Buffer.from('WEBP', 'ascii'), Buffer.alloc(16)]);
const BMP = Buffer.concat([Buffer.from([0x42, 0x4d]), Buffer.alloc(32)]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.7', 'ascii'), Buffer.alloc(32)]);
const OLE2 = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(32)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const PHP = Buffer.from('<?php system($_GET["cmd"]); ?>');
const CSV = Buffer.from('University Name,State,City\nAmity University,Haryana,Gurgaon\n');
const CSV_WITH_NUL = Buffer.concat([Buffer.from('a,b\n'), Buffer.from([0x00]), Buffer.from('c')]);

/** A ZIP whose local file headers name the given entries, in plain text. */
const zipWith = (...entries) =>
  Buffer.concat(entries.map((name) => Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.alloc(22),
    Buffer.from([name.length, 0x00, 0x00, 0x00]),
    Buffer.from(name, 'latin1'),
  ])));

const XLSX = zipWith('[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml');
const DOCX = zipWith('[Content_Types].xml', 'word/document.xml');
const PLAIN_ZIP = zipWith('payload.sh');

module.exports = async () => {
  /* ── error classification ──────────────────────────────────────────────── */
  section('apiResponse.classifyError');

  await test('duplicate key becomes a 409 naming the field', () => {
    const r = classifyError({ code: 11000, keyPattern: { email: 1 } });
    assert.strictEqual(r.statusCode, 409);
    assert.strictEqual(r.message, 'email already exists');
  });

  await test('ValidationError becomes a 400 listing the messages', () => {
    const r = classifyError({ name: 'ValidationError', errors: { a: { message: 'a is required' } } });
    assert.strictEqual(r.statusCode, 400);
    assert.strictEqual(r.message, 'a is required');
  });

  await test('CastError becomes a 400 naming the path', () => {
    assert.strictEqual(classifyError({ name: 'CastError', path: 'universityId' }).message, 'Invalid universityId');
  });

  await test('Multer size error becomes a friendly 400', () => {
    const r = classifyError({ name: 'MulterError', code: 'LIMIT_FILE_SIZE' });
    assert.strictEqual(r.statusCode, 400);
    assert.strictEqual(r.message, 'File is too large');
  });

  await test('a deliberate 4xx keeps its message', () => {
    assert.strictEqual(classifyError({ statusCode: 403, message: 'Nope' }).message, 'Nope');
  });

  await test('an unexpected error never leaks its message to the client', () => {
    const r = classifyError(new Error('MongoServerError at /app/src/models/User.js'));
    assert.strictEqual(r.statusCode, 500);
    assert.strictEqual(r.message, 'Something went wrong. Please try again.');
    assert.match(r.detail, /MongoServerError/); // available for the server log only
  });

  section('error middleware');

  await test('fail() emits the standard error body', () => {
    const res = mockResponse();
    fail(res, 422, 'Nope');
    assert.deepStrictEqual(res.body, { success: false, message: 'Nope' });
    assert.strictEqual(res.statusCode, 422);
  });

  await test('unmatched routes answer with JSON, not an HTML error page', () => {
    const res = mockResponse();
    notFoundHandler({ method: 'GET', originalUrl: '/api/v1/nope' }, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Route not found: GET \/api\/v1\/nope/);
  });

  await test('errorHandler and classifyError agree on status codes', () => {
    const res = mockResponse();
    errorHandler({ code: 11000, keyPattern: { slug: 1 } }, { method: 'POST', originalUrl: '/x' }, res, () => {});
    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body.message, 'slug already exists');
  });

  await test('errorHandler withholds the stack outside development', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = mockResponse();
    errorHandler(new Error('boom'), { method: 'GET', originalUrl: '/x' }, res, () => {});
    process.env.NODE_ENV = previous;
    assert.ok(!('stack' in res.body));
    assert.strictEqual(res.body.message, 'Something went wrong. Please try again.');
  });

  /* ── pagination ────────────────────────────────────────────────────────── */
  section('apiResponse pagination');

  await test('no page/limit means pagination was not requested', () => {
    assert.strictEqual(parsePagination({}).isPaginated, false);
  });

  await test('either page or limit opts into pagination', () => {
    assert.strictEqual(parsePagination({ page: '2' }).isPaginated, true);
    assert.strictEqual(parsePagination({ limit: '5' }).isPaginated, true);
  });

  await test('skip is derived from page and limit', () => {
    assert.strictEqual(parsePagination({ page: '3', limit: '10' }).skip, 20);
  });

  await test('garbage and out-of-range values are clamped, never NaN', () => {
    assert.strictEqual(parsePagination({ page: 'abc' }).page, 1);
    assert.strictEqual(parsePagination({ page: '0' }).page, 1);
    assert.strictEqual(parsePagination({ page: '-5' }).page, 1);
    assert.strictEqual(parsePagination({ limit: '100000' }).limit, 100);
    assert.strictEqual(parsePagination({ limit: 'abc' }, { defaultLimit: 20 }).limit, 20);
  });

  await test('flat fields and the nested pagination object always agree', () => {
    const res = mockResponse();
    paginated(res, { data: [1, 2], total: 402, page: 2, limit: 12 });
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.total, 402);
    assert.strictEqual(res.body.pages, 34);
    assert.deepStrictEqual(res.body.pagination, { total: 402, page: 2, limit: 12, pages: 34 });
  });

  await test('an unpaginated list reports a single page', () => {
    const res = mockResponse();
    paginated(res, { data: [1, 2, 3], total: 3, page: 1, limit: null });
    assert.strictEqual(res.body.pages, 1);
    assert.strictEqual(res.body.limit, 3);
  });

  await test('an empty result set reports 1 page, not 0 or NaN', () => {
    const res = mockResponse();
    paginated(res, { data: [], total: 0, page: 1, limit: null });
    assert.strictEqual(res.body.pages, 1);
  });

  await test('extra metadata (e.g. newsletter `active`) survives', () => {
    const res = mockResponse();
    paginated(res, { data: [], total: 0, page: 1, limit: 10, extra: { active: 7 } });
    assert.strictEqual(res.body.active, 7);
  });

  /* ── validators ────────────────────────────────────────────────────────── */
  section('validators: email');

  await test('accepts ordinary addresses', () => {
    ['student@example.com', 'a.b+tag@sub.example.co.in', 'Student@Example.COM']
      .forEach((e) => assert.ok(isValidEmail(e), e));
  });

  await test('rejects malformed addresses', () => {
    ['', '   ', 'nope', 'a@localhost', 'a@b..com', 'a b@c.com', '@b.com', 'a@', undefined, null, 'a'.repeat(250) + '@b.com']
      .forEach((e) => assert.ok(!isValidEmail(e), String(e)));
  });

  await test('normalizeEmail trims and lowercases', () => {
    assert.strictEqual(normalizeEmail('  A@B.COM '), 'a@b.com');
  });

  section('validators: phone');

  await test('accepts the shapes users actually type', () => {
    ['9876543210', '98765 43210', '+91-9876543210', '09876543210', '+1 415 555 2671']
      .forEach((p) => assert.ok(isValidPhone(p), p));
  });

  await test('rejects junk and wrong-length numbers', () => {
    ['1234567890', '98765', '', 'abcdefghij', '1'.repeat(16), undefined]
      .forEach((p) => assert.ok(!isValidPhone(p), String(p)));
  });

  section('validators: URLs');

  await test('accepts absolute http(s) URLs only', () => {
    assert.ok(isSafeHttpUrl('https://cdn.example.com/a.png'));
    assert.ok(isSafeHttpUrl('http://example.com/a.png'));
  });

  await test('rejects blob:, data:, file: and relative URLs', () => {
    ['blob:http://localhost/abc', 'data:image/png;base64,AAA', 'file:///etc/passwd', '/logo.png', 'javascript:alert(1)', '']
      .forEach((u) => assert.ok(!isSafeHttpUrl(u), u));
  });

  section('validators: submissions');

  const required = [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }];

  await test('names every missing field', () => {
    assert.match(validateSubmission({}, { required }), /Name, Email are required/);
    assert.match(validateSubmission({ name: 'A' }, { required }), /Email is required/);
  });

  await test('whitespace-only counts as missing', () => {
    assert.match(validateSubmission({ name: '   ', email: 'a@b.com' }, { required }), /Name is required/);
  });

  await test('a complete valid body passes', () => {
    assert.strictEqual(validateSubmission({ name: 'A', email: 'a@b.com' }, { required, email: true }), null);
  });

  await test('an optional phone is validated only when supplied', () => {
    const opts = { required, email: true, phone: true };
    assert.strictEqual(validateSubmission({ name: 'A', email: 'a@b.com' }, opts), null);
    assert.match(validateSubmission({ name: 'A', email: 'a@b.com', phone: '123' }, opts), /valid phone/);
  });

  await test('a required phone must be present and valid', () => {
    const opts = { required: [...required, { key: 'phone', label: 'Phone' }], email: true, phone: true, phoneRequired: true };
    assert.match(validateSubmission({ name: 'A', email: 'a@b.com' }, opts), /Phone is required/);
  });

  await test('oversized fields are rejected with the limit named', () => {
    assert.match(validateSubmission({ name: 'x'.repeat(200), email: 'a@b.com' }, { required }), /120 characters or fewer/);
  });

  /* ── file signatures ───────────────────────────────────────────────────── */
  section('fileSignature: images');

  await test('accepts the four supported raster formats', () => {
    [['png', PNG], ['jpeg', JPEG], ['gif', GIF], ['webp', WEBP]].forEach(([kind, buf]) => {
      const r = inspectImage(buf);
      assert.ok(r.ok, kind);
      assert.strictEqual(r.kind, kind);
    });
  });

  await test('rejects content that is not one of them', () => {
    [['bmp', BMP], ['pdf', PDF], ['svg', SVG], ['php', PHP], ['empty', Buffer.alloc(0)]]
      .forEach(([label, buf]) => assert.strictEqual(inspectImage(buf).ok, false, label));
  });

  await test('SVG stays unsupported (it can embed <script>)', () => {
    assert.strictEqual(inspectImage(SVG).ok, false);
  });

  section('fileSignature: spreadsheets');

  await test('accepts a real xlsx workbook', () => {
    assert.strictEqual(inspectSpreadsheet(XLSX, 'data.xlsx').kind, 'xlsx');
  });

  await test('rejects a docx or a plain zip renamed to .xlsx', () => {
    assert.strictEqual(inspectSpreadsheet(DOCX, 'data.xlsx').ok, false);
    assert.strictEqual(inspectSpreadsheet(PLAIN_ZIP, 'data.xlsx').ok, false);
  });

  await test('accepts a legacy OLE2 .xls', () => {
    assert.strictEqual(inspectSpreadsheet(OLE2, 'legacy.xls').kind, 'xls');
  });

  await test('accepts a genuine csv', () => {
    assert.strictEqual(inspectSpreadsheet(CSV, 'rows.csv').kind, 'csv');
    assert.ok(looksLikeText(CSV));
  });

  await test('rejects binary content hiding behind a .csv name', () => {
    assert.strictEqual(inspectSpreadsheet(CSV_WITH_NUL, 'rows.csv').ok, false);
    assert.strictEqual(inspectSpreadsheet(PNG, 'rows.csv').ok, false);
    assert.strictEqual(inspectSpreadsheet(zlib.gzipSync('hello'), 'rows.xlsx').ok, false);
  });

  await test('rejects text that was not presented as a csv', () => {
    assert.strictEqual(inspectSpreadsheet(CSV, 'rows.xlsx').ok, false);
  });

  /* ── upload middleware ─────────────────────────────────────────────────── */
  section('fileValidation middleware');

  await test('lets a real image through', () => {
    const req = { file: { buffer: PNG, originalname: 'a.png', mimetype: 'image/png' } };
    const res = mockResponse();
    let nexted = false;
    validateImageUpload(req, res, () => { nexted = true; });
    assert.ok(nexted);
    assert.strictEqual(res.body, null);
  });

  await test('replaces a forged mimetype with the sniffed one', () => {
    const req = { file: { buffer: PNG, originalname: 'a.png', mimetype: 'image/svg+xml' } };
    validateImageUpload(req, mockResponse(), () => {});
    assert.strictEqual(req.file.mimetype, 'image/png');
    assert.strictEqual(req.detectedFile.kind, 'png');
  });

  await test('rejects a payload whose bytes are not an image, whatever it claims', () => {
    const req = { file: { buffer: PHP, originalname: 'logo.png', mimetype: 'image/png' } };
    const res = mockResponse();
    let nexted = false;
    validateImageUpload(req, res, () => { nexted = true; });
    assert.strictEqual(nexted, false);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('passes through when there is no file, so routes keep their own message', () => {
    const res = mockResponse();
    let nexted = false;
    validateImageUpload({}, res, () => { nexted = true; });
    assert.ok(nexted);
    assert.strictEqual(res.body, null);
  });

  await test('spreadsheet rejection carries both message and the deprecated error alias', () => {
    const res = mockResponse();
    validateSpreadsheetUpload({ file: { buffer: PNG, originalname: 'data.xlsx' } }, res, () => {
      throw new Error('should not reach the handler');
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, res.body.message);
  });

  /* ── shared university filters ─────────────────────────────────────────── */
  section('universityFilters');

  await test('a missing status counts as published', () => {
    assert.deepStrictEqual(publishedUniversityFilter(), {
      $or: [{ status: 'published' }, { status: { $exists: false } }],
    });
  });

  await test('the prefixed form targets a joined university', () => {
    assert.deepStrictEqual(publishedUniversityFilter('universityId'), {
      $or: [{ 'universityId.status': 'published' }, { 'universityId.status': { $exists: false } }],
    });
  });

  await test('the sitemap filter is the published filter plus noindex exclusion', () => {
    const f = indexableUniversityFilter();
    assert.deepStrictEqual(f.$and[0], publishedUniversityFilter());
    assert.deepStrictEqual(f.$and[1], { 'seo.indexStatus': { $ne: 'noindex' } });
  });

  await test('the normal segment excludes foreign and twinning', () => {
    const f = normalSegmentFilter();
    assert.deepStrictEqual(f.$or[1].type, { $nin: ['foreign', 'twinning'] });
  });

  await test('an unknown segment falls back to normal rather than matching nothing', () => {
    assert.deepStrictEqual(segmentFilter('nonsense'), normalSegmentFilter());
  });

  await test('foreign and twinning segments target themselves', () => {
    assert.strictEqual(segmentFilter('foreign').$or[0].segment, 'foreign');
    assert.strictEqual(segmentFilter('twinning', 'university').$or[0]['university.segment'], 'twinning');
  });
};
