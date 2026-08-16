import { useState, useEffect } from 'react';
import { skillsAPI } from '../lib/api';
import { Card, SkillChip, AIBadge, EmptyState } from '../components/ui';
import { Target, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const CAREER_ROLES = [
  'Java Backend Developer', 'Full Stack Developer', 'Frontend Developer',
  'Python Developer', 'Data Scientist', 'AI/ML Engineer',
  'DevOps Engineer', '.NET Developer', 'Cloud Engineer',
  'Cybersecurity Engineer', 'Mobile Developer', 'Software Engineer',
];

export default function SkillGap() {
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Restore previous analysis on mount
  useEffect(() => {
    skillsAPI.get().then(({ data }) => {
      setResult(data);
      if (data.targetRole) setTargetRole(data.targetRole);
    }).catch(() => {}); // 404 is fine — no prior analysis
  }, []);

  const handleAnalyze = async () => {
    if (!targetRole) {
      setError('Please select a target role');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await skillsAPI.analyze({ targetRole });
      setResult({ ...data, targetRole });
      toast.success('Skill gap analysis complete!');
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Upload your resume first.');
    } finally {
      setLoading(false);
    }
  };

  const strong = result?.strongSkills || [];
  const developing = result?.developingSkills || [];
  const missing = result?.missingSkills || [];
  const required = result?.requiredSkills || [];
  const total = required.length || (strong.length + developing.length + missing.length);
  const readyPercent = total > 0 ? Math.round(((strong.length + developing.length * 0.5) / total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls */}
      <Card title="Skill Gap Analysis" subtitle="Compare your current skills against job requirements" badge={<AIBadge />}>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="label">Target Role</label>
            <select className="input" value={targetRole} onChange={e => setTargetRole(e.target.value)}>
              <option value="">Select target role...</option>
              {CAREER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button onClick={handleAnalyze} disabled={loading} className="btn-primary">
            {loading ? <><Loader2 className="animate-spin" size={16} />Analyzing...</> : <><Target size={16} />Analyze Gap</>}
          </button>
        </div>
        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
            <AlertCircle size={16} /> {error}
            {error.includes('resume') && (
              <Link to="/resume" className="ml-auto text-primary-600 font-medium">Upload Resume →</Link>
            )}
          </div>
        )}
      </Card>

      {result && (
        <>
          {/* Summary bar */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Skill Gap for: {result.targetRole}</h2>
                <p className="text-sm text-slate-500">You meet approximately {readyPercent}% of required skills</p>
              </div>
              <div className="text-3xl font-bold text-primary-600">{readyPercent}%</div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full bg-gradient-to-r from-primary-500 to-green-500 transition-all duration-700" style={{ width: `${readyPercent}%` }} />
            </div>
            <div className="flex gap-6 mt-4 text-sm">
              <span className="flex items-center gap-1.5 text-green-600"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />{strong.length} Strong</span>
              <span className="flex items-center gap-1.5 text-amber-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />{developing.length} Developing</span>
              <span className="flex items-center gap-1.5 text-red-600"><span className="w-2.5 h-2.5 rounded-full bg-red-400" />{missing.length} Missing</span>
            </div>
          </div>

          {/* Three columns */}
          <div className="grid md:grid-cols-3 gap-5">
            {/* Strong */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <h3 className="font-semibold text-slate-800">Strong Skills</h3>
                <span className="ml-auto badge badge-green">{strong.length}</span>
              </div>
              <div className="space-y-2">
                {strong.length > 0 ? (
                  strong.map(s => (
                    <div key={s} className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg">
                      <span className="text-green-600 font-bold text-sm">✓</span>
                      <span className="text-sm text-green-800 font-medium">{s}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">No strong skills identified yet</p>
                )}
              </div>
            </div>

            {/* Developing */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h3 className="font-semibold text-slate-800">Developing</h3>
                <span className="ml-auto badge badge-amber">{developing.length}</span>
              </div>
              <div className="space-y-2">
                {developing.length > 0 ? (
                  developing.map(s => (
                    <div key={s} className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg">
                      <span className="text-amber-500 font-bold text-sm">◐</span>
                      <span className="text-sm text-amber-800 font-medium">{s}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">No developing skills found</p>
                )}
              </div>
            </div>

            {/* Missing */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <h3 className="font-semibold text-slate-800">Missing Skills</h3>
                <span className="ml-auto badge badge-red">{missing.length}</span>
              </div>
              <div className="space-y-2">
                {missing.length > 0 ? (
                  missing.map(s => (
                    <div key={s} className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg">
                      <span className="text-red-400 font-bold text-sm">○</span>
                      <span className="text-sm text-red-800 font-medium">{s}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-2xl mb-2">🎉</p>
                    <p className="text-sm text-green-700 font-medium">Great! No critical gaps found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Priority learning */}
          {result.priorityLearning?.length > 0 && (
            <Card title="🎯 Priority Learning — Start Here" subtitle="The most important skills to learn next">
              <div className="grid md:grid-cols-3 gap-3">
                {result.priorityLearning.map((skill, i) => (
                  <div key={skill} className="flex items-center gap-3 p-4 border-2 border-primary-100 bg-primary-50 rounded-xl">
                    <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="font-medium text-primary-800">{skill}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex gap-3">
            <Link to="/roadmap" className="btn-primary">Generate Learning Roadmap <ArrowRight size={16} /></Link>
            <Link to="/career" className="btn-secondary">Career Recommendations</Link>
          </div>
        </>
      )}

      {!result && !loading && (
        <EmptyState
          icon="🎯"
          title="Know exactly what to learn"
          description="Select your target role and analyze your skill gaps. Upload your resume first for accurate results."
          action={<Link to="/resume" className="btn-primary text-sm">Upload Resume</Link>}
        />
      )}
    </div>
  );
}
