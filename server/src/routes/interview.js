const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/database');
const Interview = require('../models/Interview');
const aiService = require('../services/aiService');

const router = express.Router();

// POST /api/interview/start
router.post('/start', auth, async (req, res) => {
  try {
    const { jobRole, difficulty, interviewType, totalQuestions } = req.body;
    if (!jobRole) return res.status(400).json({ error: 'Job role is required' });

    const firstQuestion = await aiService.generateInterviewQuestion(
      jobRole, difficulty || 'intermediate', interviewType || 'technical', 0, []
    );

    const interviewData = {
      userId: req.userId,
      jobRole,
      difficulty: difficulty || 'intermediate',
      interviewType: interviewType || 'technical',
      totalQuestions: Math.min(parseInt(totalQuestions) || 5, 10),
      questions: [{ questionText: firstQuestion.questionText, questionType: firstQuestion.questionType, order: 0 }],
      currentQuestion: 0,
      status: 'active',
      startedAt: new Date().toISOString(),
    };

    const saved = await db.create(Interview, interviewData);

    res.json({
      message: 'Interview started',
      interviewId: saved._id || saved.id,
      currentQuestion: firstQuestion,
      questionNumber: 1,
      totalQuestions: interviewData.totalQuestions,
    });
  } catch (error) {
    console.error('Interview start error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/interview/answer
router.post('/answer', auth, async (req, res) => {
  try {
    const { interviewId, answer } = req.body;
    if (!interviewId || !answer) return res.status(400).json({ error: 'Interview ID and answer are required' });

    const interview = await db.findById(Interview, interviewId);
    if (!interview) return res.status(404).json({ error: 'Interview not found' });

    const currentQ = interview.questions[interview.currentQuestion];
    if (!currentQ) return res.status(400).json({ error: 'No active question found' });

    const feedback = await aiService.evaluateAnswer(currentQ, answer, interview.jobRole, interview.difficulty);

    const questions = [...interview.questions];
    questions[interview.currentQuestion] = {
      ...questions[interview.currentQuestion],
      answer,
      feedback,
      answeredAt: new Date().toISOString(),
    };

    const nextIdx = interview.currentQuestion + 1;
    const isComplete = nextIdx >= interview.totalQuestions;

    let nextQuestion = null;
    if (!isComplete) {
      nextQuestion = await aiService.generateInterviewQuestion(
        interview.jobRole, interview.difficulty, interview.interviewType, nextIdx, questions
      );
      questions.push({ questionText: nextQuestion.questionText, questionType: nextQuestion.questionType, order: nextIdx });
    }

    await db.updateById(Interview, interviewId, {
      questions,
      currentQuestion: isComplete ? interview.currentQuestion : nextIdx,
      status: isComplete ? 'completed' : 'active',
      ...(isComplete && { completedAt: new Date().toISOString() }),
    });

    res.json({
      feedback,
      questionNumber: nextIdx,
      totalQuestions: interview.totalQuestions,
      isComplete,
      nextQuestion: nextQuestion ? { questionText: nextQuestion.questionText, questionType: nextQuestion.questionType } : null,
    });
  } catch (error) {
    console.error('Interview answer error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/interview/result/:interviewId
router.get('/result/:interviewId', auth, async (req, res) => {
  try {
    const interview = await db.findById(Interview, req.params.interviewId);
    if (!interview) return res.status(404).json({ error: 'Interview not found' });

    const results = await aiService.generateInterviewResults(interview);

    await db.updateById(Interview, req.params.interviewId, { results });

    res.json({
      results,
      interview: {
        jobRole: interview.jobRole,
        difficulty: interview.difficulty,
        interviewType: interview.interviewType,
        totalQuestions: interview.questions.filter((q) => q.answer).length,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        questions: interview.questions.map((q) => ({
          questionText: q.questionText,
          answer: q.answer,
          feedback: q.feedback,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/interview — list past interviews
router.get('/', auth, async (req, res) => {
  try {
    const interviews = await db.find(
      Interview,
      { userId: req.userId },
      (i) => i.userId === req.userId,
      { startedAt: -1 },
      10
    );
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
