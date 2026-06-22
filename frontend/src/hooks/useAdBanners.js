import { useEffect, useState } from 'react';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

// Build the click-tracking URL. Linking to this endpoint records a click and
// then 302-redirects to the banner's configured link.
export const bannerClickUrl = (id) => `${API_BASE}/banners/click/${id}`;

/**
 * Fetch active ad banners for a given placement.
 * Fetching also increments impressions server-side (fire-and-forget).
 *
 * @param {string} position - hero | sponsored | sidebar | footer | popup | ticker
 * @param {string} [page='home'] - the page key the banner is scoped to
 */
export function useAdBanners(position, page = 'home') {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get('/banners', { params: { position, page } })
      .then((res) => {
        if (active) setBanners(res.data?.data || []);
      })
      .catch(() => {
        if (active) setBanners([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [position, page]);

  return { banners, loading };
}
