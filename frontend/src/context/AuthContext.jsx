import { createContext, useContext, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('vm_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('vm_user');
    return null;
  }
};

const getGoogleAuthUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
  const normalizedBaseUrl = /^https?:\/\//i.test(baseUrl)
    ? baseUrl
    : `${baseUrl.startsWith('/') ? '' : '/'}${baseUrl}`;

  return `${normalizedBaseUrl.replace(/\/$/, '')}/auth/google`;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading] = useState(false);

  const setAuthSession = (token, userData) => {
    localStorage.setItem('vm_token', token);
    localStorage.setItem('vm_user', JSON.stringify(userData));
    setUser(userData);
  };

  const clearAuthSession = () => {
    localStorage.removeItem('vm_token');
    localStorage.removeItem('vm_user');
    setUser(null);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuthSession(data.token, data.user);
    return data;
  };

  const register = async (name, email, password, phone, countryCode) => {
    const payload = { name, email, password };
    if (phone) {
      payload.phone = phone;
      payload.countryCode = countryCode || '+91';
    }
    const { data } = await api.post('/auth/register', payload);
    return data;
  };

  const verifyEmail = async (email, code) => {
    const { data } = await api.post('/auth/verify-email', { email, code });
    return data;
  };

  const resendVerificationEmail = async (email) => {
    const { data } = await api.post('/auth/resend-verification', { email });
    return data;
  };

  const forgotPassword = async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  };

  const resetPassword = async (token, password) => {
    const { data } = await api.post(`/auth/reset-password/${token}`, { password });
    if (data.token && data.user) {
      setAuthSession(data.token, data.user);
    }
    return data;
  };

  const sendOtp = async (identifier, type = 'sms', purpose = 'login') => {
    const { data } = await api.post('/auth/send-otp', { identifier, type, purpose });
    return data;
  };

  const verifyPhoneOtp = async (phone, code, name, countryCode) => {
    const payload = { phone, code };
    if (name) payload.name = name;
    if (countryCode) payload.countryCode = countryCode;
    const { data } = await api.post('/auth/verify-otp', payload);
    setAuthSession(data.token, data.user);
    return data;
  };

  const continueWithGoogle = () => {
    window.location.assign(getGoogleAuthUrl());
  };

  const completeGoogleAuth = async (token) => {
    localStorage.setItem('vm_token', token);

    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('vm_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (error) {
      clearAuthSession();
      throw error;
    }
  };

  const logout = () => {
    clearAuthSession();
  };

  const updateUser = (userData) => {
    localStorage.setItem('vm_user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      verifyEmail,
      resendVerificationEmail,
      forgotPassword,
      resetPassword,
      sendOtp,
      verifyPhoneOtp,
      continueWithGoogle,
      completeGoogleAuth,
      logout,
      updateUser,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
