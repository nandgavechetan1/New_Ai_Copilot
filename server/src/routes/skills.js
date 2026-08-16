const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/database');
const Resume = require('../models/Resume');
const aiService = require('../services/aiService');

const router = express.Router();

// GET /api/skills — return saved skill gap data from the latest resume analysis
router.get('/', auth, async (req, res) => {
  try {
    const resume = await db.findOne(Resume, { userId: req.userId }, (r) => r.userId === req.userId);
    if (!resume) return res.status(404).json({ error: 'No resume found' });
    const sg = resume.skillGap;
    if (!sg) return res.status(404).json({ error: 'No skill gap analysis found. Run an analysis first.' });
    res.json({ targetRole: sg.targetRole || resume.targetRole || '', ...sg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/skills/analyze
router.post('/analyze', auth, async (req, res) => {
  try {
    const { targetRole, skills } = req.body;

    let studentSkills = skills;
    if (!studentSkills) {
      const resume = await db.findOne(Resume, { userId: req.userId }, (r) => r.userId === req.userId);
      studentSkills = resume?.extractedData;
    }

    if (!studentSkills) {
      return res.status(400).json({
        error: 'No skills data found. Please upload and analyze your resume first.',
      });
    }

    const skillGap = await aiService.generateSkillGap(studentSkills, targetRole);

    // Persist skill gap onto the resume document for later retrieval
    const resume = await db.findOne(Resume, { userId: req.userId }, (r) => r.userId === req.userId);
    if (resume) {
      await db.upsert(
        Resume,
        { userId: req.userId },
        { ...resume, skillGap: { ...skillGap, targetRole } },
        (r) => r.userId === req.userId,
        () => `resume-${req.userId}`
      );
    }

    res.json({ message: 'Skill gap analysis complete', targetRole, ...skillGap });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
