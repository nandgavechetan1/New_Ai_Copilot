const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/database');
const CareerRecommendation = require('../models/CareerRecommendation');
const Resume = require('../models/Resume');
const GithubAnalysis = require('../models/GithubAnalysis');
const aiService = require('../services/aiService');

const router = express.Router();

// POST /api/career/analyze
router.post('/analyze', auth, async (req, res) => {
  try {
    const { targetRole } = req.body;

    const [resume, githubAnalysis] = await Promise.all([
      db.findOne(Resume, { userId: req.userId }, (r) => r.userId === req.userId),
      db.findOne(GithubAnalysis, { userId: req.userId }, (r) => r.userId === req.userId),
    ]);

    const skills = resume?.extractedData || { allSkills: [], programmingLanguages: [], frameworks: [] };
    const githubData = githubAnalysis?.analysis || null;

    const careerAnalysis = await aiService.analyzeCareer(skills, targetRole, githubData);
    const primaryCareer = targetRole || careerAnalysis.topCareer;

    const [readinessScore, skillGap] = await Promise.all([
      aiService.generateJobReadinessScore({
        skills,
        targetRole: primaryCareer,
        hasResume: !!resume,
        hasGithub: !!githubAnalysis,
        hasProjects: (skills.projects || []).length > 0,
        hasInternship: (skills.internships || []).length > 0,
        hasCertifications: (skills.certifications || []).length > 0,
      }),
      aiService.generateSkillGap(skills, primaryCareer),
    ]);

    const courses = generateCourseRecommendations(skillGap.missingSkills, primaryCareer);

    await db.upsert(
      CareerRecommendation,
      { userId: req.userId },
      {
        userId: req.userId,
        targetRole: primaryCareer,
        jobReadinessScore: readinessScore,
        recommendations: careerAnalysis.recommendations,
        skillGap,
        courses,
      },
      (r) => r.userId === req.userId,
      () => `career-${req.userId}`
    );

    res.json({
      message: 'Career analysis complete',
      targetRole: primaryCareer,
      recommendations: careerAnalysis.recommendations,
      topCareer: careerAnalysis.topCareer,
      jobReadiness: readinessScore,
      skillGap,
      courses,
      overallAssessment: careerAnalysis.overallAssessment,
    });
  } catch (error) {
    console.error('Career analyze error:', error.message);
    res.status(500).json({ error: 'Career analysis failed: ' + error.message });
  }
});

