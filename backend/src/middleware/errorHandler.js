const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  console.error(`[error] ${req.method} ${req.originalUrl} -> ${statusCode}`);
  console.error(err.stack || err);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
