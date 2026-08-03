const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

/**
 * Confirms the credentials actually belong together, without uploading anything.
 *
 * Presence checks are not enough here for the same reason they were not enough
 * for SMTP: a cloud name paired with another cloud's API key passes every
 * "is it set?" test and then fails on the first real upload, with the error
 * surfacing to a university trying to add photos rather than to whoever
 * configured the deploy. `cloud_name mismatch` in particular reads like a bug in
 * the app, when it means the three values came from two different accounts.
 */
const verifyCloudinaryCredentials = async () => {
  if (!hasCloudinaryConfig()) {
    return { ok: false, reason: 'Cloudinary is not configured.' };
  }

  try {
    await cloudinary.api.ping();
    return { ok: true };
  } catch (error) {
    const reason = error?.message || error?.error?.message || String(error);
    return { ok: false, reason };
  }
};

module.exports = cloudinary;
module.exports.hasCloudinaryConfig = hasCloudinaryConfig;
module.exports.verifyCloudinaryCredentials = verifyCloudinaryCredentials;
