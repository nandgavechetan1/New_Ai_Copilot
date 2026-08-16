const mongoose = require('mongoose');

const careerRecommendationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetRole: { type: String, required: true },
  jobReadinessScore: {
    overall: { type: Number, default: 0 },
    technicalSkills: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    github: { type: Number, default: 0 },
    resume: { type: Number, default: 0 },
    interviewReadiness: { type: Number, default: 0 },
    certifications: { type: Number, default: 0 },
    explanation: String,
  },
  recommendations: [{
    career: String,
    matchScore: Number,
    whyItMatches: String,
    strengths: [String],
    skillGaps: [String],
    nextSteps: [String],
  }],
  skillGap: {
    strongSkills: [String],
    developingSkills: [String],
    missingSkills: [String],
    requiredSkills: [String],
  },
  courses: [{
    title: String,
    provider: String,
    url: String,
    reason: String,
    skillItAddresses: String,
    isIBMSkillsBuild: Boolean,
    duration: String,
    level: String,
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

careerRecommendationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CareerRecommendation', careerRecommendationSchema);
