/**
 * Shared HTTP response helpers.
 *
 * Every endpoint previously hand-rolled its own JSON, which drifted into three
 * different error shapes ({ success, message }, { error }, and Express' default
 * HTML 404) and two different pagination shapes (flat vs nested). Routing all
 * of them through these helpers means a client can rely on exactly one contract:
 *
 *   error    -> { success: false, message: "..." }
 *   list     -> { success: true, data: [...], total, page, limit, pages,
 *                 pagination: { total, page, limit, pages } }
 *
 * The flat pagination fields and the nested `pagination` object always carry the
 * same numbers. Both are emitted because existing consumers read one or the
 * other (Universities/Home/About/AuditLogViewer read `total`; the courses page
 * reads `pagination.pages`), so neither can be dropped without a frontend change.
 */

const DEFAULT_SERVER_MESSAGE = 'Something went wrong. Please try again.';

const isDevelopment = () => process.env.NODE_ENV === 'development';

/** Multer surfaces upload problems as MulterError with a machine code. */
const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'File is too large',
  LIMIT_FILE_COUNT: 'Too many files uploaded',
  LIMIT_PART_COUNT: 'Too many form parts',
  LIMIT_FIELD_KEY: 'Field name is too long',
  LIMIT_FIELD_VALUE: 'Field value is too long',
  LIMIT_FIELD_COUNT: 'Too many form fields',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
};

/**
 * Maps a thrown error onto a client-safe { statusCode, message }.
 *
 * `classified` is true when the message was produced deliberately here (or by a
 * caller that set `statusCode` below 500) and is therefore safe to return. For
 * anything else the real message is withheld — raw driver/runtime strings
 * disclose schema names, file paths and library versions — and returned in
 * `detail` only so the caller can log it.
 */
const classifyError = (err = {}) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'record';
    return { statusCode: 409, message: `${field} already exists`, classified: true };
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {})
      .map((error) => error.message)
      .join(', ');
    return { statusCode: 400, message: message || 'Validation failed', classified: true };
  }

  if (err.name === 'CastError') {
    return { statusCode: 400, message: `Invalid ${err.path}`, classified: true };
  }

  if (err.name === 'MulterError') {
    return {
      statusCode: 400,
      message: MULTER_MESSAGES[err.code] || 'File upload rejected',
      classified: true,
    };
  }

  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;

  if (statusCode < 500) {
    return { statusCode, message: err.message || 'Request failed', classified: true };
  }

  return {
    statusCode,
    message: DEFAULT_SERVER_MESSAGE,
    classified: false,
    detail: err.message,
  };
};

/** Deliberate, client-facing failure. */
const fail = (res, statusCode, message, extra = {}) =>
  res.status(statusCode).json({ success: false, message, ...extra });

/**
 * Terminal handler for a caught exception.
 *
 * Replaces the `res.status(500).json({ success: false, message: error.message })`
 * that every controller used to repeat: that returned 500 even for a duplicate
 * key or a bad ObjectId, and echoed the raw driver message back to the client.
 *
 * @param {string} context - "controller.action", used only in the server log.
 */
const serverError = (res, error, context = 'api') => {
  const { statusCode, message, classified, detail } = classifyError(error || {});

  if (!classified) {
    console.error(`[${context}] unhandled failure:`, error);
  } else if (statusCode >= 500) {
    console.error(`[${context}] ${message}`);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(isDevelopment() && detail ? { detail } : {}),
  });
};

/**
 * Reads `page` / `limit` off a query string.
 *
 * `isPaginated` is false when the caller supplied NEITHER parameter. Admin list
 * endpoints use that to keep returning the complete list, so adding pagination
 * support does not silently truncate screens that render everything today. A
 * caller that sends either parameter opts into real pagination.
 */
const parsePagination = (query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const hasPage = query.page !== undefined && query.page !== '';
  const hasLimit = query.limit !== undefined && query.limit !== '';

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    isPaginated: hasPage || hasLimit,
  };
};

/**
 * The one paginated-list response shape.
 *
 * @param {number|null} limit - page size, or null for "everything in one page".
 */
const paginated = (res, { data, total, page = 1, limit = null, extra = {} }) => {
  const effectiveLimit = limit === null ? total || 0 : limit;
  const pages = effectiveLimit > 0 ? Math.ceil(total / effectiveLimit) : 1;
  const meta = { total, page, limit: effectiveLimit, pages };

  return res.json({
    success: true,
    data,
    ...meta,
    pagination: meta,
    ...extra,
  });
};

module.exports = {
  DEFAULT_SERVER_MESSAGE,
  classifyError,
  fail,
  serverError,
  parsePagination,
  paginated,
};
