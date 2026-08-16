const express = require('express');
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const db = require('../config/database');
const GithubAnalysis = require('../models/GithubAnalysis');
const aiService = require('../services/aiService');

const router = express.Router();

const githubFetch = async (url) => {
  const headers = { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'AI-Career-Copilot' };
  if (process.env.GITHUB_TOKEN) headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  return response.json();
};

// GET /api/github/:username
router.get('/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'GitHub username is required' });

    let profile, repos;
    try {
      [profile, repos] = await Promise.all([
        githubFetch(`https://api.github.com/users/${username}`),
        githubFetch(`https://api.github.com/users/${username}/repos?per_page=50&sort=updated`),
      ]);
    } catch (githubError) {
      return res.status(404).json({
        error: `GitHub user '${username}' not found or API rate limit reached. ${githubError.message}`,
      });
    }

    const analysisResult = await aiService.analyzeGithubProfile(repos, profile);

    const analysisData = {
      userId: req.userId,
      username,
      profile: {
        name: profile.name || username,
        bio: profile.bio || '',
        avatar: profile.avatar_url,
        location: profile.location || '',
        publicRepos: profile.public_repos,
        followers: profile.followers,
        following: profile.following,
        createdAt: profile.created_at,
      },
      repositories: repos.slice(0, 20).map((r) => ({
        name: r.name,
        description: r.description || '',
        language: r.language || 'Unknown',
        stars: r.stargazers_count,
        forks: r.forks_count,
        updatedAt: r.updated_at,
        topics: r.topics || [],
        isForked: r.fork,
      })),
      analysis: analysisResult,
    };

    await db.upsert(
      GithubAnalysis,
      { userId: req.userId },
      analysisData,
      (r) => r.userId === req.userId,
      () => `github-${req.userId}`
    );

    res.json({
      message: 'GitHub profile analyzed successfully',
      profile: analysisData.profile,
      repositories: analysisData.repositories,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error('GitHub analyze error:', error.message);
    res.status(500).json({ error: 'GitHub analysis failed: ' + error.message });
  }
});

// GET /api/github — get cached analysis
router.get('/', auth, async (req, res) => {
  try {
    const analysis = await db.findOne(GithubAnalysis, { userId: req.userId }, (r) => r.userId === req.userId);
    if (!analysis) return res.status(404).json({ error: 'No GitHub analysis found' });
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
