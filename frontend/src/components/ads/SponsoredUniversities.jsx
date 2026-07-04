import { MapPin, ArrowRight, Gem, Star } from 'lucide-react';
import UniversityLogo from '../common/UniversityLogo';
import { useAdBanners, bannerClickUrl } from '../../hooks/useAdBanners';

// Featured Sponsored Universities section, driven by admin ad banners
// (position = "sponsored"). Each banner optionally references a University,
// whose details are populated by the API for richer cards.
export default function SponsoredUniversities({ page = 'home' }) {
  const { banners } = useAdBanners('sponsored', page);

  if (!banners.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="flex items-center gap-1.5 text-link font-bold text-xs uppercase tracking-[0.3em] mb-2">
            <Gem className="w-3.5 h-3.5" aria-hidden="true" /> Premium Admissions
          </p>
          <h2 className="text-2xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white">
            Featured University Partners
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {banners.map((b) => {
          const u = b.universityId || null;
          const name = b.title || u?.name || 'Featured University';
          const tier = u?.sponsorTier || 'Premium';
          return (
            <a
              key={b._id}
              href={bannerClickUrl(b._id)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="relative bg-gradient-to-br from-amber-500/5 to-transparent dark:from-amber-950/10 rounded-[2rem] p-6 border-2 border-amber-400/50 shadow-lg flex flex-col justify-between group overflow-hidden"
            >
              <span className="absolute top-4 right-4 text-[8px] font-bold uppercase tracking-widest text-amber-500/70">
                Ad
              </span>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 blur-[40px] rounded-full group-hover:scale-110 transition-transform" />

              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-md border border-slate-50 p-2 flex items-center justify-center overflow-hidden shrink-0">
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt={name} className="w-full h-full object-contain" />
                    ) : (
                      <UniversityLogo logoUrl={u?.logoUrl || u?.logo} name={name} />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1">
                      <Star className="w-3 h-3" aria-hidden="true" /> {tier} Partner
                    </span>
                    {u?.naacGrade && (
                      <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                        NAAC {u.naacGrade}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-link transition-colors">
                  {name}
                </h3>

                {b.subtitle && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{b.subtitle}</p>
                )}

                {u && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-link" />
                    {u.city && u.city !== 'Unknown'
                      ? `${u.city}, ${u.state || ''}`
                      : u.state || 'India'}
                  </div>
                )}
              </div>

              <div className="pt-5 mt-4 border-t border-amber-400/10">
                <span className="w-full py-3 bg-slate-900 dark:bg-white/10 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-md group-hover:bg-primary transition-colors">
                  {b.linkText || 'Apply Now'} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
