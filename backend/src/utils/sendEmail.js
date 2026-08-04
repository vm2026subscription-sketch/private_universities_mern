const { sendMail, verifySmtpCredentials } = require('../config/mail');

const sendEmail = async (options) => {
  return await sendMail(options);
};

module.exports = sendEmail;
module.exports.verifySmtpCredentials = verifySmtpCredentials;
