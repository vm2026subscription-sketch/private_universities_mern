#!/usr/bin/env node
/**
 * End-to-end smoke test for the Vidyarthi Mitra backend.
 *
 *   cd backend && node scripts/smokeTest.js
 *
 * It starts a real server process (src/server.js) against the MONGODB_URI in
 * backend/.env, exercises the live HTTP API, and prints a pass/fail report.
 *
 * What it proves:
 *   - the server boots and actually reaches MongoDB
 *   - a signup writes a real User document and the OTP verification issues a session
 *   - every failure path answers with the standard { success: false, message } shape
 *   - paginated endpoints all return the same envelope
 *   - the public forms validate email/phone and rate-limit abuse
 *   - the removed admin-setup endpoint is really gone
 *   - the indexes declared in the schemas exist in the database
 *
 * It cleans up after itself: the throwaway account and its sessions/audit rows
 * are deleted before the process exits, including on Ctrl-C.
 *
 * The child server is started with NODE_ENV=development and
 * ALLOW_DEV_OTP_ECHO=true so the verification code comes back in the response
 * body when SMTP is not configured. If email delivery does succeed, the code is
 * instead recovered from the stored HMAC (same derivation as authController's
 * hashEmailCode) so the flow can still be completed offline.
 *
 * Nothing here writes to any collection except the one test User (plus the
 * Session/AuditLog rows it causes), and all of those are removed at the end.
 */

const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const BACKEND_ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(BACKEND_ROOT, '.env') });

const PORT = Number(process.env.PORT) || 5000;
const BASE = `http://127.0.0.1:${PORT}`;
const API = `${BASE}/api/v1`;
const ORIGIN = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

/* ── reporting ────────────────────────────────────────────────────────────── */

const results = [];
let child = null;
let cleanupEmail = null;

const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  const mark = ok === true ? 'PASS' : ok === null ? 'SKIP' : 'FAIL';
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
};

const section = (title) => console.log(`\n${title}\n${'-'.repeat(title.length)}`);

/* ── http ─────────────────────────────────────────────────────────────────── */

const request = async (method, url, { body, token, headers = {} } = {}) => {
  const res = await fetch(url.startsWith('http') ? url : API + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* left null on purpose — a non-JSON body is itself a finding */
  }
  return { status: res.status, json, text, headers: res.headers };
};

/** The contract every failure response in the API must satisfy. */
const isStandardError = (r) =>
  r.json !== null &&
  r.json.success === false &&
  typeof r.json.message === 'string' &&
  r.json.message.length > 0;

/** The contract every paginated list response must satisfy. */
const isStandardPage = (r) => {
  const b = r.json;
  if (!b || b.success !== true || !Array.isArray(b.data)) return false;
  for (const key of ['total', 'page', 'limit', 'pages']) {
    if (typeof b[key] !== 'number') return false;
  }
  if (!b.pagination || typeof b.pagination !== 'object') return false;
  return ['total', 'page', 'limit', 'pages'].every((k) => b.pagination[k] === b[k]);
};

/* ── server lifecycle ─────────────────────────────────────────────────────── */

