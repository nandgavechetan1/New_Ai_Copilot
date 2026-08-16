import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { resumeAPI } from '../lib/api';
import { Card, SkillChip, AIBadge, ScoreRing, ProgressBar, Spinner, EmptyState } from '../components/ui';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Lightbulb, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors">
        <span className="font-medium text-slate-700 text-sm">{title}</span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  );
};

// Reconstruct the analysisResult shape from a stored resume document
const resumeDocToResult = (doc) => {
  if (!doc?.extractedData) return null;
  return {
    extractedData: doc.extractedData,
    careerAnalysis: doc.careerAnalysis || null,
    skillGap: doc.skillGap || null,
    jobReadiness: doc.jobReadiness || null,
    improvement: doc.improvement || null,
    targetRole: doc.analysis?.targetRole || '',
  };
};

export default function ResumeAnalyzer() {
  const [uploadState, setUploadState] = useState('idle'); // idle | loading | uploading | analyzing | done | error
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [storedFilename, setStoredFilename] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('skills');

  // ── Load previously saved analysis on mount ──────────────────────────────
  useEffect(() => {
    const load = async () => {
      setUploadState('loading');
      try {
        const { data } = await resumeAPI.get();
        if (data?.extractedData) {
          setAnalysisResult(resumeDocToResult(data));
          setStoredFilename(data.originalFilename || '');
          setUploadState('done');
        } else if (data?.originalFilename) {
          // Resume uploaded but not yet analyzed
          setStoredFilename(data.originalFilename);
          setUploadState('ready');
        } else {
          setUploadState('idle');
        }
      } catch {
        // 404 = no resume yet — perfectly normal for new users
        setUploadState('idle');
      }
    };
    load();
  }, []);

  // ── Upload handler ────────────────────────────────────────────────────────
  const onDrop = useCallback(async (accepted, rejected) => {
    if (rejected.length > 0) {
      setError('Only PDF files are accepted. Maximum size: 5MB.');
      return;
    }
    const file = accepted[0];
    setUploadedFile(file);
    setError('');
    setAnalysisResult(null);
    setUploadState('uploading');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      await resumeAPI.upload(formData, (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      setStoredFilename(file.name);
      setUploadState('ready');
      toast.success('Resume uploaded! Click Analyze to continue.');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed. Please try again.');
      setUploadState('idle');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  // ── Analyze handler ───────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    setUploadState('analyzing');
    setError('');
    try {
      const { data } = await resumeAPI.analyze({ targetRole: targetRole || undefined });
      setAnalysisResult(data);
      setUploadState('done');
      toast.success('Resume analyzed successfully!');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Analysis failed. Please try again.';
      setError(msg);
      setUploadState('ready');
    }
  };

  const handleReanalyze = () => {
    setAnalysisResult(null);
    setUploadState('ready');
    setError('');
  };

  const extracted    = analysisResult?.extractedData;
  const improvement  = analysisResult?.improvement;
  const jobReadiness = analysisResult?.jobReadiness;
  const displayName  = uploadedFile?.name || storedFilename;

  // ── Initial load spinner ──────────────────────────────────────────────────
  if (uploadState === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-slate-500 text-sm">Loading your resume data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload card */}
      <Card
        title="Resume Analyzer"
        subtitle="Upload a PDF resume to get AI-powered analysis"
        badge={<AIBadge />}
        action={analysisResult && (
          <button onClick={handleReanalyze} className="btn-secondary text-xs py-1.5 px-3">
            <RefreshCw size={13} /> Re-analyze
          </button>
        )}
      >
        {/* Show previous file if analysis exists */}
        {analysisResult && displayName ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-green-800 text-sm truncate">{displayName}</p>
              <p className="text-xs text-green-600">Analysis complete — results shown below</p>
            </div>
            <button
              onClick={handleReanalyze}
              className="text-xs text-green-700 hover:underline flex-shrink-0"
            >
              Upload new
            </button>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              {...getRootProps()}
              className={clsx(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50',
                (uploadState === 'uploading' || uploadState === 'analyzing') &&
                  'pointer-events-none opacity-60'
              )}
            >
              <input {...getInputProps()} />
              {uploadState === 'uploading' ? (
                <div className="space-y-3">
                  <Loader2 className="animate-spin mx-auto text-primary-600" size={36} />
                  <p className="text-slate-600 font-medium">Uploading... {uploadProgress}%</p>
                  <div className="w-48 mx-auto bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : uploadState === 'ready' ? (
                <div className="space-y-2">
                  <CheckCircle className="mx-auto text-green-500" size={36} />
                  <p className="font-medium text-slate-800">{displayName}</p>
                  <p className="text-sm text-slate-500">Click or drop to replace</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="mx-auto text-slate-300" size={40} />
                  <div>
                    <p className="font-medium text-slate-700">
                      {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">PDF only · Max 5MB</p>
                  </div>
                  <span className="btn-secondary text-sm inline-flex">Browse Files</span>
                </div>
              )}
            </div>

            {/* Target role + analyze button */}
            {uploadState === 'ready' && (
              <div className="mt-5 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1">
                  <label className="label">Target Job Role (optional)</label>
                  <select
                    className="input"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  >
                    <option value="">Auto-detect best match</option>
                    {[
                      'Java Backend Developer', 'Full Stack Developer', 'Frontend Developer',
                      'Python Developer', 'Data Scientist', 'AI/ML Engineer',
                      'DevOps Engineer', '.NET Developer', 'Cloud Engineer',
                      'Cybersecurity Engineer', 'Mobile Developer', 'Software Engineer',
                    ].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={uploadState === 'analyzing'}
                  className="btn-primary"
                >
                  Analyze Resume
                </button>
              </div>
            )}

            {uploadState === 'analyzing' && (
              <div className="mt-5 p-4 bg-primary-50 rounded-xl text-center">
                <Loader2 className="animate-spin mx-auto text-primary-600 mb-2" size={24} />
                <p className="text-primary-700 font-medium text-sm">AI is analyzing your resume...</p>
                <p className="text-primary-500 text-xs mt-1">
                  Extracting skills · Identifying gaps · Generating insights
                </p>
                <p className="text-primary-400 text-xs mt-1">This may take 30–60 seconds</p>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-xl">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </Card>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {analysisResult && (
        <>
          {/* Score row */}
          <div className="grid md:grid-cols-3 gap-5">
            <div className="card p-5 text-center">
              <ScoreRing score={jobReadiness?.overall || 0} size={100} strokeWidth={9} />
              <p className="font-semibold text-slate-800 mt-3">Job Readiness</p>
              <p className="text-xs text-slate-500 mt-1 mb-2">AI Guidance Score</p>
              <span className="badge badge-blue">For: {analysisResult.targetRole || '—'}</span>
            </div>

            <div className="card p-5">
              <p className="font-semibold text-slate-700 mb-3 text-sm">Score Breakdown</p>
              <div className="space-y-3">
                {[
                  { l: 'Technical Skills', v: jobReadiness?.technicalSkills || 0 },
                  { l: 'Projects',         v: jobReadiness?.projects || 0 },
                  { l: 'Resume Quality',   v: jobReadiness?.resume || 0 },
                ].map((x) => (
                  <ProgressBar key={x.l} label={x.l} value={x.v} height={6} />
                ))}
              </div>
              {jobReadiness?.explanation && (
                <p className="text-xs text-slate-500 mt-3 leading-relaxed line-clamp-3">
                  {jobReadiness.explanation}
                </p>
              )}
            </div>

            <div className="card p-5">
              <p className="font-semibold text-slate-700 mb-3 text-sm">Profile Overview</p>
              <div className="space-y-2">
                {[
                  { label: 'Skills found',  value: extracted?.allSkills?.length || 0 },
                  { label: 'Languages',     value: extracted?.programmingLanguages?.length || 0 },
                  { label: 'Frameworks',    value: extracted?.frameworks?.length || 0 },
                  { label: 'Projects',      value: extracted?.projects?.length || 0 },
                  { label: 'Certifications',value: extracted?.certifications?.length || 0 },
                ].map((x) => (
                  <div key={x.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{x.label}</span>
                    <span className="font-medium text-slate-800">{x.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-slate-100 overflow-x-auto">
              {[
                { id: 'skills',      label: 'Extracted Skills' },
                { id: 'projects',    label: 'Projects & Experience' },
                { id: 'improvement', label: 'Resume Improvement' },
                { id: 'education',   label: 'Education' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Skills tab */}
              {activeTab === 'skills' && (
                <div className="space-y-5">
                  {[
                    { title: '💻 Programming Languages', items: extracted?.programmingLanguages, variant: 'blue' },
                    { title: '🚀 Frameworks & Libraries', items: extracted?.frameworks,           variant: 'purple' },
                    { title: '🗄️ Databases',              items: extracted?.databases,            variant: 'blue' },
                    { title: '🛠️ Tools & Platforms',      items: extracted?.tools,               variant: 'default' },
                    { title: '🤝 Soft Skills',            items: extracted?.softSkills,           variant: 'default' },
                    { title: '🎓 Certifications',         items: extracted?.certifications,       variant: 'purple' },
                  ].map(({ title, items, variant }) =>
                    items?.length > 0 && (
                      <Section key={title} title={title}>
                        <div className="flex flex-wrap gap-2">
                          {items.map((s) => (
                            <SkillChip key={s} skill={s} variant={variant} />
                          ))}
                        </div>
                      </Section>
                    )
                  )}
                  {!extracted?.allSkills?.length && (
                    <EmptyState
                      icon="🔍"
                      title="No skills detected"
                      description="Make sure your resume is text-based (not a scanned image) and click Analyze again."
                    />
                  )}
                </div>
              )}

              {/* Projects tab */}
              {activeTab === 'projects' && (
                <div className="space-y-4">
                  {extracted?.projects?.length > 0 ? (
                    extracted.projects.map((p, i) => (
                      <div key={i} className="p-4 border border-slate-100 rounded-xl">
                        <h4 className="font-semibold text-slate-800 mb-1">{p.name || `Project ${i + 1}`}</h4>
                        {p.description && (
                          <p className="text-sm text-slate-600 mb-2">{p.description}</p>
                        )}
                        {p.technologies?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {p.technologies.map((t) => (
                              <SkillChip key={t} skill={t} variant="blue" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon="📁"
                      title="No projects extracted"
                      description="Projects may not have been detected in your resume format."
                    />
                  )}

                  {extracted?.internships?.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-slate-700 mb-3">Internship Experience</h3>
                      {extracted.internships.map((exp, i) => (
                        <div key={i} className="p-4 border border-slate-100 rounded-xl mb-3">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-semibold text-slate-800">{exp.role || 'Role'}</h4>
                            {exp.duration && <span className="badge badge-gray">{exp.duration}</span>}
                          </div>
                          {exp.company && <p className="text-sm text-slate-500">{exp.company}</p>}
                          {exp.description && (
                            <p className="text-sm text-slate-600 mt-2">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Improvement tab */}
              {activeTab === 'improvement' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-800 text-sm">
                    <Lightbulb size={16} />
                    AI-generated suggestions. Only add skills or experience you actually have.
                  </div>

                  {improvement?.suggestions?.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-700">Improvement Suggestions</h3>
                      {improvement.suggestions.map((s, i) => (
                        <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-2">
                          <span className="badge badge-blue">{s.section}</span>
                          {s.original && s.original !== 'Missing' && s.original !== '(missing)' && (
                            <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                              <p className="font-medium mb-1">Current:</p>
                              <p>{s.original}</p>
                            </div>
                          )}
                          <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                            <p className="font-medium mb-1">Suggested:</p>
                            <p>{s.improved}</p>
                          </div>
                          {s.reason && <p className="text-xs text-slate-500">{s.reason}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {improvement?.missingKeywords?.length > 0 && (
                    <Section title="Missing Keywords for Your Target Role">
                      <div className="flex flex-wrap gap-2">
                        {improvement.missingKeywords.map((k) => (
                          <SkillChip key={k} skill={k} variant="missing" icon="○" />
                        ))}
                      </div>
                    </Section>
                  )}

                  {improvement?.formattingIssues?.length > 0 && (
                    <Section title="Formatting Tips">
                      <ul className="space-y-2">
                        {improvement.formattingIssues.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}

                  {improvement?.overallTips?.length > 0 && (
                    <Section title="General Tips">
                      <ul className="space-y-2">
                        {improvement.overallTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-primary-500 mt-0.5 flex-shrink-0">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}
                </div>
              )}

              {/* Education tab */}
              {activeTab === 'education' && (
                <div className="space-y-4">
                  {extracted?.education?.length > 0 ? (
                    extracted.education.map((e, i) => (
                      <div key={i} className="p-4 border border-slate-100 rounded-xl">
                        <h4 className="font-semibold text-slate-800">
                          {e.degree} {e.field && `in ${e.field}`}
                        </h4>
                        <p className="text-sm text-slate-600">{e.institution}</p>
                        <div className="flex gap-2 mt-2">
                          {e.year && <span className="badge badge-gray">{e.year}</span>}
                          {e.gpa && <span className="badge badge-green">GPA: {e.gpa}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon="🎓"
                      title="No education extracted"
                      description="Education details may not have been detected."
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <Link to="/career" className="btn-primary">
              View Career Recommendations <ArrowRight size={16} />
            </Link>
            <Link to="/skills" className="btn-secondary">See Skill Gap</Link>
            <Link to="/roadmap" className="btn-secondary">Learning Roadmap</Link>
          </div>
        </>
      )}
    </div>
  );
}
