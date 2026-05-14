import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Globe, BookOpen, Clock, IndianRupee, ArrowRight, ExternalLink, Award } from 'lucide-react';
import api from '../utils/api';
import { ListSkeleton } from '../components/common/LoadingSkeleton';

// Country flag emojis
const countryFlag = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('united kingdom') || n.includes('uk')) return '🇬🇧';
  if (n.includes('united states') || n.includes('usa') || n.includes('us')) return '🇺🇸';
  if (n.includes('australia')) return '🇦🇺';
  if (n.includes('canada')) return '🇨🇦';
  if (n.includes('germany')) return '🇩🇪';
  if (n.includes('france')) return '🇫🇷';
  return '🌍';
};

// Country → accent color
const countryAccent = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('united kingdom') || n.includes('uk')) return 'from-blue-600 to-red-600';
  if (n.includes('united states') || n.includes('usa')) return 'from-blue-700 to-red-500';
  if (n.includes('australia')) return 'from-blue-500 to-yellow-400';
  if (n.includes('canada')) return 'from-red-600 to-red-400';
  return 'from-primary to-orange-400';
};

export default function ForeignUniversities() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/universities?type=foreign&limit=50`).then(async ({ data }) => {
      const unis = data.data || [];
      setUniversities(unis);
      const coursesMap = {};
      await Promise.all(unis.map(async (uni) => {
        try {
          const res = await api.get(`/courses?universityId=${uni._id}&limit=50`);
          coursesMap[uni._id] = res.data.data || [];
        } catch {
          coursesMap[uni._id] = [];
        }
      }));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 pb-28 md:pb-16 page-enter">

      {/* Hero Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full text-sm font-bold mb-5 border border-indigo-100 dark:border-indigo-500/20">
          <Globe className="w-4 h-4" />
          Study Abroad in India
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-slate-900 dark:text-white">
          World-Class Universities,<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-light to-accent">Right Here in India</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-base leading-relaxed">
          International universities have established campuses across India. Get a globally recognised degree without leaving the country.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-14">
        {[
          { label: 'International Universities', value: universities.length || '6+' },
          { label: 'Countries Represented', value: '3' },
          { label: 'UGC Approved', value: '100%' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-primary">{s.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* University Cards */}
      {loading ? (
        <ListSkeleton count={4} />
      ) : universities.length === 0 ? (
        <div className="text-center py-24">
          <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-600">No foreign universities found</h3>
        </div>
      ) : (
        <div className="space-y-6">
          {universities.map((uni, idx) => {
            const uniCourses = uni.courses || [];
            const flag = countryFlag(uni.description || '');
            const accent = countryAccent(uni.description || '');

            return (
              <motion.div
                key={uni._id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                {/* Top accent stripe */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />

                {/* Header */}
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start border-b border-light-border dark:border-dark-border">
                  {/* Logo */}
                  <div className="w-20 h-20 shrink-0 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-2xl flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                    {uni.logoUrl ? (
                      <img src={uni.logoUrl} alt={uni.name} className="max-w-full max-h-full object-contain" onError={e => { e.target.style.display='none'; }} />
                    ) : (
                      <span className="text-4xl">{flag}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 text-[10px] font-black bg-indigo-500/10 text-indigo-500 rounded-lg uppercase tracking-widest">
                        {flag} Foreign University
                      </span>
                      <span className="px-2.5 py-1 text-[10px] font-black bg-green-50 text-green-600 rounded-lg uppercase tracking-widest">
                        UGC Approved
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                      {uni.name}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span>{uni.city !== 'Unknown' ? uni.city : ''}{uni.city && uni.city !== 'Unknown' && uni.state ? ', ' : ''}{uni.state}</span>
                    </div>
                    {uni.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {uni.description}
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="flex flex-row md:flex-col gap-3 shrink-0">
                    <Link to={`/universities/${uni.slug}`} className="btn-primary gap-2 text-sm !px-4 !py-2.5">
                      View Profile <ArrowRight className="w-4 h-4" />
                    </Link>
                    {uni.links?.admissionLink && (
                      <a
                        href={uni.links.admissionLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline gap-2 text-sm !px-4 !py-2.5"
                      >
                        Apply Now <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Courses */}
                <div className="p-6 md:p-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Programs Offered {uniCourses.length > 0 && <span className="text-primary">({uniCourses.length})</span>}
                  </h3>

                  {uniCourses.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {uniCourses.map(course => (
                        <div key={course._id} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-primary/30 transition-colors">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2 leading-snug">{course.name}</h4>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            {course.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />{course.duration}
                              </span>
                            )}
                            {course.feesPerYear ? (
                              <span className="flex items-center gap-1">
                                <IndianRupee className="w-3.5 h-3.5" />{course.feesPerYear.toLocaleString('en-IN')}/yr
                              </span>
                            ) : (
                              <span className="text-slate-300">Fees on enquiry</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Course details coming soon. Visit the university profile for more info.</p>
                  )}

                  {/* Fees info if available */}
                  {uni.stats?.avgFees && (
                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4 text-orange-500" />
                      <span className="text-slate-500 dark:text-slate-400">Annual Tuition:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{uni.stats.avgFees}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CTA footer */}
      <div className="mt-16 text-center p-10 rounded-[2rem] bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/30">
        <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">
          Can't find what you're looking for?
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
          Explore 700+ Indian universities with state-wise filters, NAAC grades, and NIRF rankings.
        </p>
        <Link to="/universities" className="btn-primary gap-2">
          <Globe className="w-4 h-4" />
          Browse All Universities
        </Link>
      </div>
    </div>
  );
}
