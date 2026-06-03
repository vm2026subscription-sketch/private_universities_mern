const nodemailer = require('nodemailer');

const DEFAULT_RESEND_FROM = 'Vidyarthi Mitra <onboarding@resend.dev>';

const hasResendConfig = () => Boolean(process.env.RESEND_API_KEY);
const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const getResendFrom = () => process.env.RESEND_FROM || DEFAULT_RESEND_FROM;
const isResendTestSender = (fromAddress) => /onboarding@resend\.dev/i.test(fromAddress || '');
const isProduction = () => process.env.NODE_ENV === 'production';

let smtpTransporter = null;

const getSmtpTransporter = () => {
  if (smtpTransporter) return smtpTransporter;

  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: String(process.env.SMTP_PORT) === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return smtpTransporter;
};

const sendViaResend = async ({ to, subject, html }) => {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = getResendFrom();

  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(error.message);
};

const sendViaSmtp = async ({ to, subject, html }) => {
  const transporter = getSmtpTransporter();
  await transporter.sendMail({
    from: `"Vidyarthi Mitra" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const resendFrom = getResendFrom();
  const resendErrors = [];

  if (hasResendConfig()) {
    const usingBlockedTestSender = isProduction() && isResendTestSender(resendFrom);

    if (!usingBlockedTestSender) {
      try {
        await sendViaResend({ to, subject, html });
        return;
      } catch (error) {
        resendErrors.push(`Resend failed: ${error.message}`);
      }
    } else {
      resendErrors.push(
        'Resend is configured with the default onboarding sender, which cannot send production emails to arbitrary recipients.'
      );
    }
  }

  if (hasSmtpConfig()) {
    try {
      await sendViaSmtp({ to, subject, html });
      return;
    } catch (error) {
      throw new Error(
        [...resendErrors, `SMTP failed: ${error.message}`].filter(Boolean).join(' ')
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
