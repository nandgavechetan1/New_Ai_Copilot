const jwt = require('jsonwebtoken');
const db = require('../config/database');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please login.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    const user = await db.findOne(
      User,
      { _id: decoded.userId },
      (u) => (u._id || u.id) === decoded.userId
    );

    if (!user) return res.status(401).json({ error: 'User not found. Please login again.' });

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token.' });
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired. Please login again.' });
    next(error);
  }
};

module.exports = auth;
