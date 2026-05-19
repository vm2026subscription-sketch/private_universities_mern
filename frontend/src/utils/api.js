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
      const isAuthRoute = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/signup');

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
