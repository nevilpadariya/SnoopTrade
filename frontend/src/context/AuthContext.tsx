import { createContext, useContext, useState, ReactNode } from 'react';

import API_ENDPOINTS from '../utils/apiEndpoints';

const AUTH_REQUIRES_PASSWORD_KEY = 'authRequiresPassword';

function getStoredRequiresPassword(): boolean {
  return localStorage.getItem(AUTH_REQUIRES_PASSWORD_KEY) === 'true';
}

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  requiresPassword: boolean;
  setRequiresPassword: (value: boolean) => void;
  user: User | null;
  refreshUser: () => Promise<void>;
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
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [requiresPassword, setRequiresPasswordState] = useState<boolean>(getStoredRequiresPassword);
  const [user, setUser] = useState<User | null>(null);

  // Helper to fetch user details
  const fetchUserDetails = async (currentToken: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.getUserDetails, {
        headers: { 'Authorization': `Bearer ${currentToken}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
         // Silently fail or handle error
         console.warn('Failed to fetch user details', response.status);
         setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user details', error);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUserDetails(token);
    }
  };

  // Effect to fetch user when token changes
  useState(() => {
     if (token) {
       fetchUserDetails(token);
     }
  });

  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTimestamp');
    localStorage.removeItem(AUTH_REQUIRES_PASSWORD_KEY);
    setRequiresPasswordState(false);
    setToken(null);
    setUser(null);
  };

  const updateToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('authTimestamp', Date.now().toString());
      fetchUserDetails(newToken);
    } else {
      logout();
    }
    setToken(newToken);
  };

  const setRequiresPassword = (value: boolean) => {
    if (value) {
      localStorage.setItem(AUTH_REQUIRES_PASSWORD_KEY, 'true');
    } else {
      localStorage.removeItem(AUTH_REQUIRES_PASSWORD_KEY);
    }
    setRequiresPasswordState(value);
  };

  // Check session validity on mount and set up auto-logout
  useState(() => {
    const checkSession = () => {
      const storedToken = localStorage.getItem('authToken');
      const storedTimestamp = localStorage.getItem('authTimestamp');

      if (storedToken && storedTimestamp) {
        const now = Date.now();
        const loginTime = parseInt(storedTimestamp, 10);
        
        if (now - loginTime > SESSION_DURATION) {
          logout();
        }
      }
    };

    checkSession();
    
    // Check every minute
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);
  });

  return (
    <AuthContext.Provider value={{ token, setToken: updateToken, requiresPassword, setRequiresPassword, user, refreshUser }}>
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
