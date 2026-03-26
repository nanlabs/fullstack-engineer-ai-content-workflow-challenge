import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { authApi } from './api';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('auth_token'),
  );

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    localStorage.setItem('auth_token', result.access_token);
    localStorage.setItem('auth_user', JSON.stringify(result.user));
    setToken(result.access_token);
    setUser(result.user);
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    const result = await authApi.signup(email, password, name);
    localStorage.setItem('auth_token', result.access_token);
    localStorage.setItem('auth_user', JSON.stringify(result.user));
    setToken(result.access_token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
