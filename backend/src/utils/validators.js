/**
 * Input validators for the public (unauthenticated) write endpoints.
 *
 * These endpoints previously accepted whatever arrived: a malformed address went
 * straight into the newsletter/lead/contact collections and only failed later
 * when someone tried to email it, and a missing field surfaced as a raw
 * Mongoose ValidationError rendered as a 500. Everything here is deliberately
 * permissive about *format* and strict about *shape*, so genuine Indian phone
 * numbers and international addresses still pass.
 */

// Practical address check: one @, no whitespace, a dotted domain. Deliberately
// not RFC 5322 — the full grammar accepts addresses no mail provider will.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

const MAX_EMAIL_LENGTH = 254;

/** Upper bounds so a public form cannot store an unbounded blob. */
const FIELD_LIMITS = {
  name: 120,
  email: MAX_EMAIL_LENGTH,
  phone: 20,
  subject: 200,
  message: 5000,
  state: 100,
  preferredCourse: 150,
  notes: 2000,
  content: 5000,
  role: 120,
  university: 200,
};

const asString = (value) => (value === null || value === undefined ? '' : String(value).trim());

/** Trim + lowercase, the form actually stored on Newsletter/User. */
const normalizeEmail = (value) => asString(value).toLowerCase();

const isValidEmail = (value) => {
  const email = normalizeEmail(value);
  return email.length > 0 && email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
};

/**
 * Phone check.
 *
 * Accepts the shapes real users type — "98765 43210", "+91-9876543210",
 * "09876543210" — by reducing to digits first. A bare 10-digit number must be a
 * valid Indian mobile (leading 6-9), which rejects the common "1234567890"
 * junk entry; anything longer is treated as carrying a country code and only
 * length-checked, so overseas numbers are not blocked.
 */
const digitsOf = (value) => asString(value).replace(/\D/g, '');

const isValidPhone = (value) => {
  const digits = digitsOf(value);
  if (digits.length < 10 || digits.length > 15) return false;
  if (digits.length === 10) return /^[6-9]/.test(digits);
  return true;
};

/**
 * True only for an absolute http/https URL.
 *
 * Used wherever a client supplies a URL that the server or CDN will later fetch
 * or re-serve. It rejects `blob:` and `data:` (which are meaningless once they
 * leave the submitting browser) as well as `file:`, `gopher:` and friends, which
 * are the usual levers for turning a "fetch this image" feature into SSRF.
 */
const isSafeHttpUrl = (value) => {
  const raw = asString(value);
  if (!raw) return false;
  try {
    const { protocol } = new URL(raw);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Returns the labels of any required field that is absent or blank.
 * @param {object} body
 * @param {Array<string|{key:string,label:string}>} fields
 */
const missingFields = (body = {}, fields = []) =>
  fields
    .map((field) => (typeof field === 'string' ? { key: field, label: field } : field))
    .filter(({ key }) => !asString(body[key]))
    .map(({ label }) => label);

/**
 * Returns the labels of any field longer than its configured limit.
 * Only fields present in FIELD_LIMITS are checked.
 */
const oversizedFields = (body = {}, fields = []) =>
  fields
    .map((field) => (typeof field === 'string' ? { key: field, label: field } : field))
    .filter(({ key }) => {
      const limit = FIELD_LIMITS[key];
      return limit !== undefined && asString(body[key]).length > limit;
    })
    .map(({ key, label }) => `${label} must be ${FIELD_LIMITS[key]} characters or fewer`);

/**
 * One-shot validation for a public form submission.
 *
 * @returns {string|null} the first problem found, or null when the body is fine.
 */
const validateSubmission = (body = {}, { required = [], email = false, phone = false, phoneRequired = false } = {}) => {
  const missing = missingFields(body, required);
  if (missing.length) {
    return `${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`;
  }

  const tooLong = oversizedFields(body, [...required, 'email', 'phone', 'notes', 'preferredCourse']);
  if (tooLong.length) return tooLong[0];

  if (email && !isValidEmail(body.email)) {
    return 'Please provide a valid email address';
  }

  // A phone that was supplied must be well-formed even when it is optional.
  const hasPhone = Boolean(asString(body.phone));
  if (phone && (phoneRequired || hasPhone) && !isValidPhone(body.phone)) {
    return 'Please provide a valid phone number';
  }

  return null;
};

module.exports = {
  FIELD_LIMITS,
  asString,
  normalizeEmail,
  isValidEmail,
  isValidPhone,
  isSafeHttpUrl,
  digitsOf,
  missingFields,
  oversizedFields,
  validateSubmission,
};
