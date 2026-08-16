import { useState, useEffect } from 'react';
import { careerAPI } from '../lib/api';
import { Card, SkillChip, AIBadge, ScoreRing, ProgressBar, EmptyState, Spinner } from '../components/ui';
import { Loader2, AlertCircle, ArrowRight, Briefcase, CheckCircle, BookOpen, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const CAREER_ROLES = [
  'Java Backend Developer', 'Full Stack Developer', 'Frontend Developer',
  'Python Developer', 'Data Scientist', 'AI/ML Engineer',
  'DevOps Engineer', '.NET Developer', 'Cloud Engineer',
  'Cybersecurity Engineer', 'Mobile Developer', 'Software Engineer',
];

export default function CareerPaths() {
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [selectedCareer, setSelectedCareer] = useState(null);

  // Load previously saved career analysis on mount
  useEffect(() => {
    careerAPI.get()
      .then(({ data }) => {
        if (data?.recommendations?.length) {
          setResult({
            recommendations: data.recommendations,
            topCareer: data.recommendations[0]?.career,
            jobReadiness: data.jobReadinessScore,
            skillGap: data.skillGap,
            courses: data.courses || [],
            targetRole: data.targetRole,
          });
          setSelectedCareer(data.recommendations[0]);
          setTargetRole(data.targetRole || '');
        }
      })
      .catch(() => {/* no saved data yet */})
      .finally(() => setLoading(false));
  }, []);

  const handleAnalyze = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await careerAPI.analyze({ targetRole: targetRole || undefined });
      setResult(data);
      setSelectedCareer(data.recommendations?.[0] || null);
      toast.success('Career analysis complete!');
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls */}
      <Card title="Career Path Analysis" subtitle="AI will analyze your profile and recommend suitable career paths" badge={<AIBadge />}>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="label">Target Role (optional)</label>
            <select className="input" value={targetRole} onChange={e => setTargetRole(e.target.value)}>
              <option value="">Recommend the best career paths for me</option>
              {CAREER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button onClick={handleAnalyze} disabled={loading} className="btn-primary">
            {loading ? <><Loader2 className="animate-spin" size={16} />Analyzing...</> : <><Briefcase size={16} />Analyze Career</>}
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading && (
          <div className="mt-5 p-4 bg-primary-50 rounded-xl text-center">
            <Loader2 className="animate-spin mx-auto text-primary-600 mb-2" size={24} />
            <p className="text-primary-700 font-medium text-sm">AI is analyzing your profile for best career matches...</p>
          </div>
        )}
      </Card>

      {result && (
        <>
          {/* Job readiness */}
          {result.jobReadiness && (
            <div className="card p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Job Readiness Score</h2>
                  <p className="text-sm text-slate-500">AI Guidance Score for {result.targetRole}</p>
                </div>
                <AIBadge />
              </div>
              <div className="flex items-center gap-8 flex-wrap">
                <div className="text-center">
                  <ScoreRing score={result.jobReadiness.overall || 0} size={110} strokeWidth={10} />
                  <p className="text-xs text-slate-500 mt-2">Overall Score</p>
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  {[
                    { l: 'Technical Skills', v: result.jobReadiness.technicalSkills },
                    { l: 'Projects', v: result.jobReadiness.projects },
                    { l: 'GitHub Activity', v: result.jobReadiness.github },
                    { l: 'Resume Quality', v: result.jobReadiness.resume },
                    { l: 'Interview Readiness', v: result.jobReadiness.interviewReadiness },
                  ].map(x => <ProgressBar key={x.l} label={x.l} value={x.v || 0} />)}
                </div>
              </div>
              {result.jobReadiness.explanation && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
                  {result.jobReadiness.explanation}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-3">⚠️ This score is AI-generated guidance only and does not guarantee employment.</p>
            </div>
          )}

          {/* Career recommendations */}
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Career list */}
            <div className="space-y-3">
              <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">Recommended Careers</h2>
              {result.recommendations?.map((rec) => (
                <button
                  key={rec.career}
                  onClick={() => setSelectedCareer(rec)}
                  className={clsx(
                    'w-full text-left p-4 rounded-xl border transition-all duration-200',
                    selectedCareer?.career === rec.career
                      ? 'border-primary-300 bg-primary-50 shadow-sm'
                      : 'border-slate-100 bg-white hover:border-primary-200'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800 text-sm">{rec.career}</h3>
                    <span className={clsx('badge text-xs', getMatchColor(rec.matchScore))}>
                      {rec.matchScore}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${rec.matchScore}%` }} />
                  </div>
                </button>
              ))}
            </div>

            {/* Selected career detail */}
            {selectedCareer && (
              <div className="lg:col-span-2 card p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedCareer.career}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{selectedCareer.whyItMatches}</p>
                  </div>
                  <div className={clsx('text-3xl font-bold px-4 py-2 rounded-xl', getMatchColor(selectedCareer.matchScore))}>
                    {selectedCareer.matchScore}%
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <h3 className="font-medium text-green-700 mb-2 text-sm">✓ Your Strengths</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCareer.strengths?.map(s => (
                        <SkillChip key={s} skill={s} variant="strong" icon="✓" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-red-700 mb-2 text-sm">○ Skill Gaps</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCareer.skillGaps?.map(s => (
                        <SkillChip key={s} skill={s} variant="missing" icon="○" />
                      ))}
                    </div>
                  </div>
                </div>

                {selectedCareer.nextSteps?.length > 0 && (
                  <div>
                    <h3 className="font-medium text-slate-700 mb-2 text-sm">📋 Next Steps</h3>
                    <ul className="space-y-1.5">
                      {selectedCareer.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                          <ArrowRight size={12} className="text-primary-500" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100">
                  <Link to="/skills" className="btn-primary text-sm">View Skill Gap Analysis</Link>
                  <Link to="/roadmap" className="btn-secondary text-sm">Generate Learning Roadmap</Link>
                </div>
              </div>
            )}
          </div>

          {/* Course recommendations */}
          {result.courses?.length > 0 && (
            <Card title="Recommended Courses" subtitle="Based on your skill gaps" badge={<AIBadge />}>
              <div className="grid md:grid-cols-2 gap-4">
                {result.courses.map((course, i) => (
                  <a
                    key={i}
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl hover:border-primary-200 hover:shadow-sm transition-all group"
                  >
                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      course.isIBMSkillsBuild ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    )}>
                      <BookOpen size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <h4 className="font-medium text-slate-800 text-sm group-hover:text-primary-700 flex-1">{course.title}</h4>
                        {course.isIBMSkillsBuild && <span className="badge badge-blue flex-shrink-0">IBM</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{course.provider}</p>
                      <p className="text-xs text-slate-600 mt-1.5">{course.reason}</p>
                      <div className="flex gap-2 mt-2">
                        {course.level && <span className="badge badge-gray">{course.level}</span>}
                        {course.duration && <span className="badge badge-gray">{course.duration}</span>}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {!result && !loading && (
        <EmptyState
          icon="🧭"
          title="Discover your best career paths"
          description="Upload your resume first, then click 'Analyze Career' to get personalized AI career recommendations based on your skills."
          action={
            <div className="flex gap-3 justify-center">
              <Link to="/resume" className="btn-secondary text-sm">Upload Resume First</Link>
              <button onClick={handleAnalyze} className="btn-primary text-sm">Analyze Anyway</button>
            </div>
          }
        />
      )}
    </div>
  );
}
