const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const githubRoutes = require('./routes/github');
const careerRoutes = require('./routes/career');
const skillsRoutes = require('./routes/skills');
const roadmapRoutes = require('./routes/roadmap');
const interviewRoutes = require('./routes/interview');
const dashboardRoutes = require('./routes/dashboard');
const profileRoutes = require('./routes/profile');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Career Copilot API is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const printBanner = (dbMode) => {
  const aiMode = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'demo-mode'
    ? `OpenAI (${process.env.AI_MODEL || 'gpt-4o-mini'})`
    : 'Rule-based fallback (no API key)';

  const lines = [
    '',
    '╔══════════════════════════════════════════════════════╗',
    '║          AI Career Copilot — Server Ready  🚀        ║',
    '╠══════════════════════════════════════════════════════╣',
    `║  URL      →  http://localhost:${PORT}${' '.repeat(21 - String(PORT).length)}║`,
    `║  Health   →  http://localhost:${PORT}/api/health${' '.repeat(12 - String(PORT).length)}║`,
    `║  Frontend →  ${process.env.FRONTEND_URL || 'http://localhost:5173'}${' '.repeat(38 - (process.env.FRONTEND_URL || 'http://localhost:5173').length)}║`,
    '╠══════════════════════════════════════════════════════╣',
    `║  Storage  →  ${dbMode.padEnd(38)}║`,
    `║  AI Mode  →  ${aiMode.padEnd(38)}║`,
    `║  Env      →  ${(process.env.NODE_ENV || 'development').padEnd(38)}║`,
    '╠══════════════════════════════════════════════════════╣',
    '║  Routes ready:                                       ║',
    '║    POST  /api/auth/register  /api/auth/login         ║',
    '║    POST  /api/resume/upload  /api/resume/analyze     ║',
    '║    GET   /api/github/:username  /api/github          ║',
    '║    GET   /api/skills  POST /api/skills/analyze       ║',
    '║    POST  /api/career/analyze  GET /api/career        ║',
    '║    POST  /api/roadmap/generate  GET /api/roadmap     ║',
    '║    POST  /api/interview/start  /api/interview/answer ║',
    '║    GET   /api/dashboard      /api/profile            ║',
    '╚══════════════════════════════════════════════════════╝',
    '',
  ];
  console.log(lines.join('\n'));
};

const start = async () => {
  const dbMode = await connectDB();
  app.listen(PORT, () => {
    printBanner(dbMode);
  });
};

start().catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

module.exports = app;
