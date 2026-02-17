import { createContext, useContext, useState, ReactNode } from 'react';

const AUTH_REQUIRES_PASSWORD_KEY = 'authRequiresPassword';

function getStoredRequiresPassword(): boolean {
  return localStorage.getItem(AUTH_REQUIRES_PASSWORD_KEY) === 'true';
}

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  requiresPassword: boolean;
  setRequiresPassword: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [requiresPassword, setRequiresPasswordState] = useState<boolean>(getStoredRequiresPassword);

  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTimestamp');
    localStorage.removeItem(AUTH_REQUIRES_PASSWORD_KEY);
    setRequiresPasswordState(false);
    setToken(null);
  };

  const updateToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('authTimestamp', Date.now().toString());
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
    <AuthContext.Provider value={{ token, setToken: updateToken, requiresPassword, setRequiresPassword }}>
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
