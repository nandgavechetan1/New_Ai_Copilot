import { useState, useEffect } from 'react';
import { roadmapAPI } from '../lib/api';
import { Card, AIBadge, EmptyState, Spinner } from '../components/ui';
import { Map, Loader2, AlertCircle, CheckCircle, ArrowRight, ExternalLink, Clock, BookOpen, Code, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const CAREER_ROLES = [
  'Java Backend Developer', 'Full Stack Developer', 'Frontend Developer',
  'Python Developer', 'Data Scientist', 'AI/ML Engineer',
  'DevOps Engineer', '.NET Developer', 'Software Engineer',
];

export default function LearningRoadmap() {
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roadmap, setRoadmap] = useState(null);
  const [completingStage, setCompletingStage] = useState(null);

  // Restore saved roadmap on mount
  useEffect(() => {
    roadmapAPI.get().then(({ data }) => {
      setRoadmap(data);
      if (data.targetRole) setTargetRole(data.targetRole);
    }).catch(() => {}); // 404 is fine — no roadmap yet
  }, []);

  const handleGenerate = async () => {
    if (!targetRole) { setError('Please select a target role'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await roadmapAPI.generate({ targetRole });
      setRoadmap(data.roadmap);
      toast.success('Learning roadmap generated!');
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStage = async (stageNumber) => {
    setCompletingStage(stageNumber);
    try {
      const { data } = await roadmapAPI.completeStage(stageNumber);
      setRoadmap(data.roadmap);
      toast.success(`Stage ${stageNumber} completed! 🎉`);
    } catch (err) {
      toast.error('Failed to update stage');
    } finally {
      setCompletingStage(null);
    }
  };

  const stages = roadmap?.stages || [];
  const completedCount = stages.filter(s => s.completed).length;
  const progressPercent = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls */}
      <Card title="Personalized Learning Roadmap" subtitle="AI generates a step-by-step learning plan based on your skill gaps" badge={<AIBadge />}>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="label">Target Role</label>
            <select className="input" value={targetRole} onChange={e => setTargetRole(e.target.value)}>
              <option value="">Select your target role...</option>
              {CAREER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={loading} className="btn-primary">
            {loading ? <><Loader2 className="animate-spin" size={16} />Generating...</> : <><Map size={16} />Generate Roadmap</>}
          </button>
        </div>
        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </Card>

      {/* Progress */}
      {roadmap && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-slate-800">Your Progress</h2>
              <p className="text-sm text-slate-500">{roadmap.targetRole} · {roadmap.totalDuration}</p>
            </div>
            <div className="text-2xl font-bold text-primary-600">{progressPercent}%</div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-2">
            <div className="h-3 rounded-full bg-gradient-to-r from-primary-500 to-green-500 transition-all duration-700" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-xs text-slate-500">{completedCount} of {stages.length} stages completed</p>
        </div>
      )}

      {/* Stages */}
      {stages.length > 0 && (
        <div className="space-y-4">
          {stages.map((stage, idx) => (
            <div
              key={stage.stageNumber || idx}
              className={clsx(
                'card overflow-hidden transition-all duration-200',
                stage.completed && 'opacity-80'
              )}
            >
              <div className={clsx(
                'flex items-start gap-4 p-5',
                stage.completed && 'bg-green-50'
              )}>
                {/* Stage number */}
                <div className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                  stage.completed ? 'bg-green-500 text-white' : 'bg-primary-600 text-white'
                )}>
                  {stage.completed ? <CheckCircle size={18} /> : stage.stageNumber || idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                          Stage {stage.stageNumber || idx + 1}
                        </span>
                        {stage.completed && <span className="badge badge-green">Completed</span>}
                      </div>
                      <h3 className="font-bold text-slate-800 text-base">{stage.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{stage.topic}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="badge badge-gray flex items-center gap-1">
                        <Clock size={11} /> {stage.duration}
                      </span>
                    </div>
                  </div>

                  {stage.whyItMatters && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
                      <Lightbulb size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{stage.whyItMatters}</span>
                    </div>
                  )}

                  {/* Resources */}
                  {stage.resources?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Learning Resources</p>
                      <div className="flex flex-wrap gap-2">
                        {stage.resources.map((r, ri) => (
                          <a
                            key={ri}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={clsx(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                              r.provider?.includes('IBM') ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            )}
                          >
                            {r.provider?.includes('IBM') ? <BookOpen size={11} /> : <ExternalLink size={11} />}
                            {r.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Practice task + mini project */}
                  {(stage.practiceTask || stage.miniProject) && (
                    <div className="mt-3 grid sm:grid-cols-2 gap-3">
                      {stage.practiceTask && (
                        <div className="bg-amber-50 p-3 rounded-lg">
                          <p className="text-xs font-medium text-amber-700 mb-1">📝 Practice Task</p>
                          <p className="text-xs text-amber-800">{stage.practiceTask}</p>
                        </div>
                      )}
                      {stage.miniProject && (
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-xs font-medium text-purple-700 mb-1">🚀 Mini Project</p>
                          <p className="text-xs text-purple-800">{stage.miniProject}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Complete button */}
                  {!stage.completed && (
                    <button
                      onClick={() => handleCompleteStage(stage.stageNumber || idx + 1)}
                      disabled={completingStage === (stage.stageNumber || idx + 1)}
                      className="mt-4 btn-secondary text-sm py-1.5"
                    >
                      {completingStage === (stage.stageNumber || idx + 1) ? (
                        <><Loader2 className="animate-spin" size={14} />Saving...</>
                      ) : (
                        <><CheckCircle size={14} />Mark as Complete</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!roadmap && !loading && (
        <EmptyState
          icon="🗺️"
          title="Your personalized learning roadmap"
          description="Select your target role and generate a step-by-step AI learning plan with resources and projects."
          action={
            <div className="flex gap-3 justify-center">
              <Link to="/skills" className="btn-secondary text-sm">Analyze Skill Gap First</Link>
              <button onClick={() => setTargetRole('Java Backend Developer')} className="btn-primary text-sm">Try Demo Roadmap</button>
            </div>
          }
        />
      )}
    </div>
  );
}
