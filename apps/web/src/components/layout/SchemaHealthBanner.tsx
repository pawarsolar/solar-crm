import React, { useState, useEffect } from 'react';
import { Database, AlertTriangle, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface SchemaHealthData {
  healthy: boolean;
  syncRequired: boolean;
  missingTables: string[];
  cliCommand?: string;
  notes?: string;
}

export const SchemaHealthBanner: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<SchemaHealthData | null>(null);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('schema_health_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('schema_health_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'sales_admin';

  const fetchHealth = async () => {
    try {
      const data = await apiRequest<SchemaHealthData>('/health/schema');
      setHealth(data);
    } catch {
      // Ignore if endpoint unreachable
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchHealth();
    }
  }, [isAdmin]);

  const handleRecheck = async () => {
    setChecking(true);
    try {
      const updated = await apiRequest<SchemaHealthData>('/health/schema/sync-check', {
        method: 'POST',
      });
      setHealth(updated);
    } catch {
      await fetchHealth();
    } finally {
      setChecking(false);
    }
  };

  if (!isAdmin || dismissed || !health || !health.syncRequired) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 transition-all animate-in fade-in">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-white">Database Schema Sync Required: </span>
            <span className="text-amber-300">
              {health.notes || "PostgreSQL schema cache is missing tables. In-memory fallback layer is currently active."}
            </span>
            {health.cliCommand && (
              <span className="hidden md:inline ml-1 font-mono text-[11px] bg-slate-900/80 px-2 py-0.5 rounded border border-amber-500/20 text-amber-300">
                {health.cliCommand}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={handleRecheck}
            disabled={checking}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking...' : 'Re-check'}</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
