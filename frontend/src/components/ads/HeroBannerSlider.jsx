import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useAdBanners, bannerClickUrl, bannerVideo } from '../../hooks/useAdBanners';

// Homepage hero banner slider. Driven entirely by admin ad banners
// (position = "hero"). Renders nothing when no hero banners are scheduled,
// so the page's static hero remains as a fallback.
export default function HeroBannerSlider({ page = 'home', interval = 6000 }) {
  const { banners } = useAdBanners('hero', page);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, interval);
    return () => clearInterval(id);
  }, [banners.length, interval]);

  if (!banners.length) return null;

  const safeIndex = index % banners.length;
  const banner = banners[safeIndex];
  const video = bannerVideo(banner);
  const go = (dir) =>
    setIndex((i) => (i + dir + banners.length) % banners.length);

  return (
    <section className="max-w-7xl mx-auto px-4 pt-6">
      <div className="relative overflow-hidden rounded-[2rem] shadow-lg group">
        <AnimatePresence mode="wait">
          <motion.a
            key={banner._id}
            href={bannerClickUrl(banner._id)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="block relative"
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
                  className="w-full h-56 md:h-80 pointer-events-none"
                  frameBorder="0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={video.src}
                  poster={banner.imageUrl || undefined}
                  className="w-full h-56 md:h-80 object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              )
            ) : banner.imageUrl ? (
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-56 md:h-80 object-cover"
                loading="eager"
              />
            ) : (
              <div className="w-full h-56 md:h-80" />
            )}

            {(banner.title || banner.subtitle || banner.linkText) && (
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent flex flex-col justify-center p-6 md:p-12">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300 mb-2">
                  Sponsored
                </span>
                {banner.title && (
                  <h2 className="text-2xl md:text-4xl font-serif font-bold max-w-2xl drop-shadow-lg">
                    {banner.title}
                  </h2>
                )}
                {banner.subtitle && (
                  <p className="mt-2 text-sm md:text-lg max-w-xl opacity-90 drop-shadow">
                    {banner.subtitle}
                  </p>
                )}
                {banner.linkText && (
                  <span className="mt-5 inline-flex items-center gap-2 w-fit bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg">
                    {banner.linkText} <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            )}
          </motion.a>
        </AnimatePresence>

        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous banner"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next banner"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {banners.map((b, i) => (
                <button
                  key={b._id}
                  type="button"
                  aria-label={`Go to banner ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === safeIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
