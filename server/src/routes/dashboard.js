const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/database');
const Resume = require('../models/Resume');
const GithubAnalysis = require('../models/GithubAnalysis');
const CareerRecommendation = require('../models/CareerRecommendation');
const Roadmap = require('../models/Roadmap');
const Interview = require('../models/Interview');

const router = express.Router();

// GET /api/dashboard
router.get('/', auth, async (req, res) => {
  try {
    const [resume, githubAnalysis, careerData, roadmap, interviews] = await Promise.all([
      db.findOne(Resume, { userId: req.userId }, (r) => r.userId === req.userId),
      db.findOne(GithubAnalysis, { userId: req.userId }, (r) => r.userId === req.userId),
      db.findOne(CareerRecommendation, { userId: req.userId }, (r) => r.userId === req.userId),
      db.findOne(Roadmap, { userId: req.userId }, (r) => r.userId === req.userId),
      db.find(Interview, { userId: req.userId }, (i) => i.userId === req.userId, { startedAt: -1 }, 3),
    ]);

    res.json({
      user: {
        name: req.user?.name || 'Student',
        email: req.user?.email,
        targetRole: req.user?.targetRole || careerData?.targetRole,
      },
      resumeUploaded: !!resume,
      resumeScore: resume?.analysis?.overallScore || 0,
      githubConnected: !!githubAnalysis,
      githubScore: githubAnalysis?.analysis?.overallScore || 0,
      jobReadiness: careerData?.jobReadinessScore || null,
      topCareerMatch: careerData?.recommendations?.[0] || null,
      skillGapSummary: {
        strong: (careerData?.skillGap?.strongSkills || []).length,
        developing: (careerData?.skillGap?.developingSkills || []).length,
        missing: (careerData?.skillGap?.missingSkills || []).length,
        strongSkills: (careerData?.skillGap?.strongSkills || []).slice(0, 5),
        missingSkills: (careerData?.skillGap?.missingSkills || []).slice(0, 5),
      },
      roadmapProgress: roadmap
        ? {
            completionPercentage: roadmap.completionPercentage || 0,
            currentStage: roadmap.currentStage || 0,
            totalStages: roadmap.stages?.length || 0,
            totalDuration: roadmap.totalDuration,
          }
        : null,
      recentInterviews: (interviews || []).map((i) => ({
        id: i._id || i.id,
        jobRole: i.jobRole,
        score: i.results?.overallScore,
        completedAt: i.completedAt,
        status: i.status,
      })),
      nextSteps: generateNextSteps(resume, githubAnalysis, careerData, roadmap),
    });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const generateNextSteps = (resume, github, career, roadmap) => {
  const steps = [];
  if (!resume) steps.push({ action: 'Upload Resume', description: 'Start by uploading your resume', priority: 1, route: '/resume' });
  else if (!resume.extractedData?.allSkills?.length) steps.push({ action: 'Analyze Resume', description: 'Analyze your resume to extract skills', priority: 1, route: '/resume' });
  if (!github) steps.push({ action: 'Connect GitHub', description: 'Analyze your GitHub projects', priority: 2, route: '/github' });
  if (!career) steps.push({ action: 'Get Career Recommendations', description: 'Discover your best career paths', priority: 3, route: '/career' });
  if (!roadmap) steps.push({ action: 'Generate Learning Roadmap', description: 'Create your personalized study plan', priority: 4, route: '/roadmap' });
  steps.push({ action: 'Practice Interview', description: 'Start an AI mock interview session', priority: 5, route: '/interview' });
  return steps.slice(0, 4);
};

module.exports = router;
