import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';

/**
 * Highlighted, always-visible control shown whenever a Super Admin is inside a
 * child (impersonated) session. It is the single most important affordance in
 * that mode: a prominent "Back to Super Admin" action.
 */
export const ImpersonationBanner: React.FC = () => {
  const { impersonator, user, switchBack } = useAuth();
  const [isReturning, setIsReturning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!impersonator) return null;

  const handleBack = async () => {
    setIsReturning(true);
    setError(null);
    try {
      await switchBack();
    } catch (err: any) {
      setError(err?.message || 'Unable to return to the Super Admin session');
      setIsReturning(false);
    }
  };

  return (
    <div className="sticky top-0 z-40 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">
            Child Login Active
          </span>
          <span className="hidden sm:inline text-xs sm:text-sm font-medium truncate">
            — you are viewing as {user?.full_name || user?.role} ({user?.role})
            {impersonator.full_name ? ` · signed in as ${impersonator.full_name}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <span className="text-[11px] font-medium text-rose-900 bg-rose-100 border border-rose-300 rounded-md px-2 py-0.5 max-w-[16rem] truncate">
              {error}
            </span>
          )}
          <button
            onClick={handleBack}
            disabled={isReturning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 text-amber-400 text-xs sm:text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-60 ring-2 ring-slate-950/20"
          >
            {isReturning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowLeft className="w-4 h-4" />
            )}
            <span>Back to Super Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
