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

  const updateToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('authToken', newToken);
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem(AUTH_REQUIRES_PASSWORD_KEY);
      setRequiresPasswordState(false);
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
