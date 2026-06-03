import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('vm_token');
      const requestUrl = String(error.config?.url || '');
      const authRoutes = [
        '/auth/login',
        '/auth/register',
        '/auth/login/verify-otp',
        '/auth/verify-email',
        '/auth/resend-verification',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/send-otp',
        '/auth/verify-otp',
      ];
      const isAuthRoute = authRoutes.some((route) => requestUrl.includes(route));

      if (token && !isAuthRoute && window.location.pathname !== '/login') {
        localStorage.removeItem('vm_token');
        localStorage.removeItem('vm_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
