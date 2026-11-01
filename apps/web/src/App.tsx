import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider, toast } from './context/ToastContext';
import { AppRoutes } from './routes';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      // Allow queries to opt out of toast with meta: { silent: true }
      if ((query.meta as any)?.silent) return;
      const message = error?.message || 'Failed to load data from server';
      toast.error(message, { title: 'Data Sync Error' });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any, _variables, _context, mutation) => {
      // Allow mutations to opt out of automatic toast with meta: { silent: true }
      if ((mutation.meta as any)?.silent) return;
      const message = error?.message || 'Operation failed. Please try again.';
      toast.error(message, { title: 'Operation Failed' });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};
