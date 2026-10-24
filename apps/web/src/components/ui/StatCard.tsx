import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'amber',
  trend,
}) => {
  const colorMap = {
    amber: 'bg-amber-500/10 text-amber-600 border-amber-200/50',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-200/50',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-200/50',
    rose: 'bg-rose-500/10 text-rose-600 border-rose-200/50',
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex items-start justify-between transition-all hover:shadow-md">
      <div>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h4 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{value}</h4>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        {trend && (
          <span className="inline-flex items-center text-xs font-medium text-emerald-600 mt-2">
            {trend}
          </span>
        )}
      </div>
      <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
    </div>
  );
};
