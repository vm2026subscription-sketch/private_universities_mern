const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Validate security-critical configuration BEFORE anything else loads. A weak,
// placeholder or missing JWT secret must abort startup rather than silently
// produce forgeable tokens.
const { validateEnvironment } = require('./config/env');

try {
  validateEnvironment();
} catch (error) {
  console.error('[startup] Configuration error — refusing to start.');
  console.error(error.message);
  process.exit(1);
}

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

    // Deliberately not awaited: a slow or unreachable mail host must not delay
    // the server accepting traffic. Login still needs email to work, so the
    // result is logged prominently.
    const { verifySmtpCredentials } = require('./utils/sendEmail');
    void verifySmtpCredentials().then(({ ok, reason }) => {
      if (ok) {
        console.log(`[startup] SMTP credentials verified for ${process.env.SMTP_USER}.`);
      } else {
        console.error(
          `[startup] SMTP LOGIN CHECK FAILED for ${process.env.SMTP_USER || '(no SMTP_USER)'}: ${reason}`
        );
        console.error(
          '[startup] Verification codes cannot be sent, so no user will be able to log in. ' +
          'A Gmail app password only works with the exact account that generated it — ' +
          'confirm SMTP_USER and SMTP_PASS belong to the same mailbox.'
        );
      }
    });

    /**
     * Subscription expiry sweep.
     *
     * Kept as a timer for local and always-on hosts, but it cannot be the only
     * trigger: this deploy sleeps when idle, and a sleeping process does not
     * fire a 12-hour interval — so on a quiet week the sweep silently never
     * runs and nobody is told their subscription lapsed. POST /api/v1/cron/run
     * exists so an external scheduler can drive it on a fixed clock instead.
     */
    const { checkSubscriptionExpirations } = require('./services/subscriptionChecker');
    void checkSubscriptionExpirations();
    setInterval(() => {
      void checkSubscriptionExpirations();
    }, 12 * 60 * 60 * 1000);

    // Same reasoning as the SMTP check: without it, a mismatched cloud name is
    // discovered by a university trying to add photos, as "Invalid cloud_name".
    const { verifyCloudinaryCredentials } = require('./config/cloudinary');
    void verifyCloudinaryCredentials().then(({ ok, reason }) => {
      if (ok) {
        console.log(`[startup] Cloudinary verified for cloud "${process.env.CLOUDINARY_CLOUD_NAME}".`);
      } else {
        console.error(
          `[startup] CLOUDINARY CHECK FAILED for cloud "${process.env.CLOUDINARY_CLOUD_NAME || '(not set)'}": ${reason}`
        );
        console.error(
          '[startup] Image uploads will fail — logos, cover images and gallery photos. ' +
          '"cloud_name mismatch" means the API key belongs to a different cloud than the name; ' +
          'copy all three values from the same Cloudinary dashboard.'
        );
      }
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
