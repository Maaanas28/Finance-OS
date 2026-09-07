import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('finance_os_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        if (res?.data?.user) {
          setUser(res.data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Failed to revalidate user session:', err.message);
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = async (credentials) => {
    const res = await api.login(credentials);
    const { user: authUser, token: authToken } = res.data;
    localStorage.setItem('finance_os_token', authToken);
    setToken(authToken);
    setUser(authUser);
    return authUser;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    const { user: authUser, token: authToken } = res.data;
    localStorage.setItem('finance_os_token', authToken);
    setToken(authToken);
    setUser(authUser);
    return authUser;
  };

  const logout = () => {
    localStorage.removeItem('finance_os_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const defaultAuth = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context || defaultAuth;
}
