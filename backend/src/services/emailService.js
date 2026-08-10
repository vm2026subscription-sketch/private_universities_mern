const fs = require('fs');
const path = require('path');
const { sendMail } = require('../config/mail');

const getClientUrl = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

const TEMPLATES_DIR = path.join(__dirname, '../templates');

/**
 * Processes {{variable}} replacements and {{#if variable}}...{{/if}} conditional
 * blocks on a raw HTML string.
 */
function applyVariables(html, variables) {
  let content = html;

  // Handle {{#if key}}...{{/if}} conditional blocks
  content = content.replace(/{{\s*#if\s+([a-zA-Z0-9_]+)\s*}}([\s\S]*?){{\s*\/if\s*}}/g, (match, key, innerContent) => {
    const val = variables[key];
    return val && String(val).trim() !== '' ? innerContent : '';
  });

  // Handle standard {{key}} variable replacements
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    content = content.replace(regex, value !== undefined && value !== null ? String(value) : '');
  }

  return content;
}

/**
 * Loads an HTML partial from backend/src/templates, injects it into layout.html,
 * and replaces all placeholders.
 *
 * Templates are content-only snippets. The shared layout (layout.html) provides
 * the DOCTYPE, dark header with logo, white card wrapper, CTA button, and the
 * standardised footer. Each template only defines its own body content.
 *
 * @param {string}  templateName   Filename without extension inside templates/
 * @param {Object}  variables      Key-value pairs for {{placeholder}} substitution
 * @param {Object}  [layoutVars]   Optional overrides for the layout itself
 * @param {string}  [layoutVars.title]    Browser/email title
 * @param {string}  [layoutVars.ctaLabel] Button label (omit to hide the button)
 * @param {string}  [layoutVars.ctaUrl]   Button href
 */
function loadTemplate(templateName, variables = {}, layoutVars = {}) {
  const partialPath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  const layoutPath = path.join(TEMPLATES_DIR, 'layout.html');

  const partialHtml = fs.readFileSync(partialPath, 'utf8');
  const layoutHtml = fs.readFileSync(layoutPath, 'utf8');

  const allVariables = {
    clientUrl: getClientUrl(),
    ...variables,
    ...layoutVars,
  };

  // First resolve conditionals and variables inside the partial
  const resolvedPartial = applyVariables(partialHtml, allVariables);

  // Inject the resolved partial into layout's {{content}} slot
  allVariables.content = resolvedPartial;

  // Now resolve the full layout (header, footer, CTA, remaining vars)
  return applyVariables(layoutHtml, allVariables);
}

/**
 * Wraps arbitrary body HTML in the shared layout — used by call sites that
 * build their email content inline rather than from a template file.
 */
function wrapInLayout(bodyHtml, layoutVars = {}) {
  const layoutPath = path.join(TEMPLATES_DIR, 'layout.html');
  const layoutHtml = fs.readFileSync(layoutPath, 'utf8');

  const allVariables = {
    clientUrl: getClientUrl(),
    content: bodyHtml,
    ...layoutVars,
  };

  return applyVariables(layoutHtml, allVariables);
}

/**
 * 1. Registration Request Submitted Email (University)
 */
async function sendRequestSubmittedEmail({ to, applicantName, universityName }) {
  const html = loadTemplate('requestSubmitted', { applicantName, universityName }, {
    title: 'Registration Request Submitted',
    // No CTA for this email — the applicant must wait for admin review
  });
  await sendMail({
    to,
    subject: `Registration Request Received - ${universityName}`,
    html,
  });
}

/**
 * 2. Request Approved Email (University)
 */
async function sendRequestApprovedEmail({ to, universityName }) {
  const html = loadTemplate('requestApproved', { universityName }, {
    title: 'Request Approved',
    ctaLabel: 'Sign In to Dashboard',
    ctaUrl: `${getClientUrl()}/login`,
  });
  await sendMail({
    to,
    subject: `Your request for ${universityName} has been approved!`,
    html,
  });
}

/**
 * 3. Request Rejected Email (University)
 */
async function sendRequestRejectedEmail({ to, universityName, reason }) {
  const html = loadTemplate('requestRejected', { universityName, reason }, {
    title: 'Request Update',
    // No CTA — user can re-apply from the main site
  });
  await sendMail({
    to,
    subject: `Update regarding your access request for ${universityName}`,
    html,
  });
}

/**
 * 4. Payment Successful Email (University)
 */
async function sendPaymentSuccessEmail({ to, universityName, planName, expiryDateStr }) {
  const formattedPlan = String(planName || '').toUpperCase();
  const html = loadTemplate('paymentSuccess', {
    universityName,
    planName: formattedPlan,
    expiryDateStr: expiryDateStr || '',
  }, {
    title: 'Payment Successful',
    ctaLabel: 'View Receipt & Plan',
    ctaUrl: `${getClientUrl()}/university/dashboard/subscription`,
  });
  await sendMail({
    to,
    subject: `Payment Successful - ${formattedPlan} Plan Activated`,
    html,
  });
}

/**
 * 5. Payment Failed / Cancelled Email (University)
 */
async function sendPaymentFailedEmail({ to, universityName, reason = 'Transaction failed or was cancelled.' }) {
  const html = loadTemplate('paymentFailed', { universityName, reason }, {
    title: 'Payment Failed',
    ctaLabel: 'Try Again',
    ctaUrl: `${getClientUrl()}/university/dashboard/subscription`,
  });
  await sendMail({
    to,
    subject: `Payment Failed or Cancelled - ${universityName}`,
    html,
  });
}

/**
 * 6. Subscription Expiring (7 Days Before) Email (University)
 */
async function sendSubscriptionExpiringEmail({ to, universityName, planName, expiryDateStr }) {
  const formattedPlan = String(planName || '').toUpperCase();
  const html = loadTemplate('subscriptionExpiring', {
    universityName,
    planName: formattedPlan,
    expiryDateStr: expiryDateStr || '',
  }, {
    title: 'Subscription Expiring Soon',
    ctaLabel: 'Renew Subscription',
    ctaUrl: `${getClientUrl()}/university/dashboard/subscription`,
  });
  await sendMail({
    to,
    subject: `Subscription Expiring in 7 Days - ${universityName}`,
    html,
  });
}

/**
 * 7. Subscription Expired Email (University)
 */
async function sendSubscriptionExpiredEmail({ to, universityName, planName }) {
  const formattedPlan = String(planName || '').toUpperCase();
  const html = loadTemplate('subscriptionExpired', {
    universityName,
    planName: formattedPlan,
  }, {
    title: 'Subscription Expired',
    ctaLabel: 'Renew Plan Now',
    ctaUrl: `${getClientUrl()}/university/dashboard/subscription`,
  });
  await sendMail({
    to,
    subject: `Subscription Expired - ${universityName}`,
    html,
  });
}

module.exports = {
  loadTemplate,
  wrapInLayout,
  sendRequestSubmittedEmail,
  sendRequestApprovedEmail,
  sendRequestRejectedEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionExpiringEmail,
  sendSubscriptionExpiredEmail,
};
