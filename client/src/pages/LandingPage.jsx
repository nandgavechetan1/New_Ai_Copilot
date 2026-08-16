import { Link } from 'react-router-dom';
import { Brain, ArrowRight, FileText, Github, Briefcase, Target, Map, MessageSquare, CheckCircle, Zap, Shield, Star } from 'lucide-react';

const steps = [
  { num: '01', title: 'Upload Resume', desc: 'Upload your PDF resume and let AI extract all your skills, projects, and experience.', icon: '📄' },
  { num: '02', title: 'Analyze Skills', desc: 'AI identifies your technical skills, soft skills, and areas for improvement.', icon: '🔍' },
  { num: '03', title: 'Discover Career', desc: 'Get personalized career path recommendations based on your unique profile.', icon: '🧭' },
  { num: '04', title: 'Identify Skill Gaps', desc: 'See exactly which skills you need to land your target job.', icon: '📊' },
  { num: '05', title: 'Follow Roadmap', desc: 'Get a step-by-step learning roadmap tailored to your goals.', icon: '🗺️' },
  { num: '06', title: 'Practice Interviews', desc: 'Practice with an AI interviewer and get real-time feedback.', icon: '🎤' },
];

const features = [
  { icon: FileText, title: 'AI Resume Analysis', desc: 'Extract skills, projects, and experience automatically from your PDF resume.', color: 'text-blue-600 bg-blue-50' },
  { icon: Github, title: 'GitHub Analysis', desc: 'Analyze your GitHub repositories and get insights about your coding activity.', color: 'text-slate-700 bg-slate-100' },
  { icon: Briefcase, title: 'Career Recommendations', desc: 'Discover the best career paths matched to your skills and experience.', color: 'text-purple-600 bg-purple-50' },
  { icon: Target, title: 'Skill Gap Detection', desc: 'Know exactly which skills you need for your dream job.', color: 'text-orange-600 bg-orange-50' },
  { icon: Map, title: 'Learning Roadmap', desc: 'Get a personalized step-by-step learning plan with resources and projects.', color: 'text-green-600 bg-green-50' },
  { icon: MessageSquare, title: 'AI Mock Interviews', desc: 'Practice interviews with AI, get scored answers and improvement tips.', color: 'text-red-600 bg-red-50' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-lg">AI Career Copilot</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Log in</Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-4">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-xs font-medium mb-8">
          <Zap size={12} />
          AI-Powered Career Intelligence Platform
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
          Your AI-Powered<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-500">Career Copilot</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Understand your skills. Discover your career path. Build the skills you need. Prepare for your dream job.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/register" className="btn-primary text-base px-7 py-3">
            Analyze My Resume <ArrowRight size={18} />
          </Link>
          <Link to="/register" className="btn-secondary text-base px-7 py-3">
            Explore Career Paths
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16 pt-10 border-t border-slate-100">
          {[['12+', 'Career Paths'], ['50+', 'Skills Analyzed'], ['AI', 'Mock Interviews']].map(([v, l]) => (
            <div key={l} className="text-center">
              <div className="text-2xl font-bold text-slate-800">{v}</div>
              <div className="text-xs text-slate-500 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-800 mb-3">How It Works</h2>
            <p className="text-slate-500 text-lg">From resume to job-ready in 6 simple steps</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.num} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{step.icon}</span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{step.num}</span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-800 mb-3">Everything You Need</h2>
            <p className="text-slate-500 text-lg">A complete AI career intelligence platform</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <div key={feat.title} className="p-6 rounded-2xl border border-slate-100 hover:border-primary-200 hover:shadow-md transition-all duration-200">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${feat.color}`}>
                  <feat.icon size={22} />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{feat.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-primary-600 to-accent-600 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Your Career Journey?</h2>
          <p className="text-primary-100 text-lg mb-8">Join thousands of students who have already discovered their career path.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
            Get Started Free <ArrowRight size={18} />
          </Link>
          <p className="text-primary-200 text-sm mt-4">No credit card required · AI-powered guidance · Personalized for you</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-primary-500" />
            <span>AI Career Copilot</span>
          </div>
          <p>AI-generated guidance only. Scores do not guarantee employment.</p>
        </div>
      </footer>
    </div>
  );
}
