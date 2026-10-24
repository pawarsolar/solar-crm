import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Sun,
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileSpreadsheet,
  CreditCard,
  UploadCloud,
  ShieldAlert,
  LogOut,
  LogIn,
  ArrowLeft,
  Loader2,
  Package,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FeatureGate } from '../ui/FeatureGate';
import { EditProfileModal } from '../profile/EditProfileModal';

export const Sidebar: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({
  isOpen = false,
  onClose,
}) => {
  const { user, logout, impersonator, switchBack } = useAuth();
  const [isReturning, setIsReturning] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleBack = async () => {
    setIsReturning(true);
    try {
      await switchBack();
      onClose?.();
    } catch {
      setIsReturning(false);
    }
  };

  const links = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, feature: 'kpi_dashboard' },
    { label: 'Pipeline Leads', path: '/leads', icon: Users, feature: 'leads' },
    { label: 'Follow-ups', path: '/followups', icon: CalendarCheck, feature: 'leads' },
    { label: 'Quotations', path: '/quotations', icon: FileSpreadsheet, feature: 'quotation' },
    { label: 'Payments', path: '/payments', icon: CreditCard, feature: 'payments' },
    { label: 'Components', path: '/components', icon: Package },
    { label: 'Bulk Import', path: '/import', icon: UploadCloud, feature: 'bulk_import' },
    ...(user?.role === 'super_admin'
      ? [{ label: 'Admin Governance', path: '/admin', icon: ShieldAlert, roles: ['super_admin'] }]
      : user?.role === 'sales_admin'
      ? [{ label: 'Lead Allocation & Ops', path: '/allocation', icon: Package, roles: ['sales_admin'] }]
      : []),
  ];

  const roleColors: Record<string, string> = {
    super_admin: 'bg-rose-100 text-rose-800 border-rose-200',
    sales_admin: 'bg-purple-100 text-purple-800 border-purple-200',
    telecaller: 'bg-blue-100 text-blue-800 border-blue-200',
    sales_exec: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    surveyor: 'bg-amber-100 text-amber-800 border-amber-200',
    installer: 'bg-teal-100 text-teal-800 border-teal-200',
    accounts: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-white z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sun className="w-6 h-6 animate-[spin_12s_linear_infinite]" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white">Kyros Solar</h1>
              <p className="text-xs text-amber-400 font-medium tracking-wide uppercase">EPC Pipeline CRM</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((link) => {
            if (link.roles && user && !link.roles.includes(user.role)) return null;

            const content = (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <link.icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );

            return link.feature ? (
              <FeatureGate key={link.path} feature={link.feature}>
                {content}
              </FeatureGate>
            ) : (
              content
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div
              onClick={() => setIsProfileModalOpen(true)}
              className="truncate mr-2 cursor-pointer group flex-1"
              title="Click to edit profile"
            >
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors truncate">
                  {user?.full_name || 'Staff User'}
                </p>
                <UserCog className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0 transition-colors" />
              </div>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsProfileModalOpen(true)}
                title="Edit My Profile"
                className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
              >
                <UserCog className="w-4 h-4" />
              </button>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Profile Edit Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
