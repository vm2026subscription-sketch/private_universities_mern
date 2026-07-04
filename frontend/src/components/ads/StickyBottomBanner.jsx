import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { useAdBanners, bannerClickUrl, bannerVideo } from '../../hooks/useAdBanners';

const DISMISS_KEY = 'vm_sticky_ad_dismissed';

// Sticky bottom advertisement banner, driven by admin ad banners
// (position = "footer"). Shows the highest-priority active banner, is
// dismissible for the session, and never overlaps the mobile nav on small screens.
export default function StickyBottomBanner({ page = 'home' }) {
  const { banners } = useAdBanners('footer', page);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1'
  );

  const banner = banners[0];
  if (!banner || dismissed) return null;

  const video = bannerVideo(banner);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore storage errors */
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="fixed bottom-20 md:bottom-0 inset-x-0 z-40 px-3 pb-3"
      >
        <div
          className="max-w-5xl mx-auto relative rounded-2xl shadow-lg border border-white/10 overflow-hidden flex items-center gap-4 pr-12 pl-4 py-3"
          style={{
            backgroundColor: banner.backgroundColor || '#0f172a',
            color: banner.textColor || '#ffffff',
          }}
        >
          {video ? (
            video.kind === 'embed' ? (
              <iframe
                src={video.src}
                title={banner.title || 'Sponsored video'}
                className="h-12 w-12 md:h-14 md:w-14 rounded-xl shrink-0 pointer-events-none"
                frameBorder="0"
                allow="autoplay; encrypted-media"
              />
            ) : (
              <video
                src={video.src}
                poster={banner.imageUrl || undefined}
                className="h-12 w-12 md:h-14 md:w-14 object-cover rounded-xl shrink-0"
                autoPlay
                muted
                loop
                playsInline
              />
            )
          ) : (
            banner.imageUrl && (
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="h-12 w-12 md:h-14 md:w-14 object-cover rounded-xl shrink-0"
                loading="lazy"
              />
            )
          )}
          <a
            href={bannerClickUrl(banner._id)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex-1 min-w-0 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">Ad</span>
              {banner.title && (
                <p className="font-bold text-sm md:text-base truncate">{banner.title}</p>
              )}
              {banner.subtitle && (
                <p className="text-xs opacity-80 truncate hidden sm:block">{banner.subtitle}</p>
              )}
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 bg-white text-slate-900 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow">
              {banner.linkText || 'View'} <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </a>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss advertisement"
            className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
