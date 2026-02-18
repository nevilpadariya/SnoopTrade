import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthTokenResponse, UserProfile } from '../types/api';
import {
  ApiError,
  getCurrentUser,
  loginWithGoogle,
  loginWithPassword,
  logoutSession,
  refreshAccessToken,
  signUp as signUpApi,
} from '../services/api';
import {
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  setStoredRefreshToken,
  setStoredToken,
} from '../services/authStorage';

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

type JwtPayload = { exp?: number };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function shouldRefreshSoon(token: string, thresholdSeconds = 300): boolean {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (!decoded.exp) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp - now <= thresholdSeconds;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const persistAuthTokens = useCallback(async (auth: AuthTokenResponse) => {
    setToken(auth.access_token);
    setRequiresPassword(auth.requires_password);
    await setStoredToken(auth.access_token);
    if (auth.refresh_token) {
      setRefreshToken(auth.refresh_token);
      await setStoredRefreshToken(auth.refresh_token);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (tokenRef.current) {
      try {
        await logoutSession(tokenRef.current);
      } catch {
        // local logout should still succeed if network call fails
      }
    }
    await clearStoredToken();
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setRequiresPassword(false);
  }, []);

  const rotateAccessToken = useCallback(async (): Promise<string | null> => {
    if (!refreshToken) {
      return null;
    }

    try {
      const rotated = await refreshAccessToken(refreshToken);
      await persistAuthTokens(rotated);
      return rotated.access_token;
    } catch {
      await signOut();
      return null;
    }
  }, [refreshToken, persistAuthTokens, signOut]);

  useEffect(() => {
    const init = async () => {
      try {
        const [storedAccess, storedRefresh] = await Promise.all([getStoredToken(), getStoredRefreshToken()]);
        if (!storedAccess) {
          setLoading(false);
          return;
        }

        setToken(storedAccess);
        setRefreshToken(storedRefresh);

        try {
          const me = await getCurrentUser(storedAccess);
          setUser(me);
        } catch (error) {
          if (error instanceof ApiError && error.status === 401 && storedRefresh) {
            const rotated = await refreshAccessToken(storedRefresh);
            await persistAuthTokens(rotated);
            const me = await getCurrentUser(rotated.access_token);
            setUser(me);
          } else {
            await signOut();
          }
        }
      } catch {
        await signOut();
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [persistAuthTokens, signOut]);

  useEffect(() => {
    if (!token || !refreshToken) {
      return;
    }

    const interval = setInterval(() => {
      if (token && shouldRefreshSoon(token)) {
        void rotateAccessToken();
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [token, refreshToken, rotateAccessToken]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const me = await getCurrentUser(token);
      setUser(me);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const newAccess = await rotateAccessToken();
        if (!newAccess) {
          return;
        }
        const me = await getCurrentUser(newAccess);
        setUser(me);
        return;
      }
      throw error;
    }
  }, [token, rotateAccessToken]);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = await loginWithPassword(email, password);
    await persistAuthTokens(auth);

    try {
      const me = await getCurrentUser(auth.access_token);
      setUser(me);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await signOut();
      }
      throw error;
    }
  }, [persistAuthTokens, signOut]);

  const signInWithGoogle = useCallback(async (email: string, googleIdToken: string) => {
    const auth = await loginWithGoogle(email, googleIdToken);
    await persistAuthTokens(auth);

    try {
      const me = await getCurrentUser(auth.access_token);
      setUser(me);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await signOut();
      }
      throw error;
    }
  }, [persistAuthTokens, signOut]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    await signUpApi(name, email, password);
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
