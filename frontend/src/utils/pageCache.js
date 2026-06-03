const isBrowser = () => typeof window !== 'undefined';

export function readSessionCache(key, ttlMs) {
  if (!isBrowser()) return null;

  try {
    const rawValue = window.sessionStorage.getItem(key);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue);
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > ttlMs) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return parsed.data ?? null;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
}

export function writeSessionCache(key, data) {
  if (!isBrowser()) return;

  window.sessionStorage.setItem(
    key,
    JSON.stringify({
      timestamp: Date.now(),
      data,
    })
  );
}
