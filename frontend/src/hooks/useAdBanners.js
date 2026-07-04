import { useEffect, useState } from 'react';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

// Build the click-tracking URL. Linking to this endpoint records a click and
// then 302-redirects to the banner's configured link.
export const bannerClickUrl = (id) => `${API_BASE}/banners/click/${id}`;

// Interpret a banner's videoUrl for rendering.
// Returns null when the banner is not a playable video, otherwise:
//   { kind: 'file',  src }  -> render a native <video> (autoplay muted loop)
//   { kind: 'embed', src }  -> render an <iframe> (YouTube / Vimeo, muted autoplay)
export function bannerVideo(banner) {
  if (!banner || banner.mediaType !== 'video' || !banner.videoUrl) return null;
  const url = banner.videoUrl.trim();

  // YouTube: youtu.be/ID, watch?v=ID, /embed/ID, /shorts/ID
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  if (yt) {
    const id = yt[1];
    return {
      kind: 'embed',
      src: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0&playsinline=1`,
    };
  }

  // Vimeo: vimeo.com/ID
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    return {
      kind: 'embed',
      src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1&background=1`,
    };
  }

  // Direct video file (.mp4 / .webm / .ogg), including query-string variants.
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
    return { kind: 'file', src: url };
  }

  // Unknown host — treat as a direct file and let the browser try.
  return { kind: 'file', src: url };
}

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
