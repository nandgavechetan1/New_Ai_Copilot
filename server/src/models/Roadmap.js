const mongoose = require('mongoose');

const roadmapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetRole: { type: String, required: true },
  stages: [{
    stageNumber: Number,
    title: String,
    topic: String,
    duration: String,
    whyItMatters: String,
    resources: [{
      title: String,
      url: String,
      type: String,
      provider: String,
    }],
    practiceTask: String,
    miniProject: String,
    completed: { type: Boolean, default: false },
    completedAt: Date,
  }],
  totalDuration: String,
  currentStage: { type: Number, default: 0 },
  completionPercentage: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

roadmapSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Roadmap', roadmapSchema);
