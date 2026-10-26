const jwt = require('jsonwebtoken');
const User = require('../models/User');

const extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length > 1) {
      const token = parts[1].trim();
      if (token && token !== 'undefined' && token !== 'null' && token !== 'mock-google-token' && token !== '') {
        return token;
      }
    }
  }
  return null;
};

const protect = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no valid token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforstrydclubauthtokens');
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found, authorization failed' });
    }

    next();
  } catch (error) {
    console.error(`Auth Middleware Error: ${error.message}`);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const optionalProtect = async (req, res, next) => {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforstrydclubauthtokens');
      req.user = await User.findById(decoded.id);
    } catch (error) {
      // Don't reject the request, let it proceed with req.user = null
      req.user = null;
    }
  }

  next();
};

module.exports = { protect, optionalProtect };
