const { classifyError } = require('../utils/apiResponse');

/**
 * Terminal Express error handler.
 *
 * Classification (duplicate key -> 409, ValidationError -> 400, CastError ->
 * 400, MulterError -> 400) and the decision to withhold internal messages on a
 * 500 both live in utils/apiResponse.classifyError, so an error produces the
 * same status and the same body whether a controller caught it and called
 * serverError() or it bubbled all the way up to here.
 */
const errorHandler = (err, req, res, next) => {
  const { statusCode, message, classified, detail } = classifyError(err || {});

  console.error(`[error] ${req.method} ${req.originalUrl} -> ${statusCode}`);
  console.error(err?.stack || err);

  // Never surface an internal error message to the client. Raw driver/runtime
  // messages disclose schema names, file paths and library versions. Errors that
  // classifyError recognised carry safe, intentional messages; anything else
  // falls back to a generic string.
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err?.stack,
      detail: classified ? message : detail,
    }),
  });
};

/**
 * 404 for any unmatched route.
 *
 * Previously an unknown path fell through to Express' default handler, which
 * replies with an HTML error page — the one place the API did not return JSON, so
 * a client parsing `response.data.message` got a parse error instead of a reason.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = errorHandler;
module.exports.errorHandler = errorHandler;
module.exports.notFoundHandler = notFoundHandler;
