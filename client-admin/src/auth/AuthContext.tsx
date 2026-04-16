import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { fetchSession, login as loginApi, logout as logoutApi, SessionInfo } from './authClient';

interface AuthContextValue {
  loading: boolean;
  authenticated: boolean;
  username?: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionInfo>({ authenticated: false });

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((s) => {
      if (!cancelled) {
        setSession(s);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const doLogin = useCallback(async (username: string, password: string) => {
    const s = await loginApi(username, password);
    setSession(s);
  }, []);

  const doLogout = useCallback(async () => {
    await logoutApi();
    setSession({ authenticated: false });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      authenticated: session.authenticated,
      username: session.username,
      login: doLogin,
      logout: doLogout,
    }),
    [loading, session, doLogin, doLogout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
