const router = require('express').Router();
const { protect, admin } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../utils/imageUpload');
const { validateImageUpload } = require('../middleware/fileValidation');
const { inspectImage } = require('../utils/fileSignature');
const { serverError, fail } = require('../utils/apiResponse');
const { isSafeHttpUrl } = require('../utils/validators');

// validateImageUpload runs after Multer and rejects anything whose BYTES are not
// a JPEG/PNG/WebP/GIF. Multer's own filter only sees the client-supplied
// mimetype header, so on its own it would happily accept a script named
// `logo.png` with `Content-Type: image/png`.
router.post('/', protect, admin, upload.single('image'), validateImageUpload, async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 400, 'No image file provided');
    }

    const folder = req.body.folder || 'general';
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `vidyarthi-mitra/${folder}`,
    });

    res.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error) {
    // Was `Upload failed: ${error.message}`, which echoed the raw Cloudinary
    // error to the client.
    return serverError(res, error, 'upload.image');
  }
});

/** Data URI form: data:<mime>;base64,<payload> */
const DATA_URI_PATTERN = /^data:([\w.+-]+\/[\w.+-]+)?;base64,([\s\S]+)$/i;

router.post('/url', protect, admin, async (req, res) => {
  try {
    const { source, folder } = req.body;
    if (!source || typeof source !== 'string') {
      return fail(res, 400, 'Source URL or base64 is required');
    }

    const dataUri = source.match(DATA_URI_PATTERN);

    if (dataUri) {
      // An inline payload is decoded and content-checked here, exactly like a
      // multipart upload — the declared MIME in the data URI is not trusted.
      let buffer;
      try {
        buffer = Buffer.from(dataUri[2], 'base64');
      } catch {
        buffer = null;
      }
      if (!buffer || buffer.length === 0) {
        return fail(res, 400, 'Could not decode the supplied base64 image');
      }

      const inspection = inspectImage(buffer);
      if (!inspection.ok) return fail(res, 400, inspection.message);

      const result = await uploadToCloudinary(buffer, {
        folder: `vidyarthi-mitra/${folder || 'general'}`,
      });
      return res.json({ success: true, data: { url: result.url, publicId: result.publicId } });
    }

    // Remote fetch: Cloudinary, not this server, retrieves the bytes, so the
    // scheme is restricted to http/https. Without this, `file:///etc/passwd` and
    // similar were handed straight to the uploader.
    if (!isSafeHttpUrl(source)) {
      return fail(res, 400, 'Source must be an http(s) URL or a base64 image');
    }

    const result = await uploadToCloudinary(source, {
      folder: `vidyarthi-mitra/${folder || 'general'}`,
    });

    res.json({ success: true, data: { url: result.url, publicId: result.publicId } });
  } catch (error) {
    return serverError(res, error, 'upload.url');
  }
});

module.exports = router;
