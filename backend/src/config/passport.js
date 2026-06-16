const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = normalizeEmail(profile.emails?.[0]?.value);
      if (!email) {
        return done(new Error('Google account did not provide an email address.'), null);
      }

      let user = await User.findOne({ googleId: profile.id });
      if (user) return done(null, user);
      user = await User.findOne({ email });
      if (user) {
        if (user.status === 'banned' || user.status === 'suspended') {
          return done(new Error('This account is not allowed to sign in right now.'), null);
        }
        user.googleId = profile.id;
        user.avatar = user.avatar || profile.photos[0]?.value;
        user.authProvider = 'google';
        user.isEmailVerified = true;
        await user.save();
        return done(null, user);
      }
      user = await User.create({
        name: profile.displayName,
        email,
        googleId: profile.id,
        avatar: profile.photos[0]?.value,
        authProvider: 'google',
        status: 'active',
        isEmailVerified: true
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
