const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Use Resend if API key is set, otherwise fall back to SMTP
const useResend = () => Boolean(process.env.RESEND_API_KEY);

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

const sendEmail = async ({ to, subject, html }) => {
  if (useResend()) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM || 'Vidyarthi Mitra <onboarding@resend.dev>';

    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) throw new Error(error.message);
    return;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email not configured. Set RESEND_API_KEY or SMTP credentials.');
  }

  const transporter = getSmtpTransporter();
  await transporter.sendMail({
    from: `"Vidyarthi Mitra" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
