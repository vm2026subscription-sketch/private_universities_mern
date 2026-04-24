const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = Number(process.env.PORT) || 5000;

let server;
let isShuttingDown = false;

const closeHttpServer = () =>
  new Promise((resolve, reject) => {
    if (!server || !server.listening) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      console.log('[shutdown] HTTP server closed.');
      resolve();
    });
  });

const closeMongoConnection = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  console.log('[shutdown] MongoDB connection closed.');
};

const shutdown = async (signal, error) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (signal) {
    console.log(`[shutdown] ${signal} received. Starting graceful shutdown...`);
  }

  if (error) {
    console.error('[shutdown] Runtime error:', error);
  }

  try {
    await closeHttpServer();
    await closeMongoConnection();
    process.exit(error ? 1 : 0);
  } catch (shutdownError) {
    console.error('[shutdown] Failed to close resources cleanly:', shutdownError);
    process.exit(1);
  }
};

const handleFatalError = (signal, error) => {
  const normalizedError =
    error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error));

  void shutdown(signal, normalizedError);
};

const startServer = async () => {
  console.log('[startup] Starting backend service...');
  console.log(`[startup] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[startup] Waiting for MongoDB before listening on port ${PORT}...`);

  try {
    await connectDB();

    server = http.createServer(app);

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        handleFatalError(
          'SERVER_ERROR',
          new Error(`Port ${PORT} is already in use. Stop the other process or change PORT in backend/.env.`)
        );
        return;
      }

      handleFatalError('SERVER_ERROR', error);
    });

    server.listen(PORT, () => {
      console.log(`[startup] Backend ready on http://localhost:${PORT}`);
      console.log(`[startup] Health check available at http://localhost:${PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('[startup] Backend failed to start.');
    console.error(`[startup] ${error.message}`);
    await shutdown('STARTUP_FAILURE', error);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
  handleFatalError('UNHANDLED_REJECTION', reason);
});

process.on('uncaughtException', (error) => {
  handleFatalError('UNCAUGHT_EXCEPTION', error);
});

void startServer();
