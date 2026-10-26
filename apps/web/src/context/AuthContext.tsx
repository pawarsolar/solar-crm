import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';
import { supabase } from '../lib/supabase';

const ALL_FEATURES = [
  'leads',
  'telecalling',
  'bulk_import',
  'export_excel',
  'export_pdf',
  'quotation',
  'payments',
  'survey',
  'installation',
  'subsidy',
  'reports',
  'report_share',
  'kpi_dashboard',
  'service_tickets',
  'whatsapp',
];

function featureSet(enabled: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of ALL_FEATURES) out[key] = enabled.includes(key);
  return out;
}

const FALLBACK_ROLE_FEATURES: Record<string, Record<string, boolean>> = {
  super_admin: featureSet(ALL_FEATURES),
  sales_admin: featureSet([
    'leads', 'telecalling', 'bulk_import', 'export_excel', 'export_pdf', 'quotation',
    'payments', 'survey', 'installation', 'reports', 'kpi_dashboard', 'service_tickets', 'whatsapp',
  ]),
  telecaller: featureSet(['leads', 'telecalling', 'kpi_dashboard', 'whatsapp']),
  sales_exec: featureSet(['leads', 'quotation', 'survey', 'kpi_dashboard', 'whatsapp']),
  surveyor: featureSet(['leads', 'survey', 'kpi_dashboard']),
  installer: featureSet(['leads', 'installation', 'kpi_dashboard', 'service_tickets']),
  accounts: featureSet([
    'export_excel', 'export_pdf', 'payments', 'subsidy', 'reports', 'kpi_dashboard', 'whatsapp',
  ]),
};

interface DemoUserRecord {
  role: UserRole;
  name: string;
  id: string;
}

const DEMO_USERS: Record<string, DemoUserRecord> = {
  'admin@kyrossolar.com': { role: 'super_admin', name: 'Kishan', id: '22222222-2222-2222-2222-222222222221' },
  'sales.lead@kyrossolar.com': { role: 'sales_admin', name: 'Vikram Deshmukh', id: '22222222-2222-2222-2222-222222222222' },
  'telecaller1@kyrossolar.com': { role: 'telecaller', name: 'Sneha Patil', id: '22222222-2222-2222-2222-222222222223' },
  'telecaller2@kyrossolar.com': { role: 'telecaller', name: 'Amit Kulkarni', id: '22222222-2222-2222-2222-222222222224' },
  'exec1@kyrossolar.com': { role: 'sales_exec', name: 'Rohan Mehta', id: '22222222-2222-2222-2222-222222222225' },
  'exec2@kyrossolar.com': { role: 'sales_exec', name: 'Pooja Joshi', id: '22222222-2222-2222-2222-222222222226' },
  'surveyor1@kyrossolar.com': { role: 'surveyor', name: 'Sachin Shinde', id: '22222222-2222-2222-2222-222222222227' },
  'installer1@kyrossolar.com': { role: 'installer', name: 'Ganesh Pawar', id: '22222222-2222-2222-2222-222222222228' },
  'accounts@kyrossolar.com': { role: 'accounts', name: 'Meera Iyer', id: '22222222-2222-2222-2222-222222222229' },
};

export type UserRole =
  | 'super_admin'
  | 'sales_admin'
  | 'telecaller'
  | 'sales_exec'
  | 'surveyor'
  | 'installer'
  | 'accounts';

export interface UserProfile {
  id: string;
  email: string;
  org_id: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  team_id?: string;
}

