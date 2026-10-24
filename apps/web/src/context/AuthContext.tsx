import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';

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
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        applySession(data);
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
