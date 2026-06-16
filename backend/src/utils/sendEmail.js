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

  console.log(`✅ Email sent via Resend to ${to}`);
};

const sendViaSmtp = async ({ to, subject, html }) => {
  const transporter = getSmtpTransporter();

  await transporter.sendMail({
    from: `"Vidyarthi Mitra" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`✅ Email sent via SMTP to ${to}`);
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
      console.log(`📧 [DEV MODE - FORWARDED TO ADMIN] Original recipient: ${to}`);
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
      throw new Error(
        [...resendErrors, `SMTP failed: ${error.message}`]
          .filter(Boolean)
          .join(' ')
      );
    }
  }

  if (resendErrors.length) {
    throw new Error(resendErrors.join(' '));
  }

  throw new Error(
    'Email not configured. Set SMTP credentials or configure Resend with a verified sender domain.'
  );
};

module.exports = sendEmail;
