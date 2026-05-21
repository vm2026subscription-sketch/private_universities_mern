const nodemailer = require('nodemailer');

let transporter = null;
let testTransporter = null;
let useEthereal = false;

const createTestTransporter = async () => {
  if (testTransporter) return testTransporter;

  const testAccount = await nodemailer.createTestAccount();
  testTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  useEthereal = true;
  console.log('[email] Ethereal test account created:', testAccount.user);
  return testTransporter;
};

const getTransporter = async () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Email not configured. Add SMTP_HOST, SMTP_USER, and SMTP_PASS to your .env file.'
      );
    }

    return createTestTransporter();
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: String(process.env.SMTP_PORT) === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
  let transport = await getTransporter();

  const send = async (mailer) => mailer.sendMail({
    from: `"Vidyarthi Mitra" <${process.env.SMTP_USER || 'no-reply@example.com'}>`,
    to,
    subject,
    html,
  });

  try {
    const info = await send(transport);
    if (useEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[email] Preview URL: ${previewUrl}`);
      }
    }
    return info;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !useEthereal) {
      console.warn('[email] SMTP send failed, falling back to Ethereal preview:', error.message);
      transport = await createTestTransporter();
      const info = await send(transport);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[email] Preview URL: ${previewUrl}`);
      }
      return info;
    }

    throw error;
  }
};

module.exports = sendEmail;
