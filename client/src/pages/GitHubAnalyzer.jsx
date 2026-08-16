import { useState, useEffect } from 'react';
import { githubAPI } from '../lib/api';
import { Card, SkillChip, AIBadge, ScoreRing, ProgressBar, EmptyState, Spinner } from '../components/ui';
import { Github, Search, Loader2, AlertCircle, ExternalLink, Star, GitFork, Clock, Code } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export default function GitHubAnalyzer() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Restore previous GitHub analysis on mount
  useEffect(() => {
    githubAPI.get().then(({ data }) => {
      setResult({
        profile: data.profile,
        repositories: data.repositories,
        analysis: data.analysis,
      });
      if (data.username) setUsername(data.username);
    }).catch(() => {}); // 404 is fine — no prior analysis
  }, []);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await githubAPI.analyze(username.trim());
      setResult(data);
      toast.success('GitHub profile analyzed!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze GitHub profile');
    } finally {
      setLoading(false);
    }
  };

  const analysis = result?.analysis;
  const profile = result?.profile;
  const repos = result?.repositories || [];

  const langChartData = (analysis?.languages || []).slice(0, 8).map(l => ({
    name: l.name,
    count: l.count,
    percentage: l.percentage,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search */}
      <Card title="GitHub Profile Analyzer" subtitle="Enter a GitHub username to analyze repositories and skills" badge={<AIBadge />}>
        <form onSubmit={handleAnalyze} className="flex gap-3">
          <div className="relative flex-1">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="input pl-10"
              placeholder="Enter GitHub username (e.g., torvalds)"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading || !username.trim()} className="btn-primary">
            {loading ? <><Loader2 className="animate-spin" size={16} />Analyzing...</> : <><Search size={16} />Analyze</>}
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading && (
          <div className="mt-5 p-4 bg-primary-50 rounded-xl text-center">
            <Loader2 className="animate-spin mx-auto text-primary-600 mb-2" size={24} />
            <p className="text-primary-700 font-medium text-sm">Fetching GitHub data and running AI analysis...</p>
          </div>
        )}
      </Card>

      {result && (
        <>
          {/* Profile header */}
          <div className="card p-6">
            <div className="flex items-start gap-5">
              {profile?.avatar && (
                <img src={profile.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-slate-100 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{profile?.name || username}</h2>
                    {profile?.bio && <p className="text-slate-500 text-sm mt-0.5">{profile.bio}</p>}
                    {profile?.location && <p className="text-xs text-slate-400 mt-1">📍 {profile.location}</p>}
                  </div>
                  <a
                    href={`https://github.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm py-1.5"
                  >
                    <ExternalLink size={14} /> View Profile
                  </a>
                </div>
                <div className="flex gap-4 mt-3 text-sm text-slate-600">
                  <span><strong>{profile?.publicRepos || 0}</strong> repos</span>
                  <span><strong>{profile?.followers || 0}</strong> followers</span>
                  <span><strong>{profile?.following || 0}</strong> following</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Overall Score', value: `${analysis?.overallScore || 0}/100`, color: 'text-primary-600' },
              { label: 'Active Projects', value: analysis?.activeProjects || 0, color: 'text-green-600' },
              { label: 'Languages Used', value: analysis?.languages?.length || 0, color: 'text-purple-600' },
              { label: 'Project Experience', value: analysis?.projectExperience || 'N/A', color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Language chart */}
            {langChartData.length > 0 && (
              <Card title="Languages Used" subtitle="Based on repository languages">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={langChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(v, n, p) => [`${p.payload.percentage}% (${v} repos)`, 'Repositories']}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {langChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* AI insights */}
            <Card title="AI Analysis" badge={<AIBadge />}>
              {analysis?.summary && (
                <p className="text-sm text-slate-600 mb-4 p-3 bg-slate-50 rounded-xl leading-relaxed">{analysis.summary}</p>
              )}

              {analysis?.strengths?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-green-700 mb-2">✓ Strengths</p>
                  <ul className="space-y-1">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis?.areasToImprove?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-700 mb-2">↑ Areas to Improve</p>
                  <ul className="space-y-1">
                    {analysis.areasToImprove.map((a, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          {/* Repositories */}
          <Card title="Recent Repositories" subtitle={`${repos.length} repositories found`}>
            <div className="grid md:grid-cols-2 gap-3">
              {repos.slice(0, 10).map((repo) => (
                <a
                  key={repo.name}
                  href={`https://github.com/${username}/${repo.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 border border-slate-100 rounded-xl hover:border-primary-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <h4 className="font-medium text-slate-800 text-sm group-hover:text-primary-700 transition-colors truncate">{repo.name}</h4>
                    <ExternalLink size={12} className="text-slate-300 group-hover:text-primary-500 flex-shrink-0 ml-2" />
                  </div>
                  {repo.description && (
                    <p className="text-xs text-slate-500 mb-2 line-clamp-2">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        {repo.language}
                      </span>
                    )}
                    {repo.stars > 0 && <span className="flex items-center gap-1"><Star size={10} />{repo.stars}</span>}
                    {repo.forks > 0 && <span className="flex items-center gap-1"><GitFork size={10} />{repo.forks}</span>}
                  </div>
                </a>
              ))}
            </div>
          </Card>

          <div className="flex gap-3">
            <Link to="/career" className="btn-primary">Get Career Recommendations</Link>
            <Link to="/skills" className="btn-secondary">View Skill Gap</Link>
          </div>
        </>
      )}
    </div>
  );
}
