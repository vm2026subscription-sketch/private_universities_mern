const fs = require('fs');
const path = require('path');
const { sendMail } = require('../config/mail');

const getClientUrl = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

/**
 * Loads an HTML template from backend/src/templates and replaces placeholders dynamically.
 * Supports {{variable}} replacements and {{#if variable}}...{{/if}} conditional blocks.
 */
function loadTemplate(templateName, variables = {}) {
  const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
  let content = fs.readFileSync(templatePath, 'utf8');

  const allVariables = {
    clientUrl: getClientUrl(),
    ...variables,
  };

  // Handle {{#if key}}...{{/if}} conditional blocks
  content = content.replace(/{{\s*#if\s+([a-zA-Z0-9_]+)\s*}}([\s\S]*?){{\s*\/if\s*}}/g, (match, key, innerContent) => {
    const val = allVariables[key];
    return val && String(val).trim() !== '' ? innerContent : '';
  });

  // Handle standard {{key}} variable replacements
  for (const [key, value] of Object.entries(allVariables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    content = content.replace(regex, value !== undefined && value !== null ? String(value) : '');
  }

  return content;
}

/**
 * 1. Registration Request Submitted Email (University)
 */
async function sendRequestSubmittedEmail({ to, applicantName, universityName }) {
  const html = loadTemplate('requestSubmitted', { applicantName, universityName });
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
  const html = loadTemplate('requestApproved', { universityName });
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
  const html = loadTemplate('requestRejected', { universityName, reason });
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
  const html = loadTemplate('paymentFailed', { universityName, reason });
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
  });
  await sendMail({
    to,
    subject: `Subscription Expired - ${universityName}`,
    html,
  });
}

module.exports = {
  loadTemplate,
  sendRequestSubmittedEmail,
  sendRequestApprovedEmail,
  sendRequestRejectedEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionExpiringEmail,
  sendSubscriptionExpiredEmail,
};
