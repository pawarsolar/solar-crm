import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import {
  User,
  Phone,
  Mail,
  Shield,
  Lock,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  KeyRound,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  MapPin,
  Clock,
  ShieldAlert,
  LogOut,
  History,
  Check,
} from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActiveSession {
  id: string;
  user_id: string;
  user_email: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  is_active: boolean;
  created_at: string;
  last_active_at: string;
  is_current?: boolean;
}

interface ActivityLog {
  id: string;
  email: string;
  ip_address: string;
  location: string;
  device_name: string;
  browser: string;
  os: string;
  status: 'SUCCESS' | 'FAILED' | 'REVOKED';
  reason?: string;
  timestamp: string;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { user, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'devices' | 'activity'>('profile');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Device Sessions (Enforcing Max 3 devices)
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    refetch: refetchSessions,
  } = useQuery<ActiveSession[]>({
    queryKey: ['auth-sessions'],
    queryFn: () => apiRequest('/auth/sessions'),
    enabled: isOpen && activeTab === 'devices',
  });

  // Login Activity History with IP and Location
  const {
    data: activities = [],
    isLoading: isLoadingActivities,
    refetch: refetchActivities,
  } = useQuery<ActivityLog[]>({
    queryKey: ['auth-activity'],
    queryFn: () => apiRequest('/auth/activity'),
    enabled: isOpen && activeTab === 'activity',
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiRequest(`/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['auth-activity'] });
      setSuccessMsg('Device session revoked successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to revoke session');
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full name cannot be blank.');
      return;
    }

    if (showPasswordSection) {
      if (newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('New password and confirm password do not match.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload: { full_name: string; phone?: string; password?: string } = {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      };

      if (showPasswordSection && newPassword) {
        payload.password = newPassword;
      }

      const res = await apiRequest('/users/me', {
        method: 'PATCH',
        body: payload,
      });

      updateProfile({
        full_name: res.full_name || fullName.trim(),
        phone: res.phone || phone.trim(),
      });

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'U';
  };

  const roleLabelMap: Record<string, string> = {
    super_admin: 'Super Admin',
    sales_admin: 'Sales Admin',
    telecaller: 'Telecaller',
    sales_exec: 'Sales Executive',
    surveyor: 'Field Surveyor',
    installer: 'EPC Installer',
    accounts: 'Accounts & Finance',
  };

  const getDeviceIcon = (type: string) => {
    if (type === 'mobile') return <Smartphone className="w-4 h-4 text-amber-400" />;
    if (type === 'tablet') return <Tablet className="w-4 h-4 text-cyan-400" />;
    return <Laptop className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
              {getInitials(user.full_name || user.email)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Account Security & Profile</h2>
              <p className="text-xs text-slate-400">Device access, login audit & personal details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'devices'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Active Devices (Max 3)</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'activity'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Login Activity</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: Profile Details */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Read-Only Account Info Row */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Assigned Role</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-amber-400 font-semibold">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{roleLabelMap[user.role] || user.role}</span>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Work Email</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-slate-300 font-mono truncate" title={user.email}>
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Direct Mobile Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 12345"
                  className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>

            {/* Optional Password Change Toggle */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{showPasswordSection ? 'Cancel Password Change' : 'Change Password'}</span>
              </button>

              {showPasswordSection && (
                <div className="mt-3 space-y-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full text-sm pl-10 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full text-sm pl-10 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Active Devices (Max 3 Concurrency) */}
        {activeTab === 'devices' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Device Limit Status Banner */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Laptop className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100">Three-Device Access Policy</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {sessions.length} / 3 Devices Connected
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Your account is permitted a maximum of <strong>3 concurrent active devices</strong>. Logging in on a 4th device will automatically terminate the oldest session to protect enterprise data.
                </p>
              </div>
            </div>

            {/* Sessions List */}
            {isLoadingSessions ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-2" />
                <p className="text-xs">Fetching active device sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-800 text-slate-400 text-xs">
                <Laptop className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">No external sessions detected</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Your current login is the only active session</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      session.is_current
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    } flex items-start justify-between gap-3`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        {getDeviceIcon(session.device_type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-100">{session.device_name}</h4>
                          {session.is_current && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Current Device</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-mono text-[11px]">{session.ip_address}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{session.location || 'India (Default)'}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Last active: {new Date(session.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    {!session.is_current && (
                      <button
                        onClick={() => revokeSessionMutation.mutate(session.id)}
                        disabled={revokeSessionMutation.isPending}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                        title="Sign out this device"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Login Activity Audit Log */}
        {activeTab === 'activity' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Recent Login History</h3>
                <p className="text-xs text-slate-400">Timestamped IP addresses and resolved device locations</p>
              </div>
              <button
                onClick={() => refetchActivities()}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300"
              >
                Refresh
              </button>
            </div>

            {isLoadingActivities ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-2" />
                <p className="text-xs">Loading audit trail...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-800 text-slate-400 text-xs">
                <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">No prior activity recorded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{act.device_name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            act.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : act.status === 'REVOKED'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {act.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-slate-400 flex-wrap text-[11px]">
                        <span className="font-mono text-slate-300">{act.ip_address}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{act.location}</span>
                        </span>
                      </div>

                      {act.reason && (
                        <p className="text-[11px] text-slate-500 italic">{act.reason}</p>
                      )}
                    </div>

                    <div className="text-right text-[11px] text-slate-500 shrink-0">
                      <div>{new Date(act.timestamp).toLocaleDateString()}</div>
                      <div>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
