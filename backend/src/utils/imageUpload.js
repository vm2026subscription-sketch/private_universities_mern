const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Multer memory storage for buffer-based uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, GIF, and SVG images are allowed'), false);
  }
};

// Multer middleware — max 5MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

/**
 * Upload a buffer/file to Cloudinary
 * @param {Buffer|string} source - File buffer or base64 data URI
 * @param {object} options - { folder, publicId, transformation }
 * @returns {Promise<{url, publicId, width, height}>}
 */
const uploadToCloudinary = (source, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'vidyarthi-mitra',
      public_id: options.publicId || undefined,
      resource_type: 'image',
      overwrite: true,
      transformation: options.transformation || [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    };

    // If source is a buffer
    if (Buffer.isBuffer(source)) {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height
        });
      });
      stream.end(source);
    } else {
      // If source is a base64 data URI or URL
      cloudinary.uploader.upload(source, uploadOptions, (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height
        });
      });
    }
  });
};

/**
 * Delete an image from Cloudinary by public ID
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('[cloudinary] Delete failed:', error.message);
  }
};

/**
 * Upload middleware handler — attaches result to req.uploadedImage
 * Usage: router.post('/upload', upload.single('image'), handleImageUpload('banners'), ...)
 */
const handleImageUpload = (folder = 'general') => async (req, res, next) => {
  if (!req.file) return next();

  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `vidyarthi-mitra/${folder}`
    });
    req.uploadedImage = result;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Image upload failed: ' + error.message });
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  handleImageUpload
};