export interface ImpersonatorInfo {
  id: string;
  full_name?: string;
  role: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  features: Record<string, boolean>;
  impersonator: ImpersonatorInfo | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updatedFields: Partial<UserProfile>) => void;
  hasFeature: (featureKey: string) => boolean;
  /** Super Admin only: enter a child (staff) session. */
  impersonate: (userId: string) => Promise<void>;
  /** Return from a child session to the originating Super Admin. */
  switchBack: () => Promise<void>;
  switchRoleDemo: (role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE = {
  token: 'solar_auth_token',
  user: 'solar_user',
  features: 'solar_features',
  impersonator: 'solar_impersonator',
} as const;

function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() =>
    readJson<UserProfile>(STORAGE.user),
  );

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE.token),
  );

  const [features, setFeatures] = useState<Record<string, boolean>>(
    () => readJson<Record<string, boolean>>(STORAGE.features) || {},
  );

  const [impersonator, setImpersonator] = useState<ImpersonatorInfo | null>(() =>
    readJson<ImpersonatorInfo>(STORAGE.impersonator),
  );

  const [isLoading, setIsLoading] = useState(false);

  const applySession = useCallback(
    (data: {
      token: string;
      user: UserProfile;
      features?: Record<string, boolean>;
      impersonator?: ImpersonatorInfo | null;
    }) => {
      const nextImpersonator = data.impersonator || null;
      setToken(data.token);
      setUser(data.user);
      setFeatures(data.features || {});
      setImpersonator(nextImpersonator);

      localStorage.setItem(STORAGE.token, data.token);
      localStorage.setItem(STORAGE.user, JSON.stringify(data.user));
      localStorage.setItem(STORAGE.features, JSON.stringify(data.features || {}));
      if (nextImpersonator) {
        localStorage.setItem(STORAGE.impersonator, JSON.stringify(nextImpersonator));
      } else {
        localStorage.removeItem(STORAGE.impersonator);
      }
    },
    [],
  );

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setFeatures({});
    setImpersonator(null);
    Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
  }, []);

  const login = useCallback(
    async (email: string, password: string = 'KyrosPass@123') => {
      setIsLoading(true);
      try {
        // Tier 1: Attempt external/local backend API (Render or local dev server)
        try {
          const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: { email, password },
          });
          if (data && data.token && data.user) {
            applySession(data);
            return;
          }
        } catch (apiErr: any) {
          console.warn('[Auth] Backend API request failed or offline:', apiErr.message);
        }

        // Tier 2: Attempt direct Supabase Auth
        try {
          const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (!supaErr && supaData?.session && supaData.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', supaData.user.id)
              .single();

            const userRole: UserRole = (profile?.role as UserRole) || 'super_admin';
            const userProfile: UserProfile = {
              id: supaData.user.id,
              email: supaData.user.email || email,
              org_id: profile?.org_id || '11111111-1111-1111-1111-111111111111',
              role: userRole,
              full_name: profile?.full_name || supaData.user.user_metadata?.full_name || email.split('@')[0],
              phone: profile?.phone,
              team_id: profile?.team_id,
            };

            applySession({
              token: supaData.session.access_token,
              user: userProfile,
              features: FALLBACK_ROLE_FEATURES[userRole] || FALLBACK_ROLE_FEATURES.super_admin,
              impersonator: null,
            });
            return;
          }
        } catch (supaErr: any) {
          console.warn('[Auth] Supabase direct auth attempt bypassed:', supaErr.message);
        }

        // Tier 3: Client-side seeded demo authentication (guarantees Netlify publish preview success)
        const normalizedEmail = email.toLowerCase().trim();
        if (DEMO_USERS[normalizedEmail]) {
          const demoUser = DEMO_USERS[normalizedEmail];
          applySession({
            token: `demo-token-${demoUser.role}`,
            user: {
              id: demoUser.id,
              email: normalizedEmail,
              org_id: '11111111-1111-1111-1111-111111111111',
              role: demoUser.role,
              full_name: demoUser.name,
            },
            features: FALLBACK_ROLE_FEATURES[demoUser.role] || FALLBACK_ROLE_FEATURES.super_admin,
            impersonator: null,
          });
          return;
        }

        throw new Error('Invalid email or password. For demo access on Netlify, use admin@kyrossolar.com');
      } finally {
        setIsLoading(false);
      }
    },
    [applySession],
  );

  /** Super Admin child login: real session for the target staff member. */
  const impersonate = useCallback(
    async (userId: string) => {
      setIsLoading(true);
      try {
        const data = await apiRequest('/auth/impersonate', {
          method: 'POST',
          body: { user_id: userId },
        });
        applySession(data);
      } finally {
        setIsLoading(false);
      }
    },
    [applySession],
  );

  /** Back to the original Super Admin session. */
  const switchBack = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest('/auth/switch-back', { method: 'POST' });
      applySession(data);
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  // Rehydrate the freshest entitlements + impersonation state on load.
  useEffect(() => {
    if (!token || token.startsWith('demo-token-')) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest('/auth/me');
        if (cancelled || !data?.user) return;
        setUser(data.user);
        setFeatures(data.features || {});
        setImpersonator(data.impersonator || null);
        localStorage.setItem(STORAGE.user, JSON.stringify(data.user));
        localStorage.setItem(STORAGE.features, JSON.stringify(data.features || {}));
        if (data.impersonator) {
          localStorage.setItem(STORAGE.impersonator, JSON.stringify(data.impersonator));
        } else {
          localStorage.removeItem(STORAGE.impersonator);
        }
      } catch {
        // Token expired or profile gone: session stays as cached and guards redirect.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Keep multiple tabs in sync when the session identity changes.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE.token) {
        setToken(e.newValue);
      }
      if (e.key === STORAGE.user) {
        setUser(readJson<UserProfile>(STORAGE.user));
      }
      if (e.key === STORAGE.features) {
        setFeatures(readJson<Record<string, boolean>>(STORAGE.features) || {});
      }
      if (e.key === STORAGE.impersonator) {
        setImpersonator(readJson<ImpersonatorInfo>(STORAGE.impersonator));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const switchRoleDemo = useCallback(
    async (role: string) => {
      const emailMap: Record<string, string> = {
        super_admin: 'admin@kyrossolar.com',
        sales_admin: 'sales.lead@kyrossolar.com',
        telecaller: 'telecaller1@kyrossolar.com',
        sales_exec: 'exec1@kyrossolar.com',
        surveyor: 'surveyor1@kyrossolar.com',
        installer: 'installer1@kyrossolar.com',
        accounts: 'accounts@kyrossolar.com',
      };
      if (emailMap[role]) {
        await login(emailMap[role]);
      }
    },
    [login],
  );

  const hasFeature = useCallback(
    (featureKey: string): boolean => {
      if (!user) return false;
      if (user.role === 'super_admin') return true;
      return !!features[featureKey];
    },
    [user, features],
  );

  const updateProfile = useCallback((updatedFields: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updatedFields };
      localStorage.setItem(STORAGE.user, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        features,
        impersonator,
        isLoading,
        login,
        logout: clearSession,
        updateProfile,
        hasFeature,
        impersonate,
        switchBack,
        switchRoleDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
