import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const TOKEN_KEY = 'vm_token';
export const USER_KEY = 'vm_user';
export const REFRESH_KEY = 'vm_refresh';

const api = axios.create({
  baseURL: API_BASE,
  // Fail fast instead of hanging forever if the server is slow/unreachable
  // (important on Render free tier where the first request after idle is slow).
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  // Required so the httpOnly refresh cookie is sent to /auth/refresh.
  withCredentials: true,
});

/**
 * Bare client used ONLY for the refresh call, so a 401 from the refresh
 * endpoint cannot recurse back into the interceptor below.
 */
const refreshClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const clearStoredSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Access tokens are short-lived (15m), so an expired token is a routine event
 * rather than a session ending. A single in-flight refresh is shared across all
 * requests that 401 concurrently, so a burst of parallel calls triggers one
 * refresh instead of a stampede.
 */
let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        // The refresh token normally travels as an httpOnly cookie. The body
        // copy is a fallback for browsers that block third-party cookies when
        // the API is on a different site than the SPA.
        const storedRefresh = localStorage.getItem(REFRESH_KEY);
        const { data } = await refreshClient.post(
          '/auth/refresh',
          storedRefresh ? { refreshToken: storedRefresh } : {}
        );

        if (!data?.token) throw new Error('No token returned from refresh');

        localStorage.setItem(TOKEN_KEY, data.token);
        if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
        if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        return data.token;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
};

// Endpoints where a 401 is an expected answer (bad password, bad OTP) rather
// than an expired session. A 401 from these must never clear the session or
// trigger a refresh — doing so would destroy in-progress OTP screen state.
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/login/verify-otp',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/refresh',
  '/auth/google/exchange',
];

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

    if (error.response?.status === 401 && config) {
      const requestUrl = String(config.url || '');
      const isAuthRoute = AUTH_ROUTES.some((route) => requestUrl.includes(route));
      const token = localStorage.getItem(TOKEN_KEY);

      if (!isAuthRoute && token && !config._refreshAttempted) {
        config._refreshAttempted = true;

        try {
          const newToken = await refreshAccessToken();
          config.headers = { ...config.headers, Authorization: `Bearer ${newToken}` };
          return api(config);
        } catch {
          // Refresh failed — the session is genuinely over.
          clearStoredSession();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }
      }

      if (!isAuthRoute && token && window.location.pathname !== '/login') {
        clearStoredSession();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
