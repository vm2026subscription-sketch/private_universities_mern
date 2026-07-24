const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const mongoose = require('mongoose');

const uploadExcelRoutes = require('./routes/uploadExcel');
const passportConfig = require('./config/passport');

const authRoutes = require('./routes/auth');
const universityRoutes = require('./routes/universities');
const courseRoutes = require('./routes/courses');
const examRoutes = require('./routes/exams');
const newsRoutes = require('./routes/news');
const userRoutes = require('./routes/users');
const questionRoutes = require('./routes/questions');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const uploadRoutes = require('./routes/upload');
const bhashiniRoutes = require('./routes/bhashini');
const sitemapRoutes = require('./routes/sitemap');

const errorHandler = require('./middleware/errorHandler');
const { isProduction } = require('./config/env');
const compression = require('compression');

const app = express();

app.set('trust proxy', 1);
app.use(compression());

const BASE_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://privateuniversity.vidyarthimitra.org',
  'https://www.privateuniversity.vidyarthimitra.org',
  'https://university.vidyarthimitra.org',
  'https://www.university.vidyarthimitra.org',
  'https://private-universities-mern.vercel.app',
  'https://private-universities-mern-git-main-vidyarthimitras-projects.vercel.app',
];

const allowedOrigins = [
  ...BASE_ORIGINS,
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean),
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  // Cache CORS preflight (OPTIONS) responses in the browser for 24h so repeat
  // cross-origin requests skip the extra preflight round-trip.
  maxAge: 86400,
};

const googleAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
);

app.use(
  helmet({
    // The API serves JSON and redirects only; a restrictive CSP costs nothing
    // and blunts any reflected-content surface.
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    referrerPolicy: { policy: 'no-referrer' },
    // isProduction() is true unless a development environment was declared
    // explicitly, so an unset NODE_ENV keeps HSTS ON rather than silently
    // disabling it.
    hsts: isProduction()
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());

// Auth endpoints accept only small JSON payloads. Applying the 10mb limit to
// them (as the single global parser previously did) needlessly exposes the
// unauthenticated surface to memory-exhaustion attempts.
app.use('/api/v1/auth', express.json({ limit: '32kb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in a few minutes.',
  },
});

app.use('/api', limiter);

if (googleAuthConfigured) {
  passportConfig(passport);
  app.use(passport.initialize());
} else {
  console.warn(
    '[startup] Google OAuth is disabled because GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL is missing.'
  );
}

const getDatabaseStatus = () =>
  mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

const healthPayload = () => ({
  success: true,
  status: 'ok',
  services: {
    api: 'up',
    database: getDatabaseStatus(),
  },
});

app.get('/', (req, res) => {
  res.json({
    message: 'Vidyarthi Mitra API v1',
    ...healthPayload(),
  });
});

app.get('/health', (req, res) => res.status(200).json(healthPayload()));
app.get('/api/v1/health', (req, res) => res.status(200).json(healthPayload()));

// SEO: XML sitemaps served from the site root (proxied onto the public domain).
app.use('/', sitemapRoutes);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/universities', universityRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/news', newsRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/bhashini', bhashiniRoutes);
app.use('/api/v1', publicRoutes);
app.use('/api/v1/admin/upload', uploadExcelRoutes);

app.use(errorHandler);

module.exports = app;
