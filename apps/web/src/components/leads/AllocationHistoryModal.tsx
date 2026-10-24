import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, History, User, Calendar, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { apiRequest } from '../../lib/api';

interface AllocationHistoryRecord {
  id: string;
  batch_id: string;
  timestamp: string;
  allocated_by: string;
  total_allocated: number;
  strategy: string;
  duration_ms: number;
  note?: string;
  breakdown: {
    user_id: string;
    full_name: string;
    role?: string;
    count: number;
  }[];
}

interface AllocationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllocationHistoryModal: React.FC<AllocationHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: history = [], isLoading, refetch } = useQuery<AllocationHistoryRecord[]>({
    queryKey: ['allocation-history'],
    queryFn: () => apiRequest('/leads/allocate/history'),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Bulk Allocation Audit Log</h2>
              <p className="text-xs text-slate-500">
                Track historical lead distribution batches, rules, and operators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500 mb-2" />
              <p className="text-xs">Loading allocation records...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No allocation batches recorded yet</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Execute a bulk lead allocation to see audit history and performance metrics here.
              </p>
            </div>
          ) : (
            history.map((record) => (
              <div
                key={record.id || record.batch_id}
                className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-amber-500/30 transition-all shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {record.batch_id}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full capitalize">
                      {record.strategy.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(record.timestamp).toLocaleString()}
                    </span>
                    {record.duration_ms > 0 && (
                      <span className="font-mono text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                        {record.duration_ms}ms
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Allocated by:</span>
                    <span className="font-semibold text-slate-900">{record.allocated_by}</span>
                  </div>
                  <div className="font-bold text-slate-900">
                    Total: <span className="text-amber-600">{record.total_allocated.toLocaleString()} leads</span>
                  </div>
                </div>

                {record.note && (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                    "{record.note}"
                  </p>
                )}

                {/* Per-user distribution breakdown chips */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Assigned Recipients:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {record.breakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                      >
                        <span className="font-semibold text-slate-800">{item.full_name}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-mono">
                          +{item.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {history.length} allocation {history.length === 1 ? 'batch' : 'batches'} recorded
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
