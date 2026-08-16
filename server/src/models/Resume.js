const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalFilename: { type: String, required: true },
  filePath: { type: String },
  rawText: { type: String, default: '' },
  extractedData: {
    name: String,
    email: String,
    phone: String,
    location: String,
    summary: String,
    programmingLanguages: [String],
    frameworks: [String],
    databases: [String],
    tools: [String],
    softSkills: [String],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
    }],
    internships: [{
      company: String,
      role: String,
      duration: String,
      description: String,
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      year: String,
      gpa: String,
    }],
    certifications: [String],
    allSkills: [String],
  },
  analysis: {
    overallScore: { type: Number, default: 0 },
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    targetRole: String,
    matchScore: Number,
  },
  improvement: {
    suggestions: [{
      section: String,
      original: String,
      improved: String,
      reason: String,
    }],
    missingKeywords: [String],
    formattingIssues: [String],
    overallTips: [String],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

resumeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Resume', resumeSchema);
