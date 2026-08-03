const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { allowAdminOrUniversity, scopeUploadFolder } = require('../middleware/universityTenancy');
const { upload, uploadToCloudinary } = require('../utils/imageUpload');

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
    let url;
    let publicId = '';

    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: `vidyarthi-mitra/${folder}`,
      });
      url = result.url;
      publicId = result.publicId;
    } catch (err) {
      console.warn('[upload] Cloudinary upload failed or unconfigured, using dev base64 fallback:', err.message);
      url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    res.json({
      success: true,
      url,
      data: {
        url,
        publicId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Upload failed: ${error.message}` });
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

    res.json({ success: true, data: { url: result.url, publicId: result.publicId } });
  } catch (error) {
    res.status(500).json({ success: false, message: `Upload failed: ${error.message}` });
  }
});

module.exports = router;
