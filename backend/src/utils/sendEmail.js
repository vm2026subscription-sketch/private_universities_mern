const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const disableEmails = process.env.DISABLE_EMAILS === 'true';
const adminEmail = process.env.ADMIN_EMAIL || 'vidyarthimitrauniversity@gmail.com';

// In development, you can force all emails to this address
const forwardToAdmin = process.env.FORWARD_EMAILS_TO_ADMIN === 'true';

const sendEmail = async ({ to, subject, html }) => {
  // 1. If emails are completely disabled, just log
  if (disableEmails || (isDevelopment && !process.env.SEND_EMAILS_IN_DEV)) {
    console.log(`📧 [DEV MODE - EMAIL NOT SENT]`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Content preview: ${html.slice(0, 200)}...`);
    return { success: true, dev: true };
  }

  // 2. In development, optionally forward all emails to admin email
  let recipient = to;
  if (isDevelopment && forwardToAdmin) {
    recipient = adminEmail;
    console.log(`📧 [DEV MODE - FORWARDED TO ADMIN] Original recipient: ${to}`);
  }

  // 3. Use Resend if API key is present (production or if explicitly wanted in dev)
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM || 'Vidyarthi Mitra <onboarding@resend.dev>';

    try {
      const { error } = await resend.emails.send({
        from,
        to: recipient,
        subject,
        html,
      });
      if (error) throw new Error(error.message);
      console.log(`✅ Email sent via Resend to ${recipient}`);
      return;
    } catch (err) {
      console.error(`❌ Resend failed: ${err.message}`);
      if (isProduction) throw err;
      console.log(`⚠️ Falling back to console log in dev mode.`);
      // In dev, fallback to logging instead of failing
      return;
    }
  }

  // 4. Fallback to SMTP (if configured)
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (!isDevelopment) throw new Error('Email not configured. Set RESEND_API_KEY or SMTP credentials.');
    console.log(`⚠️ No email provider configured. Email not sent.`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: String(process.env.SMTP_PORT) === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Vidyarthi Mitra" <${process.env.SMTP_USER}>`,
    to: recipient,
    subject,
    html,
  });
  console.log(`✅ Email sent via SMTP to ${recipient}`);
};

module.exports = sendEmail;