const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const mongoose = require('mongoose');

const passportConfig = require('./config/passport');

const authRoutes = require('./routes/auth');
const universityRoutes = require('./routes/universities');
const courseRoutes = require('./routes/courses');
const examRoutes = require('./routes/exams');
const newsRoutes = require('./routes/news');
const userRoutes = require('./routes/users');
const questionRoutes = require('./routes/questions');
const adminRoutes = require('./routes/admin');

const errorHandler = require('./middleware/errorHandler');

const app = express();

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const googleAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
);

app.use(helmet());
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/universities', universityRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/news', newsRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(errorHandler);

module.exports = app;
