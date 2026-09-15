import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch, API_URL } from '../api/client';
import { tokenStore } from './tokenStore';
import type { AuthUser } from '../api/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          tokenStore.set(data.accessToken);
          setUser(data.user);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    tokenStore.set(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      tokenStore.set(null);
      setUser(null);
    }
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
