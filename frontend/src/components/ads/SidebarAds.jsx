import { ArrowRight } from 'lucide-react';
import { useAdBanners, bannerClickUrl } from '../../hooks/useAdBanners';

// Sidebar advertisement stack, driven by admin ad banners (position = "sidebar").
// Renders nothing when no sidebar banners are scheduled.
export default function SidebarAds({ page = 'home', className = '' }) {
  const { banners } = useAdBanners('sidebar', page);

  if (!banners.length) return null;

  return (
    <aside className={`space-y-4 ${className}`}>
      {banners.map((b) => (
        <a
          key={b._id}
          href={bannerClickUrl(b._id)}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block relative rounded-2xl overflow-hidden border border-light-border dark:border-dark-border shadow-sm hover:shadow-lg transition-shadow group bg-white dark:bg-dark-card"
        >
          <span className="absolute top-2 right-2 z-10 text-[8px] font-bold uppercase tracking-widest text-white/90 bg-black/40 px-1.5 py-0.5 rounded">
            Ad
          </span>
          {b.imageUrl && (
            <img
              src={b.imageUrl}
              alt={b.title}
              className="w-full h-40 object-cover"
              loading="lazy"
            />
          )}
          {(b.title || b.subtitle || b.linkText) && (
            <div className="p-4">
              {b.title && (
                <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                  {b.title}
                </h4>
              )}
              {b.subtitle && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.subtitle}</p>
              )}
              {b.linkText && (
                <span className="mt-3 inline-flex items-center gap-1.5 text-link font-bold text-xs group-hover:gap-2.5 transition-all">
                  {b.linkText} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          )}
        </a>
      ))}
    </aside>
  );
}
