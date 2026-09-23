import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getSavedUser, setSavedUser, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

export type UserRole = 'USER' | 'SOC_ANALYST' | 'ADMIN';
export type UserMode = 'STUDENT' | 'EMPLOYEE';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  user_mode: UserMode;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<any>;
  logout: () => void;
  quickSwitchUser: (preset: 'student' | 'employee' | 'analyst' | 'admin') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getSavedUser());
  const [userMode, setUserModeState] = useState<UserMode>(user?.user_mode || 'STUDENT');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const profile = await api.getCurrentUser();
          setUser(profile);
          setSavedUser(profile);
          setUserModeState(profile.user_mode || 'STUDENT');
        } catch {
          removeAuthToken();
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const setUserMode = (mode: UserMode) => {
    setUserModeState(mode);
    if (user) {
      const updated = { ...user, user_mode: mode };
      setUser(updated);
      setSavedUser(updated);
    }
  };

  const login = async (email: string, pass: string) => {
    const data = await api.login({ email, password: pass });
    setAuthToken(data.access_token);
    setUser(data.user);
    setSavedUser(data.user);
    setUserModeState(data.user.user_mode || 'STUDENT');
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    if (res.access_token) {
      setAuthToken(res.access_token);
      setUser(res.user);
      setSavedUser(res.user);
      setUserModeState(res.user.user_mode || 'STUDENT');
    }
    return res;
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = await api.verifyOtp({ email, otp });
    setAuthToken(res.access_token);
    setUser(res.user);
    setSavedUser(res.user);
    setUserModeState(res.user.user_mode || 'STUDENT');
    return res;
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const quickSwitchUser = async (preset: 'student' | 'employee' | 'analyst' | 'admin') => {
    const credentials = {
      student: { email: 'student@university.edu', password: 'Password123!' },
      employee: { email: 'employee@company.com', password: 'Password123!' },
      analyst: { email: 'analyst@sentriai.io', password: 'Password123!' },
      admin: { email: 'admin@sentriai.io', password: 'Password123!' }
    }[preset];

    await login(credentials.email, credentials.password);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userMode,
      setUserMode,
      isLoading,
      login,
      register,
      verifyOtp,
      logout,
      quickSwitchUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
