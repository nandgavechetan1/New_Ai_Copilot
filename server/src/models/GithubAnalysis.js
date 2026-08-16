const mongoose = require('mongoose');

const githubAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: { type: String, required: true },
  profile: {
    name: String,
    bio: String,
    avatar: String,
    location: String,
    publicRepos: Number,
    followers: Number,
    following: Number,
    createdAt: String,
  },
  repositories: [{
    name: String,
    description: String,
    language: String,
    stars: Number,
    forks: Number,
    updatedAt: String,
    topics: [String],
    isForked: Boolean,
  }],
  analysis: {
    languages: [{ name: String, count: Number, percentage: Number }],
    frameworks: [String],
    totalProjects: Number,
    activeProjects: Number,
    projectDiversity: Number,
    activityScore: Number,
    overallScore: Number,
    strengths: [String],
    areasToImprove: [String],
    summary: String,
    topLanguage: String,
    projectExperience: String,
  },
  analyzedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GithubAnalysis', githubAnalysisSchema);
