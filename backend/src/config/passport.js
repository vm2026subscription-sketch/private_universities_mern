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
      const primaryEmail = profile.emails?.[0];
      const email = normalizeEmail(primaryEmail?.value);
      if (!email) {
        return done(new Error('Google account did not provide an email address.'), null);
      }

      // Google reports whether it actually verified ownership of the address.
      // Trusting an unverified one would let someone link an arbitrary address
      // to their Google identity and take over the matching local account below.
      // The field is absent on some payload shapes, so only an explicit `false`
      // is treated as a rejection.
      if (primaryEmail.verified === false || primaryEmail.verified === 'false') {
        return done(new Error('Your Google email address is not verified.'), null);
      }

      // Optional chaining on the ARRAY as well: a profile with no photos would
      // otherwise throw on `profile.photos[0]`.
      const photo = profile.photos?.[0]?.value;

      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        if (user.status === 'banned' || user.status === 'suspended') {
          return done(new Error('This account is not allowed to sign in right now.'), null);
        }
        return done(null, user);
      }

      user = await User.findOne({ email });
      if (user) {
        if (user.status === 'banned' || user.status === 'suspended') {
          return done(new Error('This account is not allowed to sign in right now.'), null);
        }
        user.googleId = profile.id;
        user.avatar = user.avatar || photo;
        user.authProvider = 'google';
        user.isEmailVerified = true;
        await user.save();
        return done(null, user);
      }

      user = await User.create({
        name: profile.displayName,
        email,
        googleId: profile.id,
        avatar: photo,
        authProvider: 'google',
        status: 'active',
        isEmailVerified: true
        // role intentionally omitted -> schema default 'user'
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
