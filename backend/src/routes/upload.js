const router = require('express').Router();
const { protect, admin } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../utils/imageUpload');

router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
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
    res.status(500).json({ success: false, message: `Upload failed: ${error.message}` });
  }
});

router.post('/url', protect, admin, async (req, res) => {
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
