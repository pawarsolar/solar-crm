import React, { useState, useEffect } from 'react';
import { X, Wifi, WifiOff, RefreshCw, Trash2, CheckCircle2, AlertCircle, Zap, Clock } from 'lucide-react';
import {
  getOfflineQueue,
  removeOfflineLead,
  syncOfflineQueue,
  OfflineLeadItem,
} from '../../lib/offlineQueue';
import { apiRequest } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({ isOpen, onClose, isOnline }) => {
  const [queue, setQueue] = useState<OfflineLeadItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);
  const queryClient = useQueryClient();

  const loadQueue = async () => {
    const items = await getOfflineQueue();
    setQueue(items);
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    if (!isOnline) return;
    setSyncing(true);
    setSyncResult(null);

    try {
      const result = await syncOfflineQueue(async (body) => {
        return apiRequest('/leads', {
          method: 'POST',
          body,
        });
      });

      setSyncResult(result);
      await loadQueue();
      if (result.synced > 0) {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    await removeOfflineLead(id);
    await loadQueue();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Offline Lead Sync Queue</h3>
              <p className="text-xs text-slate-400">
                {isOnline ? 'Online • Ready to synchronize with server' : 'Offline • Leads saved safely to browser storage'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {syncResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              syncResult.failed > 0
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                {syncResult.failed > 0 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>
                  Synchronized {syncResult.synced} lead{syncResult.synced !== 1 ? 's' : ''} successfully.
                  {syncResult.failed > 0 && ` (${syncResult.failed} failed due to validation)`}
                </span>
              </div>
            </div>
          )}

          {queue.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-sm font-medium text-white mb-1">Queue is empty</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                All captured leads are up to date and synchronized with the CRM database.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>{queue.length} Pending Lead{queue.length !== 1 ? 's' : ''} in IndexedDB</span>
                <span>Auto-sync active</span>
              </div>

              {queue.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <h4 className="text-xs font-semibold text-white">{item.payload.name}</h4>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {item.payload.phone} • {item.payload.city}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.payload.system_kw && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" />
                          {item.payload.system_kw} kW
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      Queued: {new Date(item.queuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span
                      className={`font-medium ${
                        item.status === 'failed'
                          ? 'text-rose-400'
                          : item.status === 'syncing'
                          ? 'text-amber-400 animate-pulse'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.status === 'failed'
                        ? item.error || 'Failed'
                        : item.status === 'syncing'
                        ? 'Syncing to CRM...'
                        : 'Pending Sync'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          <span className="text-xs text-slate-500">
            {isOnline ? 'Connected to Network' : 'No Internet Connection'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSyncNow}
              disabled={queue.length === 0 || !isOnline || syncing}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
