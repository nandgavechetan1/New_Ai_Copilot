# AI Career Copilot

An AI-powered Career Copilot web application for students — built for hackathons and career development.

## What It Does

AI Career Copilot helps students:
- Understand their current skills from their resume and GitHub
- Identify skill gaps against target job roles
- Discover suitable career paths with match scores
- Follow a personalized learning roadmap
- Get a Job Readiness Score (AI guidance score)
- Practice technical and HR interviews with an AI interviewer
- Improve their resume with AI suggestions

## Architecture

```
client/          React + Vite + TailwindCSS frontend
server/          Node.js + Express backend
  src/
    config/      Database connection
    middleware/  JWT auth, file upload
    models/      MongoDB schemas (User, Resume, GithubAnalysis, CareerRecommendation, Roadmap, Interview)
    routes/      REST API routes
    services/    AI service (OpenAI-compatible + rule-based fallback)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, Recharts, React Router v6 |
| Backend | Node.js, Express.js, JWT, bcryptjs |
| Database | MongoDB (Mongoose) with in-memory fallback |
| AI | OpenAI-compatible API (GPT-4o-mini) with intelligent rule-based fallback |
| Resume | pdf-parse for PDF text extraction |
| GitHub | GitHub REST API v3 |

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (optional — app runs without it using in-memory storage)

### 1. Install Dependencies

```bash
# Install all dependencies
cd server && npm install
cd ../client && npm install
```

### 2. Configure Environment

Copy `server/.env.example` to `server/.env` and fill in:

```
MONGODB_URI=mongodb://localhost:27017/ai-career-copilot
JWT_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-key    # optional - app works without AI using rule-based logic
```

### 3. Start Development

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Open http://localhost:5173

## Demo Flow

1. **Register** a new account
2. **Upload Resume** (PDF) → AI extracts skills, languages, frameworks, projects
3. **Analyze GitHub** → Enter a GitHub username to analyze repositories
4. **Career Paths** → AI recommends best-fit careers with match scores
5. **Skill Gap** → See Strong / Developing / Missing skills for your target role
6. **Learning Roadmap** → Get a step-by-step study plan with resources
7. **Mock Interview** → Practice with AI interviewer, get scored feedback
8. **Dashboard** → See your complete career profile and Job Readiness Score

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/resume/upload | Upload PDF resume |
| POST | /api/resume/analyze | Analyze resume with AI |
| GET  | /api/github/:username | Analyze GitHub profile |
| POST | /api/career/analyze | Career recommendations |
| POST | /api/skills/analyze | Skill gap analysis |
| POST | /api/roadmap/generate | Generate learning roadmap |
| POST | /api/interview/start | Start mock interview |
| POST | /api/interview/answer | Submit interview answer |
| GET  | /api/interview/result/:id | Get interview results |
| GET  | /api/dashboard | Dashboard summary |
| GET  | /api/profile | User profile |

## AI Mode

The app works in two modes:

- **AI Mode** (requires `OPENAI_API_KEY`): Uses GPT-4o-mini for all analysis — resume parsing, career matching, interview questions, feedback
- **Demo Mode** (no API key needed): Uses intelligent rule-based algorithms for all features — fully functional for hackathon demos

## Features

### Resume Analyzer
- PDF upload and text extraction
- AI skill extraction: languages, frameworks, databases, tools, soft skills, projects, education
- Resume improvement suggestions (only improves presentation, never fabricates information)

### GitHub Analyzer
- Uses GitHub REST API to fetch public repositories
- AI analysis of languages, activity, diversity
- No private data is ever accessed

### Career Path Recommendations
- 12+ career paths analyzed (Java Backend, Full Stack, Data Scientist, DevOps, etc.)
- Match score 0–100 per career
- IBM SkillsBuild course recommendations

### Skill Gap Analysis
- Strong / Developing / Missing skill categories
- Compared against industry requirements for target role
- Priority learning order

### Job Readiness Score
- Overall score 0–100
- Breakdown: Technical Skills, Projects, GitHub, Resume, Interview Readiness, Certifications
- AI-generated score — not an official hiring score

### Learning Roadmap
- Stage-by-stage plan with durations
- Why each stage matters
- Learning resources (including IBM SkillsBuild)
- Practice tasks and mini-project ideas
- Progress tracking (mark stages as complete)

### AI Mock Interview
- Role-specific questions (Java, Full Stack, Python, DevOps, etc.)
- Three difficulty levels: Beginner, Intermediate, Advanced
- Three interview types: Technical, HR, Mixed
- Instant AI feedback per answer: what was good, what to improve, model answer
- Final score with breakdown: Technical Knowledge, Communication, Problem Solving, Confidence

## Important Disclaimers

- Job Readiness Scores and career recommendations are **AI-generated guidance only**
- Scores do **not** guarantee employment
- Resume improvement suggestions only improve presentation of **existing information** — the AI never fabricates experience or qualifications
- GitHub analysis only accesses **public** repository information

## Security

- Passwords hashed with bcryptjs (cost 12)
- JWT authentication on all protected routes
- File type validation (PDF only)
- File size limit (5MB)
- CORS configured for frontend origin only
- No sensitive keys exposed to frontend
