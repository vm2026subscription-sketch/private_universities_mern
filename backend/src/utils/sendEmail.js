const { sendMail, verifySmtpCredentials, describeEmailConfig } = require('../config/mail');

/**
 * Thin wrapper kept so existing call sites keep working after the mailer moved
 * to config/mail.js. Both diagnostics are re-exported here as well: env.js,
 * /auth/email-status and scripts/checkEmail.js all import them from this path,
 * and dropping either one from the re-export is what took the server down.
 */
const sendEmail = async (options) => sendMail(options);

module.exports = sendEmail;
module.exports.verifySmtpCredentials = verifySmtpCredentials;
module.exports.describeEmailConfig = describeEmailConfig;
