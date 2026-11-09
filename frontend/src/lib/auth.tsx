import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminApi } from './adminApi';

export type User = { id: string; name: string; email: string; role: string; perms: string[] };

type Auth = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (perm: string) => boolean;
};

const Ctx = createContext<Auth>(null as unknown as Auth);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On the public site only check when a previous sign-in left its marker cookie.
    const relevant = window.location.pathname.startsWith('/admin') || /(?:^|; )pe_csrf=/.test(document.cookie);
    if (!relevant) { setLoading(false); return; }
    adminApi<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await adminApi<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setUser(r.user);
  }, []);

  const logout = useCallback(async () => {
    try { await adminApi('/auth/logout', { method: 'POST', body: '{}' }); } finally { setUser(null); }
  }, []);

  const value = useMemo<Auth>(() => ({ user, loading, login, logout, can: (p) => !!user?.perms.includes(p) }), [user, loading, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
