const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error(
      'Email not configured. Add SMTP_HOST, SMTP_USER, and SMTP_PASS to your .env file. ' +
      'For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=your@gmail.com, ' +
      'SMTP_PASS=your_app_password (generate at https://myaccount.google.com/apppasswords)'
    );
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_PORT) === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
  const transport = getTransporter();
  await transport.sendMail({
    from: `"Vidyarthi Mitra" <${process.env.SMTP_USER}>`,
    to, subject, html
  });
};

module.exports = sendEmail;
