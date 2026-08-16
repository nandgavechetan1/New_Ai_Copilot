const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  jobRole: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate',
  },
  interviewType: {
    type: String,
    enum: ['technical', 'hr', 'mixed'],
    default: 'technical',
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active',
  },
  questions: [{
    questionText: String,
    questionType: String,
    order: Number,
    answer: String,
    feedback: {
      score: Number,
      whatWasGood: String,
      whatCouldBeImproved: String,
      modelAnswer: String,
      keywords: [String],
    },
    answeredAt: Date,
  }],
  totalQuestions: { type: Number, default: 5 },
  currentQuestion: { type: Number, default: 0 },
  results: {
    overallScore: Number,
    technicalKnowledge: Number,
    communication: Number,
    problemSolving: Number,
    answerQuality: Number,
    confidence: Number,
    areasToImprove: [String],
    recommendedTopics: [String],
    summary: String,
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
});

module.exports = mongoose.model('Interview', interviewSchema);
