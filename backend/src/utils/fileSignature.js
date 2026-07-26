/**
 * Content-based file type detection ("magic bytes").
 *
 * Both upload paths previously trusted metadata the client controls: the image
 * filter compared `file.mimetype` (a header the browser sends and a script can
 * set to anything) and the Excel filter compared the filename extension. Either
 * check passes for a file whose bytes are something else entirely — a PHP
 * payload named `logo.png`, or an HTML/SVG file declared as `image/png` that
 * would become stored XSS if ever served inline from the CDN.
 *
 * These helpers look at the bytes instead. They are intentionally small and
 * dependency-free: the formats accepted here all have fixed, well-known headers,
 * so a library (file-type, which is ESM-only as of v17 and would need a bundler
 * change) buys nothing.
 */

/** Byte-prefix signatures, longest first so PNG never matches as something shorter. */
const PREFIX_SIGNATURES = [
  { kind: 'png', mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { kind: 'ole2', mime: 'application/vnd.ms-excel', bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  { kind: 'gif', mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
  { kind: 'gif', mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
  { kind: 'pdf', mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { kind: 'zip', mime: 'application/zip', bytes: [0x50, 0x4b, 0x03, 0x04] },
  { kind: 'zip', mime: 'application/zip', bytes: [0x50, 0x4b, 0x05, 0x06] },
  { kind: 'zip', mime: 'application/zip', bytes: [0x50, 0x4b, 0x07, 0x08] },
  { kind: 'jpeg', mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { kind: 'bmp', mime: 'image/bmp', bytes: [0x42, 0x4d] },
];

const startsWith = (buffer, bytes) => {
  if (buffer.length < bytes.length) return false;
  for (let i = 0; i < bytes.length; i += 1) {
    if (buffer[i] !== bytes[i]) return false;
  }
  return true;
};

/** RIFF....WEBP — the format tag sits at offset 8, not at the start. */
const isWebp = (buffer) =>
  buffer.length >= 12 &&
  buffer.toString('ascii', 0, 4) === 'RIFF' &&
  buffer.toString('ascii', 8, 12) === 'WEBP';

/**
 * Detects the container format from the leading bytes.
 * @returns {{kind: string, mime: string}|null} null when nothing matched.
 */
const detectSignature = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  if (isWebp(buffer)) return { kind: 'webp', mime: 'image/webp' };

  const match = PREFIX_SIGNATURES.find((signature) => startsWith(buffer, signature.bytes));
  return match ? { kind: match.kind, mime: match.mime } : null;
};

/**
 * Heuristic "is this a text file" test, for CSV — which has no signature at all.
 * A NUL byte or a large share of control characters means binary content was
 * uploaded under a .csv name.
 */
const SAMPLE_BYTES = 8192;

const looksLikeText = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false;

  const sample = buffer.subarray(0, SAMPLE_BYTES);
  let control = 0;

  for (const byte of sample) {
    if (byte === 0x00) return false;
    // Allow tab, LF, CR; everything else below 0x20 (and 0x7f) is suspicious.
    const isAllowedControl = byte === 0x09 || byte === 0x0a || byte === 0x0d;
    if ((byte < 0x20 && !isAllowedControl) || byte === 0x7f) control += 1;
  }

  return control / sample.length < 0.1;
};

/**
 * OOXML containers are ZIPs; the part names sit in the local file headers in
 * plain text, so the workbook can be recognised without unzipping. `xl/` is what
 * separates a real .xlsx from a .docx or .pptx that was renamed.
 */
const isOoxmlWorkbook = (buffer) => {
  const head = buffer.subarray(0, Math.min(buffer.length, 512 * 1024)).toString('latin1');
  return head.includes('[Content_Types].xml') && /xl\/(workbook|_rels|worksheets)/.test(head);
};

const IMAGE_KINDS = new Set(['jpeg', 'png', 'gif', 'webp']);

/**
 * Validates an image buffer.
 *
 * SVG is intentionally unsupported: it is XML with no signature and can embed
 * <script>. Raster formats only, matching the comment in utils/imageUpload.
 *
 * @returns {{ok: true, kind: string, mime: string}|{ok: false, message: string}}
 */
const inspectImage = (buffer) => {
  const detected = detectSignature(buffer);

  if (!detected || !IMAGE_KINDS.has(detected.kind)) {
    return {
      ok: false,
      message: 'File content is not a JPEG, PNG, WebP or GIF image. Re-save the image and try again.',
    };
  }

  return { ok: true, kind: detected.kind, mime: detected.mime };
};

/**
 * Validates a spreadsheet buffer.
 *
 * @param {Buffer} buffer
 * @param {string} [originalName] - only used to decide whether a plain-text body
 *   is an acceptable CSV; the extension is never trusted on its own.
 * @returns {{ok: true, kind: 'xlsx'|'xls'|'csv'}|{ok: false, message: string}}
 */
const inspectSpreadsheet = (buffer, originalName = '') => {
  const detected = detectSignature(buffer);
  const looksCsvByName = /\.(csv|txt)$/i.test(String(originalName || ''));

  if (detected?.kind === 'zip') {
    if (!isOoxmlWorkbook(buffer)) {
      return {
        ok: false,
        message: 'The uploaded archive is not an Excel workbook (no xl/ worksheet parts found).',
      };
    }
    return { ok: true, kind: 'xlsx' };
  }

  if (detected?.kind === 'ole2') {
    return { ok: true, kind: 'xls' };
  }

  // No binary signature matched. Accept only if it really is text AND the caller
  // presented it as a CSV, so a stray binary blob cannot slip through unnamed.
  if (!detected && looksCsvByName && looksLikeText(buffer)) {
    return { ok: true, kind: 'csv' };
  }

  return {
    ok: false,
    message: 'File content is not a valid .xlsx, .xls or .csv file.',
  };
};

module.exports = {
  detectSignature,
  looksLikeText,
  inspectImage,
  inspectSpreadsheet,
};