// GET /api/career
router.get('/', auth, async (req, res) => {
  try {
    const career = await db.findOne(CareerRecommendation, { userId: req.userId }, (r) => r.userId === req.userId);
    if (!career) return res.status(404).json({ error: 'No career analysis found' });
    res.json(career);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const generateCourseRecommendations = (missingSkills, targetRole) => {
  const courseDatabase = [
    { title: 'Introduction to Cloud Computing', provider: 'IBM SkillsBuild', url: 'https://skillsbuild.org/adult-learners/explore-learn/cloud-computing', skillItAddresses: 'Cloud', isIBMSkillsBuild: true, duration: '3 hours', level: 'Beginner', keywords: ['cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker'] },
    { title: 'Introduction to Artificial Intelligence', provider: 'IBM SkillsBuild', url: 'https://skillsbuild.org/adult-learners/explore-learn/artificial-intelligence', skillItAddresses: 'AI/ML', isIBMSkillsBuild: true, duration: '6 hours', level: 'Beginner', keywords: ['ai', 'ml', 'machine learning', 'tensorflow', 'pytorch', 'data science'] },
    { title: 'Data Science Professional Certificate', provider: 'IBM SkillsBuild', url: 'https://skillsbuild.org/adult-learners/explore-learn/data-science', skillItAddresses: 'Data Science', isIBMSkillsBuild: true, duration: '20 hours', level: 'Intermediate', keywords: ['data science', 'pandas', 'numpy', 'statistics', 'data analysis', 'python'] },
    { title: 'Cybersecurity Fundamentals', provider: 'IBM SkillsBuild', url: 'https://skillsbuild.org/adult-learners/explore-learn/cybersecurity', skillItAddresses: 'Security', isIBMSkillsBuild: true, duration: '8 hours', level: 'Beginner', keywords: ['security', 'cybersecurity', 'networking', 'encryption'] },
    { title: 'IBM DevOps and Software Engineering', provider: 'IBM SkillsBuild', url: 'https://skillsbuild.org', skillItAddresses: 'DevOps', isIBMSkillsBuild: true, duration: '40 hours', level: 'Intermediate', keywords: ['devops', 'ci/cd', 'jenkins', 'terraform', 'monitoring', 'agile'] },
    { title: 'Spring Boot: From Zero to Hero', provider: 'Udemy', url: 'https://www.udemy.com/topic/spring-boot/', skillItAddresses: 'Spring Boot', isIBMSkillsBuild: false, duration: '15 hours', level: 'Intermediate', keywords: ['spring boot', 'spring', 'java', 'backend', 'rest api', 'hibernate', 'microservices'] },
    { title: 'The Complete React Developer Course', provider: 'Udemy', url: 'https://www.udemy.com/topic/react/', skillItAddresses: 'React', isIBMSkillsBuild: false, duration: '20 hours', level: 'Intermediate', keywords: ['react', 'frontend', 'javascript', 'typescript', 'redux'] },
    { title: 'Node.js & Express Masterclass', provider: 'Udemy', url: 'https://www.udemy.com/topic/nodejs/', skillItAddresses: 'Node.js', isIBMSkillsBuild: false, duration: '15 hours', level: 'Intermediate', keywords: ['node.js', 'express', 'backend', 'javascript', 'full stack', 'mongodb'] },
    { title: 'Docker & Kubernetes Practical Guide', provider: 'Udemy', url: 'https://www.udemy.com/topic/docker/', skillItAddresses: 'Docker & Kubernetes', isIBMSkillsBuild: false, duration: '15 hours', level: 'Intermediate', keywords: ['docker', 'kubernetes', 'devops', 'containers', 'microservices'] },
    { title: 'Python for Everybody Specialization', provider: 'Coursera', url: 'https://www.coursera.org/specializations/python', skillItAddresses: 'Python', isIBMSkillsBuild: false, duration: '30 hours', level: 'Beginner', keywords: ['python', 'data science', 'ai', 'ml', 'django', 'flask'] },
    { title: 'Machine Learning by Andrew Ng', provider: 'Coursera', url: 'https://www.coursera.org/learn/machine-learning', skillItAddresses: 'Machine Learning', isIBMSkillsBuild: false, duration: '60 hours', level: 'Intermediate', keywords: ['machine learning', 'ai', 'data science', 'deep learning', 'neural networks'] },
    { title: 'Complete SQL & Databases Bootcamp', provider: 'Udemy', url: 'https://www.udemy.com/topic/sql/', skillItAddresses: 'SQL & Databases', isIBMSkillsBuild: false, duration: '20 hours', level: 'Beginner', keywords: ['sql', 'database', 'postgresql', 'mysql', 'hibernate', 'orm'] },
  ];

  const skillsLower = (missingSkills || []).map((s) => s.toLowerCase());
  const roleLower = (targetRole || '').toLowerCase();
  const seen = new Set();

  return courseDatabase
    .filter((c) => c.keywords.some((kw) => skillsLower.some((s) => s.includes(kw) || kw.includes(s)) || roleLower.includes(kw)))
    .filter((c) => { if (seen.has(c.title)) return false; seen.add(c.title); return true; })
    .slice(0, 6)
    .map((c) => ({
      title: c.title,
      provider: c.provider,
      url: c.url,
      reason: `Recommended to fill your skill gap in ${c.skillItAddresses}`,
      skillItAddresses: c.skillItAddresses,
      isIBMSkillsBuild: c.isIBMSkillsBuild,
      duration: c.duration,
      level: c.level,
    }));
};

module.exports = router;
