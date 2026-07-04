import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  // Fail fast instead of hanging forever if the server is slow/unreachable
  // (important on Render free tier where the first request after idle is slow).
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Fault tolerance: retry idempotent GET requests ONCE on a timeout or a
    // network error (no response) — e.g. a Render free-tier cold start. Never
    // retry POST/PUT/DELETE, to avoid duplicate writes.
    const config = error.config;
    const isGet = config && (config.method || 'get').toLowerCase() === 'get';
    const isTransient = error.code === 'ECONNABORTED' || !error.response;
    if (config && isGet && isTransient && !config._retried) {
      config._retried = true;
      await new Promise((resolve) => setTimeout(resolve, 800));
      return api(config);
    }

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
