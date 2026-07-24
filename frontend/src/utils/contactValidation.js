/**
 * Validates if an email string is a real, valid email address and not a placeholder or fake data.
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const cleaned = email.trim().toLowerCase();

  if (!cleaned) return false;

  const placeholders = [
    'n/a', 'na', 'not available', 'coming soon', 'none', 'null', 'undefined',
    'example@email.com', 'contact@university.com', 'email@university.com',
    'info@university.com', 'admin@university.com', 'admissions@university.com',
    'test@example.com', 'user@example.com', 'student@example.com', 'placeholder@email.com'
  ];
  if (placeholders.includes(cleaned)) return false;

  // Basic email structure regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) return false;

  // Fake domain checks
  const fakeDomains = ['example.com', 'domain.com', 'email.com', 'university.com', 'yourdomain.com', 'test.com', 'sample.com', 'vidyarthimitra.local'];
  if (fakeDomains.some((d) => cleaned.endsWith('@' + d) || cleaned.endsWith('.' + d))) return false;

  return true;
};

/**
 * Validates if a phone string is a real, valid phone number and not a placeholder or fake data.
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.trim().toLowerCase();

  if (!cleaned) return false;

  const placeholders = [
    'n/a', 'na', 'not available', 'coming soon', 'none', 'null', 'undefined',
    '1234567890', '0000000000', '+91 000 000 0000', '+91-0000000000', '+91 00000 00000',
    '+91 0000000000', '000 000 0000', '000-000-0000', '00000000000'
  ];
  if (placeholders.includes(cleaned)) return false;

  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 7) return false;

  // Check for repeating single digits (e.g. 0000000000, 1111111111, 9999999999)
  if (/^(\d)\1+$/.test(digitsOnly)) return false;

  // Check for sequential digits
  if (digitsOnly === '1234567890' || digitsOnly === '0123456789') return false;

  return true;
};

/**
 * Returns the first valid email from arguments, or null if none are valid.
 */
export const getValidEmail = (...emails) => {
  for (const email of emails) {
    if (isValidEmail(email)) return email.trim();
  }
  return null;
};

/**
 * Returns the first valid phone from arguments, or null if none are valid.
 */
export const getValidPhone = (...phones) => {
  for (const phone of phones) {
    if (isValidPhone(phone)) return phone.trim();
  }
  return null;
};
