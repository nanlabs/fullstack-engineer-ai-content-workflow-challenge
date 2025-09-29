'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { UserResponseDto, LoginDto, RegisterDto } from '@/types';

interface AuthContextType {
  user: UserResponseDto | null;
  isLoading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  register: (userData: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user && apiClient.isAuthenticated();

  // Helper functions for user data persistence
  const saveUserToStorage = (userData: UserResponseDto) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_data', JSON.stringify(userData));
    }
  };

  const getUserFromStorage = (): UserResponseDto | null => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  };

  const clearUserFromStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_data');
    }
  };

  useEffect(() => {
    // Check if user is logged in on app start
    const checkAuth = async () => {
      try {
        if (apiClient.isAuthenticated()) {
          // Try to restore user data from localStorage
          const storedUser = getUserFromStorage();
          if (storedUser) {
            setUser(storedUser);
          }
          setIsLoading(false);
        } else {
          // Clear any stored user data if no valid token
          clearUserFromStorage();
          setUser(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        apiClient.clearToken();
        clearUserFromStorage();
        setUser(null);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginDto) => {
    try {
      setIsLoading(true);
      const response = await apiClient.login(credentials);
      setUser(response.user);
      saveUserToStorage(response.user); // Save user data to localStorage
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterDto) => {
    try {
      setIsLoading(true);
      const response = await apiClient.register(userData);
      setUser(response.user);
      saveUserToStorage(response.user); // Save user data to localStorage
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      setUser(null);
      clearUserFromStorage(); // Clear user data from localStorage
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
