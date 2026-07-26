/**
 * Post-Multer upload validation.
 *
 * Multer's own `fileFilter` runs before any bytes are read, so it can only ever
 * inspect the client-supplied filename and MIME header. These middlewares run
 * after the buffer is in memory and check the actual content (see
 * utils/fileSignature), which is the only check an attacker cannot forge.
 *
 * Mount them directly after `upload.single(...)`:
 *   router.post('/', protect, admin, upload.single('image'), validateImageUpload, handler)
 *
 * A missing file is deliberately passed through: several routes already return
 * their own tailored "No file provided" message, and duplicating that here would
 * change those responses.
 */

const { inspectImage, inspectSpreadsheet } = require('../utils/fileSignature');
const { fail } = require('../utils/apiResponse');

const validateImageUpload = (req, res, next) => {
  if (!req.file?.buffer) return next();

  const result = inspectImage(req.file.buffer);
  if (!result.ok) return fail(res, 400, result.message);

  // The sniffed type is authoritative from here on; overwrite the client's
  // claim so nothing downstream re-trusts the forged header.
  req.file.mimetype = result.mime;
  req.detectedFile = { kind: result.kind, mime: result.mime };
  return next();
};

const validateSpreadsheetUpload = (req, res, next) => {
  if (!req.file?.buffer) return next();

  const result = inspectSpreadsheet(req.file.buffer, req.file.originalname);
  if (!result.ok) return fail(res, 400, result.message, { error: result.message });

  req.detectedFile = { kind: result.kind };
  return next();
};

module.exports = {
  validateImageUpload,
  validateSpreadsheetUpload,
};
