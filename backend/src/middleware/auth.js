const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    if (req.user.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Account has been banned' });
    }
    if (req.user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account is suspended' });
    }
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

exports.admin = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

exports.superAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Super admin access required' });
  }
  next();
};
