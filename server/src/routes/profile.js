const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const db = require('../config/database');
const User = require('../models/User');

const router = express.Router();

// GET /api/profile
router.get('/', auth, async (req, res) => {
  res.json({
    id: req.user._id || req.user.id,
    name: req.user.name,
    email: req.user.email,
    targetRole: req.user.targetRole || null,
    githubUsername: req.user.githubUsername || null,
    university: req.user.university || null,
    graduationYear: req.user.graduationYear || null,
    bio: req.user.bio || null,
    createdAt: req.user.createdAt,
  });
});

// PATCH /api/profile
router.patch(
  '/',
  auth,
  [
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
    body('targetRole').optional().trim(),
    body('githubUsername').optional().trim(),
    body('university').optional().trim(),
    body('graduationYear').optional().isInt({ min: 2000, max: 2035 }),
    body('bio').optional().trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

      const updates = {};
      ['name', 'targetRole', 'githubUsername', 'university', 'graduationYear', 'bio'].forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });

      const userId = req.user._id || req.user.id;
      let updatedUser;

      if (db.isMongoReady()) {
        updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
      } else {
        updatedUser = await db.upsert(
          User,
          { _id: userId },
          { ...req.user, ...updates },
          (u) => (u._id || u.id) === userId,
          () => userId
        );
      }

      res.json({ message: 'Profile updated', user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
