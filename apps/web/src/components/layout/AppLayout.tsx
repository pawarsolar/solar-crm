import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Plus, WifiOff, Sun, Zap, RefreshCw } from 'lucide-react';
import { LeadModal } from '../leads/LeadModal';
import { OfflineSyncModal } from '../leads/OfflineSyncModal';
import { SchemaHealthBanner } from './SchemaHealthBanner';
import {
  getPendingOfflineCount,
  subscribeToOfflineQueue,
  syncOfflineQueue,
} from '../../lib/offlineQueue';
import { apiRequest } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isOfflineSyncOpen, setIsOfflineSyncOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const queryClient = useQueryClient();

  const refreshOfflineCount = async () => {
    const count = await getPendingOfflineCount();
    setOfflineCount(count);
  };

  useEffect(() => {
    refreshOfflineCount();
    const unsubscribe = subscribeToOfflineQueue(() => {
      refreshOfflineCount();
    });

    const handleOnline = async () => {
      setIsOnline(true);
      // Auto-sync pending leads upon internet reconnection
      const count = await getPendingOfflineCount();
      if (count > 0) {
        setAutoSyncing(true);
        try {
          const res = await syncOfflineQueue((body) =>
            apiRequest('/leads', { method: 'POST', body }),
          );
          if (res.synced > 0) {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          }
        } finally {
          setAutoSyncing(false);
          refreshOfflineCount();
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshOfflineCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop & Drawer Sidebar */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <Sun className="w-6 h-6 text-amber-500 animate-[spin_12s_linear_infinite]" />
              <span className="font-bold text-slate-900 tracking-tight text-base">Kyros Solar</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {autoSyncing && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span className="hidden xs:inline">Auto-syncing leads...</span>
              </span>
            )}

            {offlineCount > 0 && !autoSyncing && (
              <button
                onClick={() => setIsOfflineSyncOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 hover:border-amber-400 transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Click to view and synchronize queued offline leads"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {offlineCount} Offline Lead{offlineCount !== 1 ? 's' : ''}
                </span>
                <span className="text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.2 rounded-md font-mono">
                  Sync
                </span>
              </button>
            )}

            {!isOnline && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Offline Mode</span>
              </span>
            )}
          </div>
        </header>

        {/* Global Schema Health Notification for Admins */}
        <SchemaHealthBanner />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Floating Action Button (+ Add Lead) */}
      <button
        onClick={() => setIsAddLeadOpen(true)}
        className="md:hidden fixed right-4 bottom-20 z-40 w-14 h-14 rounded-full bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        aria-label="Add Lead"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenMenu={() => setIsMobileMenuOpen(true)} />

      {/* Quick Add Lead Modal */}
      <LeadModal isOpen={isAddLeadOpen} onClose={() => setIsAddLeadOpen(false)} />

      {/* Offline Sync Queue Manager Modal */}
      <OfflineSyncModal
        isOpen={isOfflineSyncOpen}
        onClose={() => setIsOfflineSyncOpen(false)}
        isOnline={isOnline}
      />
    </div>
  );
};
