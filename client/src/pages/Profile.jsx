import { useState, useEffect } from 'react';
import { profileAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui';
import { User, Loader2, Save, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CAREER_ROLES = [
  'Java Backend Developer', 'Full Stack Developer', 'Frontend Developer',
  'Python Developer', 'Data Scientist', 'AI/ML Engineer',
  'DevOps Engineer', '.NET Developer', 'Cloud Engineer', 'Software Engineer',
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: '', targetRole: '', githubUsername: '', university: '', graduationYear: '', bio: '',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await profileAPI.get();
        setForm({
          name: data.name || '',
          targetRole: data.targetRole || '',
          githubUsername: data.githubUsername || '',
          university: data.university || '',
          graduationYear: data.graduationYear || '',
          bio: data.bio || '',
        });
      } catch (err) {
        // Use local user data as fallback
        if (user) {
          setForm({ name: user.name || '', targetRole: user.targetRole || '', githubUsername: '', university: '', graduationYear: '', bio: '' });
        }
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const updates = { ...form };
      if (updates.graduationYear) updates.graduationYear = parseInt(updates.graduationYear);
      const { data } = await profileAPI.update(updates);
      updateUser({ name: form.name, targetRole: form.targetRole });
      setSaved(true);
      toast.success('Profile updated!');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{form.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{form.name || 'Student'}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            {form.targetRole && <span className="badge badge-blue mt-1">{form.targetRole}</span>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
          </div>
          <div>
            <label className="label">Target Career Role</label>
            <select className="input" value={form.targetRole} onChange={e => setForm({ ...form, targetRole: e.target.value })}>
              <option value="">Select target role...</option>
              {CAREER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">GitHub Username</label>
            <input className="input" value={form.githubUsername} onChange={e => setForm({ ...form, githubUsername: e.target.value })} placeholder="e.g. johnsmith" />
          </div>
          <div>
            <label className="label">University / College</label>
            <input className="input" value={form.university} onChange={e => setForm({ ...form, university: e.target.value })} placeholder="Your institution" />
          </div>
          <div>
            <label className="label">Expected Graduation Year</label>
            <select className="input" value={form.graduationYear} onChange={e => setForm({ ...form, graduationYear: e.target.value })}>
              <option value="">Select year...</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <label className="label">Bio</label>
          <textarea
            className="input min-h-[100px] resize-y"
            value={form.bio}
            onChange={e => setForm({ ...form, bio: e.target.value })}
            placeholder="Tell us a bit about yourself and your career goals..."
            maxLength={500}
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{form.bio.length}/500</p>
        </div>

        <button onClick={handleSave} disabled={loading} className="btn-primary mt-5">
          {loading ? <><Loader2 className="animate-spin" size={16} />Saving...</> :
           saved ? <><CheckCircle size={16} />Saved!</> :
           <><Save size={16} />Save Profile</>}
        </button>
      </div>

      <Card title="Account Information" subtitle="Email cannot be changed">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-slate-700">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-slate-500">Account type</span>
            <span className="font-medium text-slate-700">Student</span>
          </div>
        </div>
      </Card>

      <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-400 text-center">
        AI Career Copilot provides AI-generated guidance only. Recommendations do not guarantee employment outcomes.
      </div>
    </div>
  );
}
