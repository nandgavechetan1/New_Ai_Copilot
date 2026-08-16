const express = require('express');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const db = require('../config/database');
const Resume = require('../models/Resume');
const aiService = require('../services/aiService');

const router = express.Router();

// ─── Safe PDF text extraction ─────────────────────────────────────────────────
// pdf-parse has a known issue throwing on some PDFs before the promise begins.
// We wrap the entire call in a try/catch at the module level.
const extractPdfText = async (filePath) => {
  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return (data.text || '').trim();
  } catch {
    // Try alternative: read raw bytes and extract visible ASCII runs
    // This works as a last resort for simple PDFs
    try {
      const raw = fs.readFileSync(filePath, 'binary');
      // Pull out text between BT/ET markers (basic PDF text stream)
      const strings = [];
      const btEtRegex = /BT[\s\S]*?ET/g;
      const strRegex = /\(([^)]{2,})\)\s*Tj/g;
      let block;
      while ((block = btEtRegex.exec(raw)) !== null) {
        let m;
        while ((m = strRegex.exec(block[0])) !== null) {
          const s = m[1].replace(/\\n/g, '\n').replace(/\\r/g, '').trim();
          if (s.length > 1) strings.push(s);
        }
      }
      const text = strings.join(' ');
      return text.length > 30 ? text : '';
    } catch {
      return '';
    }
  }
};

// POST /api/resume/upload
router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file' });
    }

    const rawText = await extractPdfText(req.file.path);
    const finalText = rawText.length > 50
      ? rawText
      : `Resume: ${req.file.originalname}. Text extraction limited — ensure the PDF is not scanned/image-based.`;

    const saved = await db.upsert(
      Resume,
      { userId: req.userId },
      {
        userId: req.userId,
        originalFilename: req.file.originalname,
        filePath: req.file.path,
        rawText: finalText,
        // Clear previous analysis so stale results don't show
        extractedData: null,
        analysis: null,
        improvement: null,
      },
      (r) => r.userId === req.userId,
      () => `resume-${req.userId}`
    );

    res.json({
      message: 'Resume uploaded successfully',
      resumeId: saved._id || saved.id,
      filename: req.file.originalname,
      textExtracted: rawText.length > 50,
      charCount: finalText.length,
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// POST /api/resume/analyze
router.post('/analyze', auth, async (req, res) => {
  try {
    const { targetRole } = req.body;

    const resume = await db.findOne(Resume, { userId: req.userId }, (r) => r.userId === req.userId);
    if (!resume) {
      return res.status(404).json({ error: 'No resume found. Please upload your resume first.' });
    }

    const extractedData   = await aiService.analyzeResume(resume.rawText || '');
    const careerAnalysis  = await aiService.analyzeCareer(extractedData, targetRole, null);
    const resolvedRole    = targetRole || careerAnalysis.topCareer;

    // Run remaining calls in parallel to halve the latency
    const [skillGap, readinessScore, improvement] = await Promise.all([
      aiService.generateSkillGap(extractedData, resolvedRole),
      aiService.generateJobReadinessScore({
        skills: extractedData,
        targetRole: resolvedRole,
        hasResume: true,
        hasGithub: false,
        hasProjects: (extractedData.projects || []).length > 0,
        hasInternship: (extractedData.internships || []).length > 0,
        hasCertifications: (extractedData.certifications || []).length > 0,
      }),
      aiService.generateResumeImprovement(extractedData, resolvedRole),
    ]);

    const saved = await db.upsert(
      Resume,
      { userId: req.userId },
      {
        userId: req.userId,
        originalFilename: resume.originalFilename,
        rawText: resume.rawText,
        extractedData: { ...extractedData, allSkills: extractedData.allSkills || [] },
        analysis: {
          overallScore: improvement.overallScore || 0,
          strengths: careerAnalysis.recommendations?.[0]?.strengths || [],
          weaknesses: skillGap.missingSkills || [],
          recommendations: careerAnalysis.recommendations?.[0]?.nextSteps || [],
          targetRole: resolvedRole,
          matchScore: careerAnalysis.recommendations?.[0]?.matchScore || 0,
        },
        improvement: {
          suggestions: improvement.suggestions || [],
          missingKeywords: improvement.missingKeywords || [],
          formattingIssues: improvement.formattingIssues || [],
          overallTips: improvement.overallTips || [],
          overallScore: improvement.overallScore || 0,
        },
        jobReadiness: readinessScore,
        careerAnalysis: {
          topCareer: careerAnalysis.topCareer,
          overallAssessment: careerAnalysis.overallAssessment,
          recommendations: careerAnalysis.recommendations,
        },
        skillGap,
      },
      (r) => r.userId === req.userId,
      () => `resume-${req.userId}`
    );

    res.json({
      message: 'Resume analyzed successfully',
      extractedData,
      careerAnalysis,
      skillGap,
      jobReadiness: readinessScore,
      improvement,
      targetRole: resolvedRole,
    });
  } catch (error) {
    console.error('Resume analyze error:', error.message);
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

// GET /api/resume  — returns the stored resume + all analysis results
router.get('/', auth, async (req, res) => {
  try {
    const resume = await db.findOne(Resume, { userId: req.userId }, (r) => r.userId === req.userId);
    if (!resume) return res.status(404).json({ error: 'No resume found' });
    res.json(resume);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/resume/improve
router.post('/improve', auth, async (req, res) => {
  try {
    const { targetRole } = req.body;
    const resume = await db.findOne(Resume, { userId: req.userId }, (r) => r.userId === req.userId);
    if (!resume) return res.status(404).json({ error: 'No resume found' });

    const improvement = await aiService.generateResumeImprovement(
      resume.extractedData || {},
      targetRole || resume.analysis?.targetRole
    );
    res.json({ improvement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
