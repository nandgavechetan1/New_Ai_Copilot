import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../lib/api';
import { ScoreRing, ProgressBar, SkillChip, Card, StatCard, EmptyState, AIBadge, Spinner } from '../components/ui';
import { FileText, Github, Briefcase, Target, Map, MessageSquare, ArrowRight, TrendingUp, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: d } = await dashboardAPI.get();
        setData(d);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-slate-500 text-sm">Loading your dashboard...</p>
      </div>
    </div>
  );

  const readiness = data?.jobReadiness;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-primary-200 text-sm font-medium mb-1">Welcome back 👋</p>
            <h1 className="text-2xl font-bold">{data?.user?.name || user?.name || 'Student'}</h1>
            {data?.user?.targetRole && (
              <p className="text-primary-200 text-sm mt-1">Target: {data.user.targetRole}</p>
            )}
          </div>
          {readiness && (
            <div className="text-center">
              <ScoreRing score={readiness.overall || 0} size={90} strokeWidth={8} color="#ffffff" />
              <p className="text-primary-200 text-xs mt-1">Job Readiness</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText size={20} />}
          label="Resume"
          value={data?.resumeUploaded ? `${data.resumeScore || 0}%` : 'Not uploaded'}
          sub={data?.resumeUploaded ? 'Quality score' : 'Upload to get started'}
          color="blue"
        />
        <StatCard
          icon={<Github size={20} />}
          label="GitHub"
          value={data?.githubConnected ? `${data.githubScore || 0}%` : 'Not connected'}
          sub={data?.githubConnected ? 'Profile score' : 'Connect for more insights'}
          color="purple"
        />
        <StatCard
          icon={<Target size={20} />}
          label="Skills"
          value={data?.skillGapSummary?.strong || 0}
          sub={`${data?.skillGapSummary?.missing || 0} skills to learn`}
          color="green"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Readiness"
          value={readiness ? `${readiness.overall}/100` : 'N/A'}
          sub="AI guidance score"
          color="amber"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Job Readiness breakdown */}
        <div className="lg:col-span-2">
          <Card title="Job Readiness Breakdown" subtitle="AI-generated guidance score" badge={<AIBadge />}>
            {readiness ? (
              <div className="space-y-4">
                {[
                  { label: 'Technical Skills', value: readiness.technicalSkills || 0 },
                  { label: 'Projects', value: readiness.projects || 0 },
                  { label: 'GitHub Activity', value: readiness.github || 0 },
                  { label: 'Resume Quality', value: readiness.resume || 0 },
                  { label: 'Interview Readiness', value: readiness.interviewReadiness || 0 },
                  { label: 'Certifications', value: readiness.certifications || 0 },
                ].map((item) => (
                  <ProgressBar key={item.label} label={item.label} value={item.value} />
                ))}
                {readiness.explanation && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl text-sm text-slate-600 leading-relaxed">
                    {readiness.explanation}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon="📊"
                title="No readiness data yet"
                description="Upload your resume and analyze your profile to see your job readiness score."
                action={<Link to="/resume" className="btn-primary text-sm">Upload Resume</Link>}
              />
            )}
          </Card>
        </div>

        {/* Next steps */}
        <div>
          <Card title="Next Steps" subtitle="Recommended actions">
            {(data?.nextSteps || []).length > 0 ? (
              <div className="space-y-3">
                {data.nextSteps.map((step, i) => (
                  <Link key={i} to={step.route} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-primary-200 transition-all group">
                    <div className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{step.action}</p>
                      <p className="text-xs text-slate-500 truncate">{step.description}</p>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-primary-600 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Upload Resume', route: '/resume' },
                  { label: 'Analyze GitHub', route: '/github' },
                  { label: 'Get Career Recommendations', route: '/career' },
                  { label: 'Start Mock Interview', route: '/interview' },
                ].map((item, i) => (
                  <Link key={i} to={item.route} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all group">
                    <div className="w-6 h-6 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div>
                    <span className="text-sm text-slate-700 flex-1">{item.label}</span>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-primary-600" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Career match */}
          {data?.topCareerMatch && (
            <Card title="Top Career Match" className="mt-4" badge={<AIBadge />}>
              <div className="text-center py-2">
                <p className="text-lg font-bold text-slate-800">{data.topCareerMatch.career}</p>
                <div className="mt-2 mb-3">
                  <ScoreRing score={data.topCareerMatch.matchScore || 0} size={80} strokeWidth={8} />
                </div>
                <p className="text-xs text-slate-500">Match Score</p>
                <Link to="/career" className="btn-primary w-full justify-center mt-4 text-sm py-2">
                  View All Career Paths
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Skills summary */}
      {(data?.skillGapSummary?.strongSkills?.length > 0 || data?.skillGapSummary?.missingSkills?.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Strong Skills" badge={<span className="badge badge-green">✓ {data.skillGapSummary.strong}</span>}>
            <div className="flex flex-wrap gap-2">
              {data.skillGapSummary.strongSkills.map(s => <SkillChip key={s} skill={s} variant="strong" icon="✓" />)}
            </div>
          </Card>
          <Card title="Skills to Learn" badge={<span className="badge badge-red">○ {data.skillGapSummary.missing}</span>}>
            <div className="flex flex-wrap gap-2">
              {data.skillGapSummary.missingSkills.map(s => <SkillChip key={s} skill={s} variant="missing" icon="○" />)}
              {data.skillGapSummary.missing > 5 && (
                <Link to="/skills" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-primary-600 bg-primary-50 hover:bg-primary-100">
                  +{data.skillGapSummary.missing - 5} more <ArrowRight size={10} />
                </Link>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Quick access cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { to: '/interview', icon: MessageSquare, label: 'Start Mock Interview', desc: 'Practice with AI interviewer', color: 'bg-purple-50 text-purple-600', btn: 'btn-primary' },
          { to: '/roadmap', icon: Map, label: 'Learning Roadmap', desc: 'Follow your study plan', color: 'bg-green-50 text-green-600', btn: 'btn-secondary' },
          { to: '/career', icon: Briefcase, label: 'Career Paths', desc: 'Explore career options', color: 'bg-amber-50 text-amber-600', btn: 'btn-secondary' },
        ].map(({ to, icon: Icon, label, desc, color, btn }) => (
          <div key={to} className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={20} />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm mb-1">{label}</h3>
            <p className="text-xs text-slate-500 mb-4">{desc}</p>
            <Link to={to} className={`${btn} text-sm w-full justify-center`}>{label}</Link>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-slate-400">
        ⚠️ AI Career Copilot provides AI-generated guidance only. Scores and recommendations do not guarantee employment.
      </p>
    </div>
  );
}
