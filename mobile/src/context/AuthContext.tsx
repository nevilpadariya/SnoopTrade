import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { UserProfile } from '../types/api';
import { ApiError, getCurrentUser, loginWithGoogle, loginWithPassword, signUp as signUpApi } from '../services/api';
import { clearStoredToken, getStoredToken, setStoredToken } from '../services/authStorage';

interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  loading: boolean;
  requiresPassword: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (email: string, googleIdToken: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await getStoredToken();
        if (!stored) {
          setLoading(false);
          return;
        }

        setToken(stored);
        const me = await getCurrentUser(stored);
        setUser(me);
      } catch {
        await clearStoredToken();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return;
    }

    const me = await getCurrentUser(token);
    setUser(me);
  }, [token]);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = await loginWithPassword(email, password);
    setToken(auth.access_token);
    setRequiresPassword(auth.requires_password);
    await setStoredToken(auth.access_token);

    try {
      const me = await getCurrentUser(auth.access_token);
      setUser(me);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearStoredToken();
        setToken(null);
      }
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async (email: string, googleIdToken: string) => {
    const auth = await loginWithGoogle(email, googleIdToken);
    setToken(auth.access_token);
    setRequiresPassword(auth.requires_password);
    await setStoredToken(auth.access_token);

    try {
      const me = await getCurrentUser(auth.access_token);
      setUser(me);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearStoredToken();
        setToken(null);
      }
      throw error;
    }
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    await signUpApi(name, email, password);
  }, []);

  const signOut = useCallback(async () => {
    await clearStoredToken();
    setToken(null);
    setUser(null);
    setRequiresPassword(false);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, requiresPassword, signIn, signInWithGoogle, signUp, signOut, refreshUser }),
    [token, user, loading, requiresPassword, signIn, signInWithGoogle, signUp, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
