import clsx from 'clsx';

// Circular score ring using SVG
export function ScoreRing({ score = 0, size = 120, strokeWidth = 10, color, label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#3b82f6';
    if (s >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const ringColor = color || getColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="score-ring">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={ringColor} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-bold text-slate-800" style={{ fontSize: size * 0.2 }}>{score}</span>
        {label && <span className="text-slate-500" style={{ fontSize: size * 0.09 }}>{label}</span>}
      </div>
    </div>
  );
}

// Progress bar
export function ProgressBar({ value = 0, color, label, showPercent = true, height = 8 }) {
  const getColor = (v) => {
    if (v >= 80) return 'bg-green-500';
    if (v >= 60) return 'bg-blue-500';
    if (v >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div>
      {(label || showPercent) && (
        <div className="flex justify-between mb-1">
          {label && <span className="text-sm text-slate-600">{label}</span>}
          {showPercent && <span className="text-sm font-medium text-slate-700">{value}%</span>}
        </div>
      )}
      <div className="bg-slate-100 rounded-full overflow-hidden" style={{ height }}>
        <div
          className={clsx('h-full rounded-full transition-all duration-700 ease-out', color || getColor(value))}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

// Skill tag chip
export function SkillChip({ skill, variant = 'default', icon }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    strong: 'bg-green-50 text-green-700 border border-green-200',
    developing: 'bg-amber-50 text-amber-700 border border-amber-200',
    missing: 'bg-red-50 text-red-700 border border-red-200',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium', variants[variant])}>
      {icon && <span>{icon}</span>}
      {skill}
    </span>
  );
}

// Loading spinner
export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={clsx('border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin', sizes[size], className)} />
  );
}

// Empty state
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-4">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
      {description && <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">{description}</p>}
      {action}
    </div>
  );
}

// Section card
export function Card({ title, subtitle, children, className, badge, action }) {
  return (
    <div className={clsx('card p-6', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-5">
          <div>
            {title && <h2 className="text-lg font-semibold text-slate-800">{title}</h2>}
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {badge}
            {action}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// Stat card
export function StatCard({ icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors[color])}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// AI badge
export function AIBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
      AI
    </span>
  );
}
