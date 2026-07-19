import { createContext, useContext, useState } from 'react';
import api, { TOKEN_KEY, USER_KEY, REFRESH_KEY, clearStoredSession } from '../utils/api';

const AuthContext = createContext();

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
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

  const setAuthSession = (token, userData, refreshToken) => {
    // Guard against a 200 response that omits the token: writing `undefined`
    // here previously produced the literal string "undefined" in localStorage
    // and a broken half-logged-in state.
    if (!token || !userData) {
      throw new Error('Authentication response was incomplete. Please try again.');
    }

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    setUser(userData);
  };

  const clearAuthSession = () => {
    clearStoredSession();
    setUser(null);
  };

  /**
   * Step 1 of login: password only.
   *
   * Every account — including admin and superadmin — now receives an OTP
   * challenge here rather than a token. The response carries an `mfaToken` that
   * proves the password step succeeded; it must be passed to verifyLoginOtp.
   */
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });

    // Retained for safety, though the server no longer returns a token from
    // this endpoint for any role.
    if (data.token && data.user) {
      setAuthSession(data.token, data.user, data.refreshToken);
    }
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

  /** Step 2 of login: the emailed OTP, bound to step 1 by the mfaToken. */
  const verifyLoginOtp = async (code, mfaToken) => {
    const { data } = await api.post('/auth/login/verify-otp', { code, mfaToken });
    setAuthSession(data.token, data.user, data.refreshToken);
    return data;
  };

  const verifyEmail = async (email, code) => {
    const { data } = await api.post('/auth/verify-email', { email, code });
    if (data.token && data.user) {
      setAuthSession(data.token, data.user, data.refreshToken);
    }
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
      setAuthSession(data.token, data.user, data.refreshToken);
    }
    return data;
  };

  /** Phone verification only. Login OTPs are issued exclusively by /auth/login. */
  const sendOtp = async (identifier, type = 'sms') => {
    const { data } = await api.post('/auth/send-otp', { identifier, type });
    return data;
  };

  const verifyPhoneOtp = async (phone, code, name, countryCode) => {
    const payload = { phone, code };
    if (name) payload.name = name;
    if (countryCode) payload.countryCode = countryCode;
    const { data } = await api.post('/auth/verify-otp', payload);
    setAuthSession(data.token, data.user, data.refreshToken);
    return data;
  };

  const continueWithGoogle = () => {
    window.location.assign(getGoogleAuthUrl());
  };

  /**
   * Completes Google sign-in by exchanging the single-use code from the
   * callback URL for tokens.
   *
   * The backend previously redirected with the JWT itself in the query string,
   * which leaked the credential into browser history, Referer headers and proxy
   * logs. The code is single-use and expires in 60 seconds.
   */
  const completeGoogleAuth = async (code) => {
    try {
      const { data } = await api.post('/auth/google/exchange', { code });
      setAuthSession(data.token, data.user, data.refreshToken);
      return data.user;
    } catch (error) {
      clearAuthSession();
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Actually revoke the refresh token server-side. The previous
      // implementation only cleared localStorage, leaving the token valid.
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch {
      // Logout must always succeed locally, even if the network call fails.
    } finally {
      clearAuthSession();
    }
  };

  const logoutAllDevices = async () => {
    try {
      await api.post('/auth/logout-all');
    } finally {
      clearAuthSession();
    }
  };

  const updateUser = (userData) => {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      verifyLoginOtp,
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
      logoutAllDevices,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
