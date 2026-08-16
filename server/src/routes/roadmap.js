const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/database');
const Roadmap = require('../models/Roadmap');
const Resume = require('../models/Resume');
const CareerRecommendation = require('../models/CareerRecommendation');
const aiService = require('../services/aiService');

const router = express.Router();

// POST /api/roadmap/generate
router.post('/generate', auth, async (req, res) => {
  try {
    const { targetRole } = req.body;

    const [resume, career] = await Promise.all([
      db.findOne(Resume, { userId: req.userId }, (r) => r.userId === req.userId),
      db.findOne(CareerRecommendation, { userId: req.userId }, (r) => r.userId === req.userId),
    ]);

    const skills = resume?.extractedData || { allSkills: [] };
    let skillGap = career?.skillGap || null;

    if (!skillGap?.missingSkills?.length) {
      skillGap = await aiService.generateSkillGap(skills, targetRole);
    }

    const roadmapResult = await aiService.generateRoadmap(skillGap, targetRole, skills);

    const saved = await db.upsert(
      Roadmap,
      { userId: req.userId },
      {
        userId: req.userId,
        targetRole,
        stages: roadmapResult.stages,
        totalDuration: roadmapResult.totalDuration,
        currentStage: 0,
        completionPercentage: 0,
      },
      (r) => r.userId === req.userId,
      () => `roadmap-${req.userId}`
    );

    res.json({ message: 'Learning roadmap generated', roadmap: saved, overview: roadmapResult.overview });
  } catch (error) {
    console.error('Roadmap error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/roadmap
router.get('/', auth, async (req, res) => {
  try {
    const roadmap = await db.findOne(Roadmap, { userId: req.userId }, (r) => r.userId === req.userId);
    if (!roadmap) return res.status(404).json({ error: 'No roadmap found' });
    res.json(roadmap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/roadmap/stage/:stageNumber/complete
router.patch('/stage/:stageNumber/complete', auth, async (req, res) => {
  try {
    const stageNum = parseInt(req.params.stageNumber);
    const roadmap = await db.findOne(Roadmap, { userId: req.userId }, (r) => r.userId === req.userId);
    if (!roadmap) return res.status(404).json({ error: 'No roadmap found' });

    const stages = roadmap.stages || [];
    const stage = stages.find((s) => s.stageNumber === stageNum);
    if (stage) {
      stage.completed = true;
      stage.completedAt = new Date().toISOString();
    }
    const completedCount = stages.filter((s) => s.completed).length;
    const completionPercentage = Math.round((completedCount / stages.length) * 100);

    const updated = await db.upsert(
      Roadmap,
      { userId: req.userId },
      { ...roadmap, stages, completionPercentage, currentStage: stageNum },
      (r) => r.userId === req.userId,
      () => `roadmap-${req.userId}`
    );

    res.json({ message: 'Stage marked as complete', roadmap: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
