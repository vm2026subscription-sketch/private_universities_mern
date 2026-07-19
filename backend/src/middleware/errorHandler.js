const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';

  if (err.code === 11000) {
    statusCode = 409;
    const duplicateField = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'record';
    message = `${duplicateField} already exists`;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((error) => error.message)
      .join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }

  console.error(`[error] ${req.method} ${req.originalUrl} -> ${statusCode}`);
  console.error(err.stack || err);

  // Never surface an internal error message to the client. Raw driver/runtime
  // messages disclose schema names, file paths and library versions. Errors we
  // classified above (duplicate key, validation, cast) carry safe, intentional
  // messages; anything else falls back to a generic string.
  const isClassified = statusCode < 500;
  const safeMessage = isClassified ? message : 'Something went wrong. Please try again.';

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, detail: message })
  });
};

module.exports = errorHandler;
