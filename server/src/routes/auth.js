const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const User = require('../models/User');

const router = express.Router();

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

      const { name, email, password } = req.body;

      // Check duplicate
      const existing = await db.findOne(User, { email }, (u) => u.email === email);
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const hashedPassword = await bcrypt.hash(password, 12);

      let user;
      if (db.isMongoReady()) {
        user = await User.create({ name, email, password });
      } else {
        user = await db.create(User, {
          name,
          email,
          password: hashedPassword,
          createdAt: new Date().toISOString(),
        });
      }

      const token = generateToken(user._id || user.id);
      res.status(201).json({
        message: 'Account created successfully',
        token,
        user: { id: user._id || user.id, name: user.name, email: user.email },
      });
    } catch (error) {
      console.error('Register error:', error.message);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

      const { email, password } = req.body;

      let user;
      if (db.isMongoReady()) {
        user = await User.findOne({ email }).select('+password');
      } else {
        user = await db.findOne(User, { email }, (u) => u.email === email);
      }

      if (!user) return res.status(401).json({ error: 'Invalid email or password' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

      const token = generateToken(user._id || user.id);
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          targetRole: user.targetRole,
          githubUsername: user.githubUsername,
        },
      });
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

module.exports = router;
