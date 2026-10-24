import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Trash2,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  Users,
  UserPlus,
  Loader2,
  UserCheck,
  UserX,
  LogIn,
  KeyRound,
  Save,
  Edit2,
  Lock,
  Search,
  RotateCcw,
  ShieldCheck,
  Check,
  Globe,
  MapPin,
  Laptop,
  Smartphone,
  Clock,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { BulkAllocationTable } from '../components/leads/BulkAllocationTable';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  sales_admin: 'Sales Admin',
  telecaller: 'Telecaller',
  sales_exec: 'Sales Executive',
  surveyor: 'Field Surveyor',
  installer: 'Project Installer',
  accounts: 'Accounts & Finance',
};

const ASSIGNABLE_ROLES = [
  'sales_admin',
  'telecaller',
  'sales_exec',
  'surveyor',
  'installer',
  'accounts',
] as const;

type Matrix = Record<string, Record<string, boolean>>;

interface AdminPageProps {
  initialTab?: 'users' | 'allocation' | 'features' | 'deletions' | 'pricing' | 'security';
}

export const AdminPage: React.FC<AdminPageProps> = ({ initialTab }) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user, impersonate } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  
  const defaultTab = useMemo(() => {
    if (initialTab) return initialTab;
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab') as any;
    if (tabParam && ['users', 'allocation', 'features', 'deletions', 'pricing', 'security'].includes(tabParam)) {
      return tabParam;
    }
    if (location.pathname.includes('/allocation')) return 'allocation';
    if (location.pathname.includes('/users')) return isSuperAdmin ? 'users' : 'allocation';
    return isSuperAdmin ? 'users' : 'allocation';
  }, [initialTab, location.pathname, location.search, isSuperAdmin]);

  const [activeTab, setActiveTab] = useState<'users' | 'allocation' | 'features' | 'deletions' | 'pricing' | 'security'>(defaultTab);

  // Search filter for staff
  const [userSearch, setUserSearch] = useState('');

  // Add User modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<(typeof ASSIGNABLE_ROLES)[number]>('sales_exec');

  // Edit User modal state
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');

  // Reset Password modal state
  const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [resetResult, setResetResult] = useState<any | null>(null);

  // Feature matrix local (unsaved) edits, keyed `role|feature`
  const [pendingGrants, setPendingGrants] = useState<Record<string, boolean>>({});
  // Per-user override drawer
  const [overrideUserId, setOverrideUserId] = useState<string | null>(null);

  // 1. Users Query (Super Admin & Sales Admin)
  const { data: usersList, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => apiRequest('/users'),
  });

  // 2. Deletion requests Query
  const { data: deletionRequests, isLoading: deletionsLoading } = useQuery({
    queryKey: ['deletion_requests'],
    queryFn: () => apiRequest('/deletion-requests'),
  });

  // Master features list fallback so feature management is always fully available
  const ALL_FEATURES_LIST = [
    { key: 'leads', label: 'Pipeline Leads CRM', description: 'Access and view assigned leads' },
    { key: 'telecalling', label: 'Telecaller Call Logs', description: 'Log outbound calls & status' },
    { key: 'bulk_import', label: 'Bulk Lead Import', description: 'Upload CSV/XLSX leads datasets' },
    { key: 'export_excel', label: 'Export to Excel', description: 'Download pipeline data as XLSX' },
    { key: 'export_pdf', label: 'Export to PDF', description: 'Generate management reports' },
    { key: 'quotation', label: 'Quotation Engine', description: 'Generate solar proposals & sizing' },
    { key: 'payments', label: 'Payments & Collections', description: 'Milestone tracking & receipts' },
    { key: 'survey', label: 'Site Feasibility Surveys', description: 'Rooftop audit & shading check' },
    { key: 'installation', label: 'Project Installation', description: 'Site execution & commissioning' },
    { key: 'subsidy', label: 'PM Surya Ghar Subsidy', description: 'MNRE portal subsidy liaisoning' },
    { key: 'reports', label: 'Executive Analytics', description: 'Conversion & business metrics' },
    { key: 'report_share', label: 'Shareable Reports', description: 'Generate public read links' },
    { key: 'kpi_dashboard', label: 'KPI Dashboard', description: 'Org revenue & pipeline cards' },
    { key: 'service_tickets', label: 'After-sales Service', description: 'AMC & customer ticket tracking' },
    { key: 'whatsapp', label: 'WhatsApp Automation', description: 'Direct customer notifications' },
  ];

  // 3. Feature flags matrix Query (Always loaded so modal and matrix are immediately functional)
  const { data: featureMatrix, isLoading: featuresLoading } = useQuery({
    queryKey: ['features', 'matrix'],
    queryFn: () => apiRequest('/features/matrix'),
  });

  const availableFeatures = useMemo(() => {
    return featureMatrix?.features?.length ? featureMatrix.features : ALL_FEATURES_LIST;
  }, [featureMatrix]);

  const featureKeys: string[] = useMemo(
    () => availableFeatures.map((f: any) => f.key),
    [availableFeatures],
  );

  const matrix: Matrix = useMemo(() => featureMatrix?.matrix || {}, [featureMatrix]);

  const grantsByUser = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    for (const g of featureMatrix?.grants || []) {
      if (g.scope !== 'user') continue;
      map[g.scope_value] = map[g.scope_value] || {};
      map[g.scope_value][g.feature_key] = g.enabled;
    }
    return map;
  }, [featureMatrix]);

  const grantValue = (role: string, featureKey: string): boolean => {
    const key = `${role}|${featureKey}`;
    if (key in pendingGrants) return pendingGrants[key];
    if (role === 'super_admin') return true;
    if (matrix[role] && matrix[role][featureKey] !== undefined) {
      return matrix[role][featureKey];
    }
    // Safe fallback based on standard spec
    if (role === 'sales_admin') return true;
    if (role === 'telecaller') return ['leads', 'telecalling', 'kpi_dashboard', 'whatsapp'].includes(featureKey);
    if (role === 'sales_exec') return ['leads', 'quotation', 'survey', 'kpi_dashboard', 'whatsapp'].includes(featureKey);
    if (role === 'surveyor') return ['leads', 'survey', 'kpi_dashboard'].includes(featureKey);
    if (role === 'installer') return ['leads', 'installation', 'kpi_dashboard', 'service_tickets'].includes(featureKey);
    if (role === 'accounts') return ['export_excel', 'export_pdf', 'payments', 'subsidy', 'reports', 'kpi_dashboard', 'whatsapp'].includes(featureKey);
    return false;
  };

  const {
    data: adminActivity = [],
    isLoading: isLoadingAdminActivity,
    refetch: refetchAdminActivity,
  } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () => apiRequest('/auth/admin/activity'),
    enabled: isSuperAdmin && activeTab === 'security',
  });

  // Filtered users list
  const filteredUsers = useMemo(() => {
    if (!usersList) return [];
    let list = usersList;
    if (!isSuperAdmin) {
      list = list.filter((u: any) => u.role !== 'super_admin');
    }
    if (!userSearch.trim()) return list;
    const q = userSearch.toLowerCase();
    return list.filter(
      (u: any) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.phone?.includes(q),
    );
  }, [usersList, userSearch, isSuperAdmin]);

  // ---- Mutations ----
  const createUserMutation = useMutation({
    mutationFn: () =>
      apiRequest('/users', {
        method: 'POST',
        body: {
          full_name: newUserName,
          email: newUserEmail,
          phone: newUserPhone,
          role: newUserRole,
        },
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      alert(
        data?.invite_sent
          ? 'Staff account provisioned. An invite has been generated for them to set a password.'
          : 'Staff account provisioned.',
      );
    },
    onError: (err: any) => alert(err.message),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, full_name, phone, role }: { id: string; full_name: string; phone: string; role: string }) =>
      apiRequest(`/users/${id}`, {
        method: 'PATCH',
        body: { full_name, phone, role },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      setEditUser(null);
      alert('User details and role updated successfully!');
    },
    onError: (err: any) => alert(err.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiRequest(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      alert('Role assignment updated successfully!');
    },
    onError: (err: any) => alert(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiRequest(`/users/${id}/status`, { method: 'PATCH', body: { is_active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'list'] }),
    onError: (err: any) => alert(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password?: string }) =>
      apiRequest(`/users/${id}/reset-password`, {
        method: 'POST',
        body: { password },
      }),
    onSuccess: (data: any) => {
      setResetResult(data);
    },
    onError: (err: any) => alert(err.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      alert('Staff access revoked (account deactivated, records retained).');
    },
    onError: (err: any) => alert(err.message),
  });

  const impersonateMutation = useMutation({
    mutationFn: (id: string) => impersonate(id),
    onError: (err: any) => alert(err.message || 'Unable to start a child login session'),
  });

  const decideDeletionMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      apiRequest(`/deletion-requests/${id}/decide`, { method: 'POST', body: { approved } }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['deletion_requests'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      alert(data.message);
    },
    onError: (err: any) => alert(err.message),
  });

  const saveMatrixMutation = useMutation({
    mutationFn: () => {
      const changes = Object.entries(pendingGrants).map(([key, enabled]) => {
        const [role, feature_key] = key.split('|');
        return { scope: 'role' as const, scope_value: role, feature_key, enabled };
      });
      return apiRequest('/features/grants/bulk', { method: 'POST', body: { changes } });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['features', 'matrix'] });
      setPendingGrants({});
      alert(`${data.updated} permission change(s) saved.`);
    },
    onError: (err: any) => alert(err.message),
  });

  const updateGrantMutation = useMutation({
    mutationFn: (body: {
      scope: 'org' | 'role' | 'user';
      scope_value: string;
      feature_key: string;
      enabled: boolean;
    }) => apiRequest('/features/grants', { method: 'PUT', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['features', 'matrix'] }),
    onError: (err: any) => alert(err.message),
  });

  // Bulk presets for Feature Matrix
  const handleBulkPreset = (role: string, enableAll: boolean) => {
    const newPending = { ...pendingGrants };
    for (const key of featureKeys) {
      newPending[`${role}|${key}`] = enableAll;
    }
    setPendingGrants(newPending);
  };

  const handleResetDefaults = () => {
    setPendingGrants({});
    queryClient.invalidateQueries({ queryKey: ['features', 'matrix'] });
  };

  const pendingCount = Object.keys(pendingGrants).length;
  const roles = ['super_admin', ...ASSIGNABLE_ROLES];
  const overrideUser = (usersList || []).find((u: any) => u.id === overrideUserId);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <span>
              {isSuperAdmin
                ? 'Super Admin Governance & User Management'
                : 'Sales Operations & Lead Management'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isSuperAdmin
              ? 'Provision users, reassign roles, configure granular feature access & audit activity'
              : 'Manage lead distribution, team allocation rules, and pipeline deletion approvals'}
          </p>
        </div>

        {activeTab === 'users' && isSuperAdmin && (
          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 hover:bg-amber-400 shadow-md shadow-amber-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision New Staff</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold overflow-x-auto">
        {(isSuperAdmin
          ? [
              { key: 'users', label: `Staff & Role Operations (${usersList?.length || 0})`, icon: Users },
              { key: 'allocation', label: 'Bulk Lead Allocation', icon: Users },
              { key: 'features', label: `Role Feature Access Matrix (${pendingCount > 0 ? `${pendingCount} unsaved` : 'Active'})`, icon: ShieldCheck },
              { key: 'deletions', label: `Deletion Approvals (${deletionRequests?.length || 0})`, icon: Trash2 },
              { key: 'security', label: 'Login & Device Audit', icon: ShieldAlert },
              { key: 'pricing', label: 'Master Price Book', icon: BookOpen },
            ]
          : [
              { key: 'allocation', label: 'Bulk Lead Allocation', icon: Users },
              { key: 'deletions', label: `Deletion Approvals (${deletionRequests?.length || 0})`, icon: Trash2 },
              { key: 'users', label: `Sales Team Directory (${filteredUsers?.length || 0})`, icon: Users },
            ]
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: BULK LEAD ALLOCATION */}
      {activeTab === 'allocation' && (
        <div className="space-y-4">
          <BulkAllocationTable />
        </div>
      )}

      {/* TAB 1: USERS & ROLE MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isSuperAdmin ? 'Staff Directory & Role Operations' : 'Sales & Field Team Directory'}
              </h3>
              <p className="text-xs text-slate-500">
                {isSuperAdmin
                  ? 'Perform operations: Edit details, reassign roles, reset passwords, activate/disable, or child-login'
                  : 'View sales representatives, telecallers, and field surveyors for lead distribution'}
              </p>
            </div>

            {/* Search filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff, email, role..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {usersLoading ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No staff members match your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-3 font-semibold">Staff Member</th>
                    <th className="py-3 px-3 font-semibold">Contact</th>
                    <th className="py-3 px-3 font-semibold">Assigned Role</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    {isSuperAdmin && (
                      <th className="py-3 px-3 font-semibold text-right">Super Admin Operations</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 text-sm">{u.full_name}</p>
                        <p className="text-[11px] text-slate-400">{u.team?.name || 'General Operations'}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <p>{u.email}</p>
                        <p className="text-[11px] text-slate-400">{u.phone || '-'}</p>
                      </td>
                      <td className="py-3 px-3">
                        {isSuperAdmin && u.id !== user?.id ? (
                          <select
                            value={u.role}
                            onChange={(e) => updateRoleMutation.mutate({ id: u.id, role: e.target.value })}
                            className="text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {u.is_active !== false ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3 px-3 text-right">
                          {u.id !== user?.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit details */}
                              <button
                                onClick={() => {
                                  setEditUser(u);
                                  setEditName(u.full_name);
                                  setEditPhone(u.phone || '');
                                  setEditRole(u.role);
                                }}
                                title="Edit user profile & role"
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={() => {
                                  setResetPasswordUser(u);
                                  setCustomPassword('');
                                  setResetResult(null);
                                }}
                                title="Reset staff password"
                                className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>

                              {/* Super Admin Provide / Revoke Feature Access Authority */}
                              <button
                                onClick={() => setOverrideUserId(u.id)}
                                title="Grant / Revoke Feature Access Authority"
                                className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors text-xs font-bold flex items-center gap-1.5 shadow-sm"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                <span>Access Authority</span>
                              </button>

                              {/* Toggle active / disabled */}
                              <button
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: u.id,
                                    is_active: u.is_active === false,
                                  })
                                }
                                title={u.is_active === false ? 'Activate User' : 'Deactivate User'}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  u.is_active === false
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600'
                                }`}
                              >
                                {u.is_active === false ? (
                                  <UserCheck className="w-3.5 h-3.5" />
                                ) : (
                                  <UserX className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Delete / revoke account */}
                              <button
                                onClick={() => {
                                  if (confirm(`Revoke all access for ${u.full_name}? Records are preserved.`)) {
                                    deleteUserMutation.mutate(u.id);
                                  }
                                }}
                                title="Revoke access"
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              Current Super Admin
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ROLE FEATURE ACCESS CONTROL MATRIX */}
      {activeTab === 'features' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Granular Role Feature Access Control</h3>
              <p className="text-xs text-slate-500">
                Super Admin handles what level of access needs to be provided or not to each role
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset View</span>
              </button>

              {isSuperAdmin && pendingCount > 0 && (
                <button
                  onClick={() => saveMatrixMutation.mutate()}
                  disabled={saveMatrixMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 disabled:opacity-60"
                >
                  {saveMatrixMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save {pendingCount} Permission Changes</span>
                </button>
              )}
            </div>
          </div>

          {!isSuperAdmin ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Only the Super Admin can configure role permissions.
            </div>
          ) : featuresLoading ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 font-bold sticky left-0 bg-slate-50 min-w-[200px]">Feature Module</th>
                    {roles.map((r) => (
                      <th key={r} className="py-3 px-3 font-bold text-center whitespace-nowrap min-w-[110px]">
                        <div>{ROLE_LABELS[r] || r}</div>
                        {r !== 'super_admin' && (
                          <div className="flex items-center justify-center gap-1.5 mt-1 font-normal text-[10px]">
                            <button
                              onClick={() => handleBulkPreset(r, true)}
                              className="text-emerald-600 hover:underline"
                            >
                              All On
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => handleBulkPreset(r, false)}
                              className="text-rose-600 hover:underline"
                            >
                              All Off
                            </button>
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(featureMatrix?.features || []).map((feat: any) => (
                    <tr key={feat.key} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 sticky left-0 bg-white">
                        <p className="font-bold text-slate-900">{feat.label}</p>
                        <p className="text-[10px] text-slate-400">{feat.description || feat.key}</p>
                      </td>
                      {roles.map((r) => {
                        const isSuper = r === 'super_admin';
                        const isEnabled = isSuper || grantValue(r, feat.key);
                        const isDirty = `${r}|${feat.key}` in pendingGrants;

                        return (
                          <td key={r} className="py-3 px-3 text-center">
                            <button
                              type="button"
                              disabled={isSuper}
                              onClick={() =>
                                setPendingGrants((prev) => ({
                                  ...prev,
                                  [`${r}|${feat.key}`]: !isEnabled,
                                }))
                              }
                              title={isSuper ? 'Super Admin always retains all access' : 'Click to toggle access'}
                              className={`p-1.5 rounded-xl transition-all ${
                                isEnabled
                                  ? 'text-amber-500 bg-amber-50/50 hover:bg-amber-100/60'
                                  : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                              } ${isSuper ? 'opacity-70 cursor-not-allowed' : ''} ${
                                isDirty ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                              }`}
                            >
                              {isEnabled ? (
                                <ToggleRight className="w-6 h-6" />
                              ) : (
                                <ToggleLeft className="w-6 h-6" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 mt-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  💡 <strong>How resolution works:</strong> User Override → Role Default → Baseline (Closed).
                  Clicking toggles marks changes in green. Click <strong>Save Changes</strong> above to apply.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DELETIONS QUEUE */}
      {activeTab === 'deletions' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Pending Deletion Approvals</h3>
              <p className="text-xs text-slate-500">
                Staff deletion requests require explicit approval before moving to soft-deleted storage
              </p>
            </div>
          </div>

          {deletionsLoading ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : !deletionRequests || deletionRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No pending deletion requests.</div>
          ) : (
            <div className="space-y-3">
              {deletionRequests.map((req: any) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">Lead ID: {req.lead_id}</span>
                    <p className="text-slate-600 mt-0.5">Reason: "{req.reason}"</p>
                    <p className="text-[11px] text-slate-400">Requested by: {req.requested_by}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => decideDeletionMutation.mutate({ id: req.id, approved: false })}
                      disabled={decideDeletionMutation.isPending}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => decideDeletionMutation.mutate({ id: req.id, approved: true })}
                      disabled={decideDeletionMutation.isPending}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-500 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve Soft-Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PRICING BOOK */}
      {activeTab === 'pricing' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Benchmark Solar Pricing Tiers (₹/kW)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { kw: '1.0 kW', price: '₹65,000' },
              { kw: '2.0 kW', price: '₹1,25,000' },
              { kw: '3.0 kW', price: '₹1,80,000' },
              { kw: '4.0 kW', price: '₹2,30,000' },
              { kw: '5.0 kW', price: '₹2,80,000' },
              { kw: '6.0 kW', price: '₹3,30,000' },
              { kw: '8.0 kW', price: '₹4,30,000' },
              { kw: '10.0 kW', price: '₹5,20,000' },
            ].map((p) => (
              <div key={p.kw} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-500">{p.kw} On-Grid Tier</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{p.price}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: LOGIN ACTIVITY, IP & THREE-DEVICE AUDIT */}
      {activeTab === 'security' && isSuperAdmin && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                <Laptop className="w-4 h-4" />
                <span>Device Concurrency Policy</span>
              </div>
              <p className="text-xl font-black text-slate-900">3 Devices Max</p>
              <p className="text-xs text-slate-500">
                Active limit strictly enforced. 4th device auto-revokes oldest session.
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                <Globe className="w-4 h-4" />
                <span>IP & Geolocation Trace</span>
              </div>
              <p className="text-xl font-black text-slate-900">Real-time Tracing</p>
              <p className="text-xs text-slate-500">
                Identifies IP address, ISP headers, city, and client browser specs.
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Audited Login Events</span>
              </div>
              <p className="text-xl font-black text-slate-900">{adminActivity.length} Records</p>
              <p className="text-xs text-slate-500">
                Complete security audit trail maintained across all employee accounts.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Organization Login Activity & Device Audit</h3>
                <p className="text-xs text-slate-500">Audit trail of employee IP addresses, resolved locations, and device types</p>
              </div>
              <button
                onClick={() => refetchAdminActivity()}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Refresh Log</span>
              </button>
            </div>

            {isLoadingAdminActivity ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-amber-500 mb-2" />
                <p className="text-xs">Fetching audit records...</p>
              </div>
            ) : adminActivity.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                No login activities recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5 pl-5">Timestamp</th>
                      <th className="p-3.5">User Email</th>
                      <th className="p-3.5">Device & Browser</th>
                      <th className="p-3.5">IP Address</th>
                      <th className="p-3.5">Location</th>
                      <th className="p-3.5 pr-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {adminActivity.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 pl-5 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleDateString()}{' '}
                          <span className="text-[11px] text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{log.email}</td>
                        <td className="p-3.5 text-slate-700">
                          <div className="font-semibold">{log.device_name}</div>
                          <div className="text-[11px] text-slate-400">{log.os} • {log.browser}</div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600">{log.ip_address}</td>
                        <td className="p-3.5 text-slate-700">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{log.location}</span>
                          </div>
                        </td>
                        <td className="p-3.5 pr-5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : log.status === 'REVOKED'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD STAFF MEMBER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">Provision New Staff Member</h3>
            <p className="text-xs text-slate-500">
              Creates login identity and assigns operational role & feature access
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email *</label>
                <input
                  type="email"
                  placeholder="rahul@kyrossolar.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98200 12345"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign System Role *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createUserMutation.mutate()}
                disabled={!newUserName || !newUserEmail || createUserMutation.isPending}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-60"
              >
                {createUserMutation.isPending ? 'Provisioning...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER DETAILS */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">Edit Staff Details & Role</h3>
            <p className="text-xs text-slate-500">
              Modifying account for <span className="font-semibold text-slate-800">{editUser.email}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">System Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditUser(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  updateUserMutation.mutate({
                    id: editUser.id,
                    full_name: editName,
                    phone: editPhone,
                    role: editRole,
                  })
                }
                disabled={updateUserMutation.isPending}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-60"
              >
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET STAFF PASSWORD */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">Reset Staff Password</h3>
            <p className="text-xs text-slate-500">
              Set new password for <span className="font-semibold text-slate-800">{resetPasswordUser.full_name}</span> ({resetPasswordUser.email})
            </p>

            {resetResult ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                <p className="font-bold text-emerald-800">{resetResult.message}</p>
                <div className="p-2 bg-white rounded-lg border border-emerald-200 font-mono text-emerald-950 select-all font-bold">
                  {resetResult.temporary_password}
                </div>
                <p className="text-[11px] text-slate-500">Provide this temporary password to the staff member.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password (leave blank to auto-generate)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generate or enter custom password"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setResetPasswordUser(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                {resetResult ? 'Close' : 'Cancel'}
              </button>
              {!resetResult && (
                <button
                  onClick={() =>
                    resetPasswordMutation.mutate({
                      id: resetPasswordUser.id,
                      password: customPassword || undefined,
                    })
                  }
                  disabled={resetPasswordMutation.isPending}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-60"
                >
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Confirm Reset'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PER-USER FEATURE ACCESS AUTHORITY MODAL */}
      {overrideUserId && overrideUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <h3 className="font-black text-base text-slate-900">
                    Feature Access Authority · {overrideUser.full_name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Assigned Role: <span className="font-bold text-slate-800">{ROLE_LABELS[overrideUser.role] || overrideUser.role}</span>.
                  Super Admin Authority: Toggle any module below to immediately grant or revoke user access.
                </p>
              </div>
              <button
                onClick={() => setOverrideUserId(null)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {availableFeatures.map((feat: any) => {
                const key = feat.key;
                const label = feat.label || key;
                const description = feat.description || '';
                const roleDefault = grantValue(overrideUser.role, key);
                const override = grantsByUser[overrideUser.id]?.[key];
                const effective = override === undefined ? roleDefault : override;

                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() =>
                      updateGrantMutation.mutate({
                        scope: 'user',
                        scope_value: overrideUser.id,
                        feature_key: key,
                        enabled: !effective,
                      })
                    }
                    className={`flex items-center justify-between gap-3 p-3 rounded-2xl border text-left transition-all ${
                      effective
                        ? 'border-amber-300 bg-amber-50/70 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-slate-900">{label}</p>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            effective
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {effective ? 'Granted' : 'Revoked'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{description}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {override === undefined
                          ? `Role default: ${roleDefault ? 'Enabled' : 'Disabled'}`
                          : `Super Admin Override: ${override ? 'Active' : 'Revoked'}`}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {effective ? (
                        <ToggleRight className="w-7 h-7 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 italic">
                * Changes take effect immediately across all active sessions.
              </span>
              <button
                onClick={() => setOverrideUserId(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
