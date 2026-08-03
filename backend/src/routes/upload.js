const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { allowAdminOrUniversity, scopeUploadFolder } = require('../middleware/universityTenancy');
const { upload, uploadToCloudinary } = require('../utils/imageUpload');

/**
 * Turns a provider error into something the uploader can act on.
 *
 * A university trying to add a campus photo was shown
 * "Upload failed: Invalid cloud_name vm-private-universiti" — our deployment
 * configuration, verbatim, to a customer who can neither fix nor understand it,
 * and who would reasonably conclude their file was the problem. The detail
 * belongs in the server log, where whoever set the credentials will see it.
 */
const uploadFailure = (error, req) => {
  const detail = error?.message || String(error);
  console.error(`[upload] failed for user ${req.user?._id}: ${detail}`);

  const isConfigProblem = /cloud_name|api_key|api_secret|Must supply/i.test(detail);

  return {
    success: false,
    message: isConfigProblem
      ? 'Image uploads are temporarily unavailable. Our team has been notified — please try again later.'
      : 'Could not upload that image. Please check the file and try again.',
  };
};

/**
 * University accounts need this endpoint for their logo, cover image and
 * gallery. It was admin-only, which left the dashboard's image features with no
 * way to obtain a URL. scopeUploadFolder pins tenants to their own folder so
 * widening access does not let them write among the platform's assets.
 */
// scopeUploadFolder runs AFTER multer: multipart fields are not on req.body
// until multer has parsed the request, so scoping first would be overwritten by
// whatever folder the client sent.
router.post('/', protect, allowAdminOrUniversity, upload.single('image'), scopeUploadFolder, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const folder = req.body.folder || 'general';

    /**
     * A failed upload must fail, not degrade.
     *
     * The previous fallback returned the whole image as a `data:` URL when
     * Cloudinary was unreachable. Callers save whatever URL they get back, so a
     * transient outage would have written multi-megabyte base64 strings into
     * University documents — permanently, and invisibly, since the response
     * still said `success: true`.
     */
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `vidyarthi-mitra/${folder}`,
    });

    res.json({
      success: true,
      // Duplicated at the top level for clients that read `res.data.url`
      // directly; `data` remains the canonical shape.
      url: result.url,
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error) {
    res.status(500).json(uploadFailure(error, req));
  }
});

// JSON body, so express.json has already populated req.body and the folder can
// be scoped before the handler runs.
router.post('/url', protect, allowAdminOrUniversity, scopeUploadFolder, async (req, res) => {
  try {
    const { source, folder } = req.body;
    if (!source) {
      return res.status(400).json({ success: false, message: 'Source URL or base64 is required' });
    }

    const result = await uploadToCloudinary(source, {
      folder: `vidyarthi-mitra/${folder || 'general'}`,
    });

    res.json({ success: true, url: result.url, data: { url: result.url, publicId: result.publicId } });
  } catch (error) {
    res.status(500).json(uploadFailure(error, req));
  }
});

module.exports = router;
