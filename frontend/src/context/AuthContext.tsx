import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import API_ENDPOINTS from '../utils/apiEndpoints';

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_REFRESH_TOKEN_KEY = 'authRefreshToken';
const AUTH_TIMESTAMP_KEY = 'authTimestamp';
const AUTH_REQUIRES_PASSWORD_KEY = 'authRequiresPassword';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

function getStoredRequiresPassword(): boolean {
  return localStorage.getItem(AUTH_REQUIRES_PASSWORD_KEY) === 'true';
}

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  refreshToken: string | null;
  setRefreshToken: (token: string | null) => void;
  requiresPassword: boolean;
  setRequiresPassword: (value: boolean) => void;
  user: User | null;
  refreshUser: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(localStorage.getItem(AUTH_TOKEN_KEY));
  const [refreshToken, setRefreshTokenState] = useState<string | null>(localStorage.getItem(AUTH_REFRESH_TOKEN_KEY));
  const [requiresPassword, setRequiresPasswordState] = useState<boolean>(getStoredRequiresPassword);
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {
    if (token) {
      void fetch(API_ENDPOINTS.logout, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // local logout still proceeds if network request fails
      });
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_TIMESTAMP_KEY);
    localStorage.removeItem(AUTH_REQUIRES_PASSWORD_KEY);
    setRequiresPasswordState(false);
    setTokenState(null);
    setRefreshTokenState(null);
    setUser(null);
  }, [token]);

  const setRequiresPassword = useCallback((value: boolean) => {
    if (value) {
      localStorage.setItem(AUTH_REQUIRES_PASSWORD_KEY, 'true');
    } else {
      localStorage.removeItem(AUTH_REQUIRES_PASSWORD_KEY);
    }
    setRequiresPasswordState(value);
  }, []);

  const setRefreshToken = useCallback((newRefreshToken: string | null) => {
    if (newRefreshToken) {
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, newRefreshToken);
    } else {
      localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    }
    setRefreshTokenState(newRefreshToken);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const currentRefresh = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    if (!currentRefresh) {
      return null;
    }

    try {
      const response = await fetch(API_ENDPOINTS.refreshToken, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: currentRefresh }),
      });

      if (!response.ok) {
        logout();
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.access_token as string | undefined;
      const newRefreshToken = data.refresh_token as string | undefined;
      if (!newAccessToken) {
        logout();
        return null;
      }

      localStorage.setItem(AUTH_TOKEN_KEY, newAccessToken);
      localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
      setTokenState(newAccessToken);

      if (newRefreshToken) {
        localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, newRefreshToken);
        setRefreshTokenState(newRefreshToken);
      }

      if (typeof data.requires_password === 'boolean') {
        setRequiresPassword(data.requires_password);
      }

      return newAccessToken;
    } catch {
      logout();
      return null;
    }
  }, [logout, setRequiresPassword]);

  const fetchUserDetails = useCallback(async (currentToken: string, allowRefresh = true) => {
    try {
      const response = await fetch(API_ENDPOINTS.getUserDetails, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return;
      }

      if (response.status === 401 && allowRefresh) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          await fetchUserDetails(newAccessToken, false);
          return;
        }
      }

      setUser(null);
    } catch {
      setUser(null);
    }
  }, [refreshAccessToken]);

  const setToken = useCallback((newToken: string | null) => {
    if (newToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, newToken);
      localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
      setTokenState(newToken);
      void fetchUserDetails(newToken);
    } else {
      logout();
    }
  }, [fetchUserDetails, logout]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return;
    }
    await fetchUserDetails(token);
  }, [token, fetchUserDetails]);

  useEffect(() => {
    if (token) {
      void fetchUserDetails(token);
    } else {
      setUser(null);
    }
  }, [token, fetchUserDetails]);

  useEffect(() => {
    const checkSession = () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedTimestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);

      if (!storedToken || !storedTimestamp) {
        return;
      }

      const now = Date.now();
      const loginTime = parseInt(storedTimestamp, 10);
      if (now - loginTime > SESSION_DURATION) {
        void refreshAccessToken().then((newToken) => {
          if (!newToken) {
            logout();
          }
        });
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);
  }, [logout, refreshAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        refreshToken,
        setRefreshToken,
        requiresPassword,
        setRequiresPassword,
        user,
        refreshUser,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