const startServer = () =>
  new Promise((resolve, reject) => {
    console.log(`Starting src/server.js on port ${PORT}...`);

    child = spawn(process.execPath, [path.join(BACKEND_ROOT, 'src', 'server.js')], {
      cwd: BACKEND_ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        // Lets register() return the OTP in the body when SMTP is unconfigured.
        ALLOW_DEV_OTP_ECHO: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const log = [];
    const capture = (buf) => log.push(buf.toString());
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);

    child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Server exited with code ${code}:\n${log.join('')}`));
      }
    });

    // Poll the health endpoint until the DB reports connected.
    const deadline = Date.now() + 90_000;
    const poll = async () => {
      if (Date.now() > deadline) {
        return reject(new Error(`Server did not become healthy in 90s:\n${log.join('')}`));
      }
      try {
        const r = await request('GET', `${BASE}/api/v1/health`);
        if (r.status === 200 && r.json?.services?.database === 'connected') return resolve();
      } catch {
        /* not up yet */
      }
      setTimeout(poll, 1000);
    };
    setTimeout(poll, 1500);
  });

const stopServer = () => {
  if (child && !child.killed) child.kill('SIGTERM');
};

/* ── cleanup ──────────────────────────────────────────────────────────────── */

const cleanup = async () => {
  stopServer();
  if (!cleanupEmail) return;

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    }
    const User = require(path.join(BACKEND_ROOT, 'src', 'models', 'User'));
    const user = await User.findOne({ email: cleanupEmail });
    if (user) {
      const Session = require(path.join(BACKEND_ROOT, 'src', 'models', 'Session'));
      const AuditLog = require(path.join(BACKEND_ROOT, 'src', 'models', 'AuditLog'));
      await Promise.all([
        Session.deleteMany({ userId: user._id }),
        AuditLog.deleteMany({ userId: user._id }),
      ]);
      await User.deleteOne({ _id: user._id });
      console.log(`\nCleaned up test account ${cleanupEmail}`);
    }
  } catch (error) {
    console.error(`\nCleanup failed for ${cleanupEmail}: ${error.message}`);
    console.error('Delete that user manually if it still exists.');
  }
};

/* ── OTP recovery ─────────────────────────────────────────────────────────── */

/**
 * Mirrors authController.hashEmailCode. Used only when SMTP actually delivered
 * the mail (so the response carried no devVerificationCode): the stored value is
 * an HMAC over a 6-digit code, so the code is recoverable by scanning the range.
 */
const hashEmailCode = (code, secret) =>
  crypto.createHmac('sha256', secret).update(String(code)).digest('hex');

const recoverOtp = (storedHash, secret) => {
  for (let n = 100000; n <= 999999; n += 1) {
    if (hashEmailCode(n, secret) === storedHash) return String(n);
  }
  return null;
};

/* ── the checks ───────────────────────────────────────────────────────────── */

const run = async () => {
  const stamp = Date.now();
  const email = `smoketest+${stamp}@vidyarthimitra.test`;
  const password = `Sm0ke!Test-${stamp}`;
  cleanupEmail = email;

  await startServer();
  console.log('Server healthy.\n');

  /* 1 — standard error shape ---------------------------------------------- */
  section('1. Standard error response shape');

  const notFound = await request('GET', `${BASE}/api/v1/definitely-not-a-route`);
  record(
    'Unknown route returns JSON 404 (not Express HTML)',
    notFound.status === 404 && isStandardError(notFound),
    `${notFound.status} ${notFound.text.slice(0, 60)}`
  );

  const unauth = await request('GET', '/admin/users');
  record(
    'Protected route without a token returns standard 401',
    unauth.status === 401 && isStandardError(unauth),
    `${unauth.status}`
  );

  const badId = await request('GET', '/universities/not-a-valid-objectid');
  record(
    'Bad ObjectId returns a classified 4xx, not a 500',
    badId.status >= 400 && badId.status < 500 && isStandardError(badId),
    `${badId.status} ${badId.json?.message || ''}`
  );

  /* 6 — removed setup endpoint -------------------------------------------- */
  section('6. Temporary admin setup endpoint is gone');

  for (const p of ['/admin/setup', '/auth/setup-admin', '/admin/create-admin']) {
    const g = await request('GET', p);
    const po = await request('POST', p, { body: {} });
    record(
      `${p} is unreachable`,
      g.status === 404 && po.status === 404,
      `GET ${g.status}, POST ${po.status}`
    );
  }

  /* 3 — public validation -------------------------------------------------- */
  section('3. Public API validation');

  const cases = [
    ['Contact rejects a missing required field', '/contact', { name: 'Smoke' }],
    [
      'Contact rejects a malformed email',
      '/contact',
      { name: 'Smoke', email: 'not-an-email', subject: 'x', message: 'y' },
    ],
    ['Newsletter rejects a malformed email', '/newsletter/subscribe', { email: 'bad@@example' }],
    ['Newsletter rejects a missing email', '/newsletter/subscribe', {}],
    [
      'Lead rejects an implausible phone number',
      '/leads/submit',
      { name: 'Smoke', email: 'smoke@example.com', phone: '1234567890' },
    ],
  ];

  for (const [name, url, body] of cases) {
    const r = await request('POST', url, { body });
    record(name, r.status === 400 && isStandardError(r), `${r.status} ${r.json?.message || ''}`);
  }

  /* 3b — rate limiting ------------------------------------------------------ */
  section('3b. Rate limiting on public write endpoints');

  // Deliberately invalid bodies: validation rejects them before anything is
  // stored, so hammering the endpoint cannot pollute the collection.
  let tripped = 0;
  for (let i = 1; i <= 12; i += 1) {
    const r = await request('POST', '/contact', { body: { name: 'Smoke' } });
    if (r.status === 429) {
      tripped = i;
      record(
        'Contact form starts returning 429',
        isStandardError(r),
        `after ${i} requests — "${r.json?.message || ''}"`
      );
      break;
    }
  }
  if (!tripped) record('Contact form starts returning 429', false, 'no 429 within 12 requests');

  /* signup ----------------------------------------------------------------- */
  section('Signup (the real flow, against the real database)');

  const weak = await request('POST', '/auth/register', {
    body: { name: 'Smoke Test', email, password: '123' },
  });
  record(
    'Weak password is rejected',
    weak.status === 400 && isStandardError(weak),
    `${weak.status} ${weak.json?.message || ''}`
  );

  const reg = await request('POST', '/auth/register', {
    body: { name: 'Smoke Test', email, password },
  });
  record(
    'POST /auth/register succeeds',
    reg.status === 200 && reg.json?.success === true && reg.json?.requiresVerification === true,
    `${reg.status} ${reg.json?.message || reg.text.slice(0, 80)}`
  );

  // Confirm the write actually landed in MongoDB.
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const User = require(path.join(BACKEND_ROOT, 'src', 'models', 'User'));
  const stored = await User.findOne({ email }).select(
    '+password +emailVerificationCode +emailVerificationExpiry'
  );

  record(
    'User document exists in MongoDB after signup',
    Boolean(stored),
    stored ? `_id=${stored._id}` : 'not found'
  );
  record(
    'Password was hashed, not stored in plain text',
    Boolean(stored?.password) && stored.password !== password && stored.password.startsWith('$2'),
    stored?.password ? `${stored.password.slice(0, 7)}…` : 'no password field'
  );
  record(
    'New account is NOT auto-verified and has role "user"',
    stored?.isEmailVerified === false && stored?.role === 'user',
    `isEmailVerified=${stored?.isEmailVerified}, role=${stored?.role}`
  );

  // Complete the OTP step so the full signup path is exercised.
  let code = reg.json?.devVerificationCode || null;
  if (!code && stored?.emailVerificationCode) {
    const secret =
      process.env.OTP_PEPPER || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (secret) {
      console.log('  (verification email was delivered; recovering the code from its hash…)');
      code = recoverOtp(stored.emailVerificationCode, secret);
    }
  }

  let token = null;
  if (!code) {
    record('Email verification completes the signup', null, 'could not obtain the OTP');
  } else {
    const verify = await request('POST', '/auth/verify-email', { body: { email, code } });
    token = verify.json?.token || verify.json?.data?.token || null;
    record(
      'Email verification completes the signup',
      verify.status === 200 && verify.json?.success === true,
      `${verify.status} ${verify.json?.message || ''}`
    );
    record('Verification issues an access token', Boolean(token), token ? 'token received' : 'no token in body');
  }

  if (token) {
    const me = await request('GET', '/auth/me', { token });
    record(
      'GET /auth/me returns the new account',
      me.status === 200 && (me.json?.data?.email === email || me.json?.user?.email === email),
      `${me.status} ${me.json?.data?.email || me.json?.user?.email || ''}`
    );
  } else {
    record('GET /auth/me returns the new account', null, 'no token to test with');
  }

  const login = await request('POST', '/auth/login', { body: { email, password } });
  record(
    'Login with the new credentials is accepted',
    login.status === 200 && login.json?.success === true,
    `${login.status} ${login.json?.message || (login.json?.requiresOtp ? 'OTP step required' : '')}`
  );

  const wrongPassword = await request('POST', '/auth/login', {
    body: { email, password: 'definitely-the-wrong-password' },
  });
  record(
    'Wrong password is rejected with the standard shape',
    wrongPassword.status >= 400 && isStandardError(wrongPassword),
    `${wrongPassword.status} ${wrongPassword.json?.message || ''}`
  );

  /* 2 + 10 — pagination ----------------------------------------------------- */
  section('2 & 10. Pagination envelope');

  for (const url of [
    '/universities?page=1&limit=5',
    '/universities?page=2&limit=5',
    '/courses?page=1&limit=5',
  ]) {
    const r = await request('GET', url);
    const b = r.json || {};
    record(
      `${url} uses the standard envelope`,
      r.status === 200 && isStandardPage(r),
      `${r.status} total=${b.total} page=${b.page} limit=${b.limit} pages=${b.pages} items=${b.data?.length}`
    );
  }

  const p1 = await request('GET', '/universities?page=1&limit=3');
  const p2 = await request('GET', '/universities?page=2&limit=3');
  const ids = (r) => (r.json?.data || []).map((d) => String(d._id));
  const overlap = ids(p1).filter((id) => ids(p2).includes(id));
  record(
    'Page 1 and page 2 return different records',
    ids(p1).length > 0 && overlap.length === 0,
    `page1=${ids(p1).length} page2=${ids(p2).length} overlap=${overlap.length}`
  );

  const capped = await request('GET', '/universities?page=1&limit=9999');
  record(
    'limit is capped server-side',
    capped.status === 200 && (capped.json?.limit || 0) <= 100,
    `limit=${capped.json?.limit}`
  );

  /* 8 — fee sorting in the database ---------------------------------------- */
  section('8. Fee sorting happens in MongoDB');

  for (const dir of ['fees_asc', 'fees_desc']) {
    const t0 = Date.now();
    const r = await request('GET', `/universities?sort=${dir}&page=1&limit=10`);
    const ms = Date.now() - t0;
    record(
      `sort=${dir} returns a page`,
      r.status === 200 && isStandardPage(r),
      `${ms}ms, ${r.json?.data?.length ?? 0} items of ${r.json?.total ?? '?'}`
    );
  }

  /* 5 — indexes ------------------------------------------------------------- */
  section('5. Declared indexes exist in the database');

  const MODELS = [
    'AuditLog', 'Banner', 'ContactSubmission', 'Course', 'Exam', 'FAQ', 'Lead',
    'News', 'Newsletter', 'Notification', 'OtpLog', 'Page', 'Question', 'Session',
    'SiteSetting', 'Testimonial', 'University', 'User',
  ];

  let missingTotal = 0;
  const missingDetail = [];

  for (const name of MODELS) {
    const model = require(path.join(BACKEND_ROOT, 'src', 'models', name));
    const declared = model.schema.indexes().map(([keys]) => JSON.stringify(keys));
    let live = [];
    try {
      live = (await model.collection.indexes()).map((i) => JSON.stringify(i.key));
    } catch {
      continue; // collection does not exist yet
    }
    const missing = declared.filter((d) => !live.includes(d));
    if (missing.length) {
      missingTotal += missing.length;
      missingDetail.push(`${name}: ${missing.join(', ')}`);
    }
  }

  record(
    'Every declared index is built',
    missingTotal === 0,
    missingTotal === 0
      ? `${MODELS.length} models checked`
      : `${missingTotal} missing — run "npm run indexes:ensure"\n         ${missingDetail.join('\n         ')}`
  );

  /* summary ---------------------------------------------------------------- */
  const passed = results.filter((r) => r.ok === true).length;
  const failed = results.filter((r) => r.ok === false).length;
  const skipped = results.filter((r) => r.ok === null).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('='.repeat(60));

  if (failed) {
    console.log('\nFailures:');
    results.filter((r) => r.ok === false).forEach((r) => console.log(`  - ${r.name} (${r.detail})`));
  }

  return failed === 0;
};

/* ── entry point ──────────────────────────────────────────────────────────── */

let exiting = false;
const finish = async (code) => {
  if (exiting) return;
  exiting = true;
  await cleanup();
  try {
    await mongoose.disconnect();
  } catch {
    /* already closed */
  }
  process.exit(code);
};

process.on('SIGINT', () => void finish(130));
process.on('SIGTERM', () => void finish(143));

run()
  .then((ok) => finish(ok ? 0 : 1))
  .catch(async (error) => {
    console.error('\nSmoke test aborted:', error.message);
    await finish(1);
  });
