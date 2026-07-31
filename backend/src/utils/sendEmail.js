const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const DEFAULT_RESEND_FROM = 'Vidyarthi Mitra <onboarding@resend.dev>';

const hasResendConfig = () => Boolean(process.env.RESEND_API_KEY);

const hasSmtpConfig = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );

const getResendFrom = () =>
  process.env.RESEND_FROM || DEFAULT_RESEND_FROM;

const isResendTestSender = (fromAddress) =>
  /onboarding@resend\.dev/i.test(fromAddress || '');

const normalizeAddress = (value) =>
  String(value || '').trim().toLowerCase();

const getAdminEmails = () =>
  String(process.env.ADMIN_EMAIL || '')
    .split(',')
    .map(normalizeAddress)
    .filter(Boolean);

const getAllowedResendTestRecipients = () =>
  [
    ...new Set([
      normalizeAddress(process.env.SMTP_USER),
      ...getAdminEmails(),
    ]),
  ].filter(Boolean);

const canUseResendTestSender = (toAddress) =>
  getAllowedResendTestRecipients().includes(
    normalizeAddress(toAddress)
  );

const getSmtpPassword = () => {
  const rawPassword = String(process.env.SMTP_PASS || '');

  if (/smtp\.gmail\.com/i.test(process.env.SMTP_HOST || '')) {
    return rawPassword.replace(/\s+/g, '');
  }

  return rawPassword;
};

let smtpTransporter = null;

// In development, you can force all emails to this address
const forwardToAdmin = process.env.FORWARD_EMAILS_TO_ADMIN === 'true';

const getSmtpTransporter = () => {
  if (smtpTransporter) {
    return smtpTransporter;
  }

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

  if (error) {
    throw new Error(error.message);
  }

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

/**
 * Delivery failures are tagged so callers can tell "we could not send the mail"
 * apart from a genuine server fault. Login previously collapsed both into a bare
 * 500, which made an email-provider outage indistinguishable from a broken API.
 */
const deliveryError = (message) => {
  const error = new Error(message);
  error.code = 'EMAIL_DELIVERY_FAILED';
  return error;
};

/**
 * Reports whether email can actually be delivered to arbitrary recipients.
 * Surfaced at startup so a deploy missing SMTP credentials is visible in the
 * logs immediately rather than at the first user's login attempt.
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

  // NOTE: `smtpUsable` reflects only that the variables are present. Whether
  // they actually authenticate is a separate question — see
  // verifySmtpCredentials() — because a wrong-but-present password is the more
  // common failure and looks identical here.
  return { canDeliverToAnyone: resendUsable || smtpUsable, resendUsable, smtpConfigured: smtpUsable, warnings };
};

/**
 * Authenticates against the SMTP server without sending anything.
 *
 * Checking only that SMTP_HOST/USER/PASS are *present* is not enough: a Gmail
 * app password is bound to the account that generated it, so pairing one with a
 * different SMTP_USER passes every presence check and then fails at send time
 * with `535-5.7.8`. Because the login OTP is delivered by email, that mismatch
 * takes down sign-in for every user while the config looks correct.
 */
const verifySmtpCredentials = async () => {
  if (!hasSmtpConfig()) return { ok: false, reason: 'SMTP is not configured.' };

  try {
    await getSmtpTransporter().verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: String(error.message || error).split('\n')[0] };
  }
};

const sendEmail = async ({ to, subject, html }) => {
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
      isResendTestSender(resendFrom) &&
      !canUseResendTestSender(recipient);

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
      throw deliveryError(
        [...resendErrors, `SMTP failed: ${error.message}`]
          .filter(Boolean)
          .join(' ')
      );
    }
  }

  if (resendErrors.length) {
    throw deliveryError(resendErrors.join(' '));
  }

  throw deliveryError(
    'Email not configured. Set SMTP credentials or configure Resend with a verified sender domain.'
  );
};

module.exports = sendEmail;
module.exports.describeEmailConfig = describeEmailConfig;
module.exports.verifySmtpCredentials = verifySmtpCredentials;
