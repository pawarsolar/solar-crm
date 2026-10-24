import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { useAuth } from './context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LeadsPage = lazy(() => import('./pages/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const LeadDetailPage = lazy(() => import('./pages/LeadDetailPage').then((m) => ({ default: m.LeadDetailPage })));
const FollowupsPage = lazy(() => import('./pages/FollowupsPage').then((m) => ({ default: m.FollowupsPage })));
const QuotationsPage = lazy(() => import('./pages/QuotationsPage').then((m) => ({ default: m.QuotationsPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const ImportPage = lazy(() => import('./pages/ImportPage').then((m) => ({ default: m.ImportPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const ComponentsPage = lazy(() => import('./pages/ComponentsPage').then((m) => ({ default: m.ComponentsPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const LoadingFallback = () => (
  <div className="h-96 flex flex-col items-center justify-center text-slate-400">
    <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
    <span className="text-xs font-medium">Loading module...</span>
  </div>
);

const AccessDenied: React.FC<{ message?: string }> = ({ message }) => (
  <div className="h-96 flex flex-col items-center justify-center text-center px-4">
    <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-3">
      <ShieldAlert className="w-7 h-7 text-rose-500" />
    </div>
    <h2 className="text-lg font-bold text-slate-900">Access restricted</h2>
    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
      {message || 'Your role does not currently have access to this feature. Ask your Super Admin to grant it.'}
    </p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  if (!token && !user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/** Guards a route by feature entitlement and/or an allowed set of roles. */
const GuardedRoute: React.FC<{
  feature?: string;
  roles?: string[];
  children: React.ReactNode;
}> = ({ feature, roles, children }) => {
  const { user, hasFeature } = useAuth();

  if (roles && user && !roles.includes(user.role)) {
    return <AccessDenied message="Your role does not have access to this section." />;
  }
  if (feature && !hasFeature(feature)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected App Shell */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <GuardedRoute feature="kpi_dashboard">
                <DashboardPage />
              </GuardedRoute>
            }
          />
          <Route
            path="leads"
            element={
              <GuardedRoute feature="leads">
                <LeadsPage />
              </GuardedRoute>
            }
          />
          <Route
            path="leads/:id"
            element={
              <GuardedRoute feature="leads">
                <LeadDetailPage />
              </GuardedRoute>
            }
          />
          <Route
            path="followups"
            element={
              <GuardedRoute feature="leads">
                <FollowupsPage />
              </GuardedRoute>
            }
          />
          <Route
            path="quotations"
            element={
              <GuardedRoute feature="quotation">
                <QuotationsPage />
              </GuardedRoute>
            }
          />
          <Route
            path="payments"
            element={
              <GuardedRoute feature="payments">
                <PaymentsPage />
              </GuardedRoute>
            }
          />
          <Route
            path="import"
            element={
              <GuardedRoute feature="bulk_import">
                <ImportPage />
              </GuardedRoute>
            }
          />
          <Route
            path="components"
            element={
              <GuardedRoute>
                <ComponentsPage />
              </GuardedRoute>
            }
          />
          <Route path="users" element={<Navigate to="/admin" replace />} />
          <Route
            path="allocation"
            element={
              <GuardedRoute roles={['super_admin', 'sales_admin']}>
                <AdminPage initialTab="allocation" />
              </GuardedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <GuardedRoute roles={['super_admin']}>
                <AdminPage />
              </GuardedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};
