const normalizeMapField = (value) => {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (typeof value.toObject === 'function') return value.toObject();
  return value;
};

const toPlainObject = (user) => {
  if (!user) return null;
  return typeof user.toObject === 'function' ? user.toObject() : user;
};

const checkHasCompletedPreferences = (source) => {
  if (source.hasCompletedPreferences === true) return true;
  const p = source.profile || {};
  if (p.state || p.stream || p.preferredCourse || (Array.isArray(p.preferredStates) && p.preferredStates.length > 0)) {
    return true;
  }
  return false;
};

const getSafeUser = (user) => {
  const source = toPlainObject(user);
  if (!source) return null;

  return {
    id: source._id,
    name: source.name,
    email: source.email,
    phone: source.phone,
    countryCode: source.countryCode,
    role: source.role,
    avatar: source.avatar,
    isEmailVerified: source.isEmailVerified,
    isPhoneVerified: source.isPhoneVerified,
    authProvider: source.authProvider,
    status: source.status,
    profileCompleteness: source.profileCompleteness || 0,
    hasCompletedPreferences: checkHasCompletedPreferences(source),
  };
};

const getSafeUserProfile = (user) => {
  const source = toPlainObject(user);
  if (!source) return null;

  return {
    ...getSafeUser(source),
    profile: source.profile || {},
    savedUniversities: source.savedUniversities || [],
    savedCourses: source.savedCourses || [],
    applications: source.applications || [],
    notifications: source.notifications || [],
    ratings: normalizeMapField(source.ratings),
    notes: normalizeMapField(source.notes),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

module.exports = {
  getSafeUser,
  getSafeUserProfile,
};
