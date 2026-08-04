const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const DEFAULT_RESEND_FROM = 'Vidyarthi Mitra <onboarding@resend.dev>';

const hasResendConfig = () => Boolean(process.env.RESEND_API_KEY);
const hasSmtpConfig = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getResendFrom = () => process.env.RESEND_FROM || DEFAULT_RESEND_FROM;
const isResendTestSender = (fromAddress) => /onboarding@resend\.dev/i.test(fromAddress || '');
const normalizeAddress = (value) => String(value || '').trim().toLowerCase();

const getAdminEmails = () =>
  String(process.env.ADMIN_EMAIL || '')
    .split(',')
    .map(normalizeAddress)
    .filter(Boolean);

const getAllowedResendTestRecipients = () =>
  [...new Set([normalizeAddress(process.env.SMTP_USER), ...getAdminEmails()])].filter(Boolean);

const canUseResendTestSender = (toAddress) =>
  getAllowedResendTestRecipients().includes(normalizeAddress(toAddress));

const getSmtpPassword = () => {
  const rawPassword = String(process.env.SMTP_PASS || '');
  if (/smtp\.gmail\.com/i.test(process.env.SMTP_HOST || '')) {
    return rawPassword.replace(/\s+/g, '');
  }
  return rawPassword;
};

let smtpTransporter = null;
const forwardToAdmin = process.env.FORWARD_EMAILS_TO_ADMIN === 'true';

/**
 * Gets or initializes the Nodemailer SMTP transporter.
 */
const getSmtpTransporter = () => {
  if (smtpTransporter) return smtpTransporter;

  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: String(process.env.SMTP_PORT) === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: getSmtpPassword(),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  return smtpTransporter;
};

const sendViaResend = async ({ to, subject, html }) => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = getResendFrom();

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) throw new Error(error.message);
  console.log(`Email sent via Resend to ${to}`);
};

const sendViaSmtp = async ({ to, subject, html }) => {
  const transporter = getSmtpTransporter();

  await transporter.sendMail({
    from: `"Vidyarthi Mitra" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`Email sent via SMTP to ${to}`);
};

const deliveryError = (message) => {
  const error = new Error(message);
  error.code = 'EMAIL_DELIVERY_FAILED';
  return error;
};

const verifySmtpCredentials = async () => {
  if (!hasSmtpConfig()) return { ok: false, reason: 'SMTP is not configured.' };
  try {
    await getSmtpTransporter().verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: String(error.message || error).split('\n')[0] };
  }
};

/**
 * Reports whether email can reach arbitrary recipients, and why not if it cannot.
 *
 * Lost when this module was extracted from utils/sendEmail.js, while three
 * callers kept importing it: the startup check in config/env.js, the
 * /auth/email-status endpoint, and scripts/checkEmail.js. The endpoint is an
 * async handler with no try/catch, so calling it threw an unhandled rejection
 * and server.js — which treats those as fatal — shut the process down. Opening a
 * diagnostic page took the API offline.
 */
const describeEmailConfig = () => {
  const resendFrom = getResendFrom();
  const resendUsable = hasResendConfig() && !isResendTestSender(resendFrom);
  const smtpUsable = hasSmtpConfig();

  const warnings = [];
  if (hasResendConfig() && !resendUsable) {
    warnings.push(
      `RESEND_FROM is "${resendFrom}", Resend's shared test sender. It can only deliver to ` +
      `${getAllowedResendTestRecipients().join(', ') || 'approved test inboxes'}, so signup and ` +
      'login codes for real users fall through to SMTP. Verify a domain and set RESEND_FROM to it.'
    );
  }
  if (!smtpUsable) {
    warnings.push('SMTP_HOST / SMTP_USER / SMTP_PASS are not all set, so there is no fallback sender.');
  }

  // `smtpConfigured` reflects only that the variables are present. Whether they
  // authenticate is a separate question — see verifySmtpCredentials — because a
  // wrong-but-present password is the more common failure and looks identical here.
  return { canDeliverToAnyone: resendUsable || smtpUsable, resendUsable, smtpConfigured: smtpUsable, warnings };
};

/**
 * Core sendEmail function using Nodemailer / Resend
 */
const sendMail = async ({ to, subject, html }) => {
  const resendFrom = getResendFrom();
  const resendErrors = [];

  let recipient = to;
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment && forwardToAdmin) {
    const adminEmail = getAdminEmails()[0] || process.env.SMTP_USER;
    if (adminEmail) {
      recipient = adminEmail;
      console.log(`[DEV MODE - FORWARDED TO ADMIN] Original recipient: ${to}`);
    }
  }

  if (hasResendConfig()) {
    const usingBlockedTestSender =
      isResendTestSender(resendFrom) && !canUseResendTestSender(recipient);

    if (!usingBlockedTestSender) {
      try {
        await sendViaResend({ to: recipient, subject, html });
        return;
      } catch (error) {
        resendErrors.push(`Resend failed: ${error.message}`);
      }
    } else {
      resendErrors.push(
        'Resend is configured with the default onboarding sender, which can only deliver to approved test inboxes.'
      );
    }
  }

  if (hasSmtpConfig()) {
    try {
      await sendViaSmtp({ to: recipient, subject, html });
      return;
    } catch (error) {
      throw deliveryError([...resendErrors, `SMTP failed: ${error.message}`].filter(Boolean).join(' '));
    }
  }

  if (resendErrors.length) {
    throw deliveryError(resendErrors.join(' '));
  }

  throw deliveryError(
    'Email not configured. Set SMTP credentials or configure Resend with a verified sender domain.'
  );
};

module.exports = {
  getSmtpTransporter,
  sendMail,
  verifySmtpCredentials,
  describeEmailConfig,
};
