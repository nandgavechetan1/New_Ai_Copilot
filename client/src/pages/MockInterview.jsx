import { useState } from 'react';
import { interviewAPI } from '../lib/api';
import { Card, AIBadge, ScoreRing, ProgressBar } from '../components/ui';
import { MessageSquare, Loader2, AlertCircle, Send, CheckCircle, ArrowRight, Star, TrendingUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const JOB_ROLES = [
  'Java Developer', 'Full Stack Developer', 'Frontend Developer',
  'Python Developer', '.NET Developer', 'Data Scientist',
  'DevOps Engineer', 'Software Engineer', 'Backend Developer',
];

const STAGES = { setup: 'setup', active: 'active', feedback: 'feedback', results: 'results' };

export default function MockInterview() {
  const [stage, setStage] = useState(STAGES.setup);
  const [config, setConfig] = useState({ jobRole: '', difficulty: 'intermediate', interviewType: 'technical', totalQuestions: 5 });
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [error, setError] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [nextQuestion, setNextQuestion] = useState(null);

  const handleStart = async () => {
    if (!config.jobRole) { setError('Please select a job role'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await interviewAPI.start(config);
      setInterview(data);
      setCurrentQuestion(data.currentQuestion);
      setStage(STAGES.active);
      setQuestionHistory([]);
      toast.success('Interview started! Good luck! 🎯');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) { toast.error('Please write an answer'); return; }
    setLoading(true);
    try {
      const { data } = await interviewAPI.answer({
        interviewId: interview.interviewId,
        answer: answer.trim(),
      });
      setFeedback(data.feedback);
      setIsComplete(data.isComplete);
      setNextQuestion(data.nextQuestion);
      setQuestionHistory(prev => [...prev, {
        question: currentQuestion.questionText,
        answer: answer.trim(),
        feedback: data.feedback,
        questionNumber: (interview.questionNumber || 0),
      }]);
      setStage(STAGES.feedback);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (isComplete) {
      fetchResults();
    } else if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      setAnswer('');
      setFeedback(null);
      setStage(STAGES.active);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const { data } = await interviewAPI.getResult(interview.interviewId);
      setResults(data);
      setStage(STAGES.results);
    } catch (err) {
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setStage(STAGES.setup);
    setInterview(null);
    setCurrentQuestion(null);
    setAnswer('');
    setFeedback(null);
    setResults(null);
    setQuestionHistory([]);
    setIsComplete(false);
    setError('');
  };

  const getScoreColor = (s) => s >= 80 ? 'text-green-600' : s >= 60 ? 'text-blue-600' : s >= 40 ? 'text-amber-600' : 'text-red-600';
  const questionNum = (questionHistory.length) + (stage === STAGES.active ? 1 : stage === STAGES.feedback ? 0 : 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Setup */}
      {stage === STAGES.setup && (
        <Card title="AI Mock Interview" subtitle="Practice with an AI interviewer and get real-time feedback" badge={<AIBadge />}>
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="label">Job Role</label>
              <select className="input" value={config.jobRole} onChange={e => setConfig({ ...config, jobRole: e.target.value })}>
                <option value="">Select role...</option>
                {JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={config.difficulty} onChange={e => setConfig({ ...config, difficulty: e.target.value })}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="label">Interview Type</label>
              <select className="input" value={config.interviewType} onChange={e => setConfig({ ...config, interviewType: e.target.value })}>
                <option value="technical">Technical</option>
                <option value="hr">HR / Behavioral</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="label">Number of Questions</label>
              <select className="input" value={config.totalQuestions} onChange={e => setConfig({ ...config, totalQuestions: parseInt(e.target.value) })}>
                {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700 mb-5">
            <p className="font-medium mb-1">How it works:</p>
            <p>The AI will ask you questions one at a time. Type your answer and submit. You'll get instant feedback, a score, and improvement suggestions after each answer.</p>
          </div>

          <button onClick={handleStart} disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? <><Loader2 className="animate-spin" size={18} />Starting Interview...</> : <><MessageSquare size={18} />Start Interview</>}
          </button>
        </Card>
      )}

      {/* Active interview */}
      {stage === STAGES.active && currentQuestion && (
        <>
          {/* Progress */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Question {questionHistory.length + 1} of {interview.totalQuestions}</span>
              <span className={clsx('badge', currentQuestion.questionType === 'technical' ? 'badge-blue' : 'badge-purple')}>
                {currentQuestion.questionType === 'technical' ? '⚙️ Technical' : '💬 Behavioral'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="h-2 bg-primary-500 rounded-full transition-all" style={{ width: `${(questionHistory.length / interview.totalQuestions) * 100}%` }} />
            </div>
          </div>

          {/* Question */}
          <Card>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🤖</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">AI Interviewer</p>
                <p className="text-slate-800 font-medium text-base leading-relaxed">{currentQuestion.questionText}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <label className="label">Your Answer</label>
              <textarea
                className="input min-h-[140px] resize-y text-sm leading-relaxed"
                placeholder="Type your detailed answer here. Be specific and explain your reasoning..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                disabled={loading}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-400">{answer.split(/\s+/).filter(Boolean).length} words</span>
                <button onClick={handleSubmitAnswer} disabled={loading || !answer.trim()} className="btn-primary">
                  {loading ? <><Loader2 className="animate-spin" size={16} />Evaluating...</> : <><Send size={16} />Submit Answer</>}
                </button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Feedback */}
      {stage === STAGES.feedback && feedback && (
        <>
          {/* Score */}
          <div className="card p-5">
            <div className="flex items-center gap-5">
              <ScoreRing score={feedback.score || 0} size={90} strokeWidth={8} />
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Answer Evaluated</h3>
                <p className="text-slate-500 text-sm">Question {questionHistory.length} of {interview.totalQuestions}</p>
              </div>
            </div>
          </div>

          {/* Feedback cards */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
              <p className="font-medium text-green-700 mb-2 text-sm">✓ What was good</p>
              <p className="text-sm text-green-800">{feedback.whatWasGood}</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="font-medium text-amber-700 mb-2 text-sm">↑ Could be improved</p>
              <p className="text-sm text-amber-800">{feedback.whatCouldBeImproved}</p>
            </div>
          </div>

          {feedback.modelAnswer && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="font-medium text-blue-700 mb-2 text-sm">💡 Model Answer Guidance</p>
              <p className="text-sm text-blue-800">{feedback.modelAnswer}</p>
            </div>
          )}

          {/* Previous question */}
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Your answer to:</p>
            <p className="text-sm font-medium text-slate-700 mb-2">{questionHistory[questionHistory.length - 1]?.question}</p>
            <p className="text-sm text-slate-600 italic">"{questionHistory[questionHistory.length - 1]?.answer}"</p>
          </div>

          <button onClick={handleNext} disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? <><Loader2 className="animate-spin" size={18} />Loading...</> : (
              isComplete
                ? <><CheckCircle size={18} />View Final Results</>
                : <><ArrowRight size={18} />Next Question</>
            )}
          </button>
        </>
      )}

      {/* Results */}
      {stage === STAGES.results && results && (
        <>
          <div className="card p-6 text-center">
            <p className="text-slate-500 mb-3">Interview Complete!</p>
            <ScoreRing score={results.results?.overallScore || 0} size={130} strokeWidth={11} />
            <p className="text-2xl font-bold text-slate-800 mt-3">Overall Score</p>
            <p className="text-slate-500 text-sm mt-1">
              {results.interview?.jobRole} · {results.interview?.difficulty} · {results.interview?.interviewType}
            </p>
          </div>

          {/* Category scores */}
          <Card title="Score Breakdown" badge={<AIBadge />}>
            <div className="space-y-3">
              {[
                { l: 'Technical Knowledge', v: results.results?.technicalKnowledge },
                { l: 'Communication', v: results.results?.communication },
                { l: 'Problem Solving', v: results.results?.problemSolving },
                { l: 'Answer Quality', v: results.results?.answerQuality },
                { l: 'Confidence', v: results.results?.confidence },
              ].map(x => <ProgressBar key={x.l} label={x.l} value={x.v || 0} />)}
            </div>
          </Card>

          {results.results?.summary && (
            <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 leading-relaxed">
              {results.results.summary}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {results.results?.areasToImprove?.length > 0 && (
              <Card title="Areas to Improve">
                <ul className="space-y-1.5">
                  {results.results.areasToImprove.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-amber-500">•</span>{a}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {results.results?.recommendedTopics?.length > 0 && (
              <Card title="Recommended Topics">
                <ul className="space-y-1.5">
                  {results.results.recommendedTopics.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-primary-500">→</span>{t}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Question review */}
          {questionHistory.length > 0 && (
            <Card title={`Question Review (${questionHistory.length} answered)`}>
              <div className="space-y-3">
                {questionHistory.map((q, i) => (
                  <div key={i} className="p-4 border border-slate-100 rounded-xl">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-medium text-slate-700 flex-1">{q.question}</p>
                      <span className={clsx('text-sm font-bold flex-shrink-0', getScoreColor(q.feedback?.score))}>
                        {q.feedback?.score}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 italic line-clamp-2">"{q.answer}"</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <button onClick={handleRestart} className="btn-secondary w-full justify-center">
            <RefreshCw size={16} /> Start New Interview
          </button>
        </>
      )}
    </div>
  );
}
