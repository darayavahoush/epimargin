import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  badge,
  badgeColor = 'indigo',
  icon
}) => {
  const badgeClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    slate: 'bg-slate-800 text-slate-300 border-slate-700'
  }[badgeColor];

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4.5 shadow-md hover:border-slate-700/80 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>

      <div className="flex items-baseline justify-between gap-2 my-1">
        <span className="text-2xl font-bold font-mono tracking-tight text-slate-100">{value}</span>
        {badge && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeClasses}`}>
            {badge}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  );
};
