/**
 * Classifies a claimant's email address against the university they are
 * claiming, producing a signal for the reviewing admin.
 *
 * This is explicitly NOT an access control. Two facts drive that decision:
 *
 *  1. An official-domain address does not prove authority. Every student,
 *     lecturer and clerk at a university holds one. A second-year student with
 *     `name@vit.ac.in` would sail through a pure domain check and end up in
 *     control of that university's public profile.
 *
 *  2. A free-provider address does not prove fraud. A large share of India's
 *     private universities — precisely this portal's paying market — still run
 *     admissions from Gmail. Rejecting them automatically would turn away real
 *     customers at the door.
 *
 * So the domain narrows the reviewer's attention; the human decision, backed by
 * an authorisation letter and a callback to the number published on the
 * university's own website, is what actually grants access.
 */

/**
 * Free/consumer mailbox providers. Not exhaustive by design — anything not
 * listed simply falls through to `unrelated`, which is also a review prompt, so
 * an omission cannot cause an address to be treated as more trustworthy than it
 * is.
 */
const FREE_EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.in',
  'yahoo.co.in',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'rediffmail.com',
  'rediff.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'zohomail.in',
  'yandex.com',
  'mail.com',
  'gmx.com',
]);

/** Suffixes reserved for educational institutions. */
const ACADEMIC_SUFFIXES = ['.edu', '.edu.in', '.ac.in', '.ac.uk', '.edu.au'];

/** Everything below compares bare hostnames, so strip scheme, port and path. */
const extractHostname = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  const withoutScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  const host = withoutScheme.split('/')[0].split('?')[0].split('#')[0].split(':')[0];

  // `www.` is presentational; treat www.vit.ac.in and vit.ac.in as one host.
  return host.replace(/^www\./, '');
};

const extractEmailDomain = (email) => {
  const raw = String(email || '').trim().toLowerCase();
  const at = raw.lastIndexOf('@');
  if (at === -1 || at === raw.length - 1) return '';
  return raw.slice(at + 1).replace(/^www\./, '');
};

const isAcademicDomain = (domain) =>
  ACADEMIC_SUFFIXES.some((suffix) => domain.endsWith(suffix));

const isFreeProvider = (domain) => FREE_EMAIL_PROVIDERS.has(domain);

/**
 * True when the two hosts belong to the same organisation.
 *
 * Subdomains count (`admissions.vit.ac.in` matches `vit.ac.in`), but the match
 * is anchored on a dot boundary so `notvit.ac.in` does not match `vit.ac.in` —
 * a plain `endsWith` would accept exactly that kind of look-alike domain.
 */
const isSameOrganisation = (domainA, domainB) => {
  if (!domainA || !domainB) return false;
  if (domainA === domainB) return true;
  return domainA.endsWith(`.${domainB}`) || domainB.endsWith(`.${domainA}`);
};

/**
 * @param {string} email      Applicant's email address.
 * @param {string} [website]  The university's website, as recorded on the
 *                            University document — NOT a value the applicant
 *                            supplied, otherwise they could fabricate a match.
 * @returns {{ signal: 'official'|'academic'|'free'|'unrelated', domain: string, note: string }}
 */
const classifyEmailDomain = (email, website) => {
  const domain = extractEmailDomain(email);

  if (!domain) {
    return { signal: 'unrelated', domain: '', note: 'Email address could not be parsed.' };
  }

  const officialHost = extractHostname(website);

  if (officialHost && isSameOrganisation(domain, officialHost)) {
    return {
      signal: 'official',
      domain,
      note: `Matches the university's listed website (${officialHost}). Confirms a connection to the institution, not authority to represent it.`,
    };
  }

  if (isFreeProvider(domain)) {
    return {
      signal: 'free',
      domain,
      note: 'Free email provider. Common for smaller private universities — verify with an authorisation letter and a callback before approving.',
    };
  }

  if (isAcademicDomain(domain)) {
    return {
      signal: 'academic',
      domain,
      note: officialHost
        ? `Academic domain, but does not match this university's website (${officialHost}). Check whether the applicant belongs to a different institution.`
        : 'Academic domain. No website on record for this university to compare against.',
    };
  }

  return {
    signal: 'unrelated',
    domain,
    note: officialHost
      ? `Does not match the university's website (${officialHost}) and is not a known provider. Treat with caution.`
      : 'Unrecognised domain and no website on record. Treat with caution.',
  };
};

/** Signals that warrant extra scrutiny in the admin queue. */
const needsExtraScrutiny = (signal) => signal !== 'official';

module.exports = {
  classifyEmailDomain,
  needsExtraScrutiny,
  extractEmailDomain,
  extractHostname,
  isSameOrganisation,
  FREE_EMAIL_PROVIDERS,
  ACADEMIC_SUFFIXES,
};
