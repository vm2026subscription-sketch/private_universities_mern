import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Sends a GA4 `page_view` on the initial load AND on every React Router route
// change. The base gtag.js loader + config live in index.html with
// send_page_view:false, so this hook is the single source of page_views — no
// duplicates, no double-counting. No-ops safely if gtag hasn't loaded (e.g. an
// ad-blocker or offline), so it can never break navigation.
export default function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);
}
