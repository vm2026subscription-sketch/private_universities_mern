import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../components/common/Seo';
import {
  MapPin,
  Globe,
  BookOpen,
  Clock,
  IndianRupee,
  ArrowRight,
  ExternalLink,
  Award,
  Search,
  Building2,
  Sparkles,
  X,
} from 'lucide-react';
import api from '../utils/api';
import { ListSkeleton } from '../components/common/LoadingSkeleton';
import UniversityLogo from '../components/common/UniversityLogo';
import { EmptyState } from '../components/ui';
import { readSessionCache, writeSessionCache } from '../utils/pageCache';

const typeCopy = {
  foreign: {
    badge: 'Foreign Universities',
    heading: 'Foreign Universities in India',
    description: 'International universities operating in India, ideal for students who want a global degree without leaving the country.',
    emptyTitle: 'No foreign universities found',
  },
  twinning: {
    badge: 'Twinning Programs',
    heading: 'Twinning Universities & Pathways',
    description: 'Programs designed for India-to-abroad pathways such as 2+2, 3+1, or collaborative international models.',
    emptyTitle: 'No twinning universities found',
  },
};

const countryLabel = (description = '') => {
  const value = String(description || '').toLowerCase();
  if (value.includes('united kingdom') || value.includes('uk')) return 'UK';
  if (value.includes('united states') || value.includes('usa') || value.includes('us')) return 'USA';
  if (value.includes('australia')) return 'AUS';
  if (value.includes('canada')) return 'CAN';
  if (value.includes('germany')) return 'DE';
  if (value.includes('france')) return 'FR';
  return 'Global';
};

const accentBySegment = {
  foreign: 'from-primary to-orange-400',
  twinning: 'from-slate-600 to-sky-500',
};
const FOREIGN_CACHE_TTL_MS = 10 * 60 * 1000;
const getForeignCacheKey = (segment) => `vm_foreign_catalog_${segment}_v1`;

const formatDisplayType = (university) => {
  if (university.segment === 'twinning' || university.type === 'twinning') return 'Twinning';
  return 'Foreign';
};

export default function ForeignUniversities() {
  const cachedForeign = readSessionCache(getForeignCacheKey('foreign'), FOREIGN_CACHE_TTL_MS) || [];
  const cachedTwinning = readSessionCache(getForeignCacheKey('twinning'), FOREIGN_CACHE_TTL_MS) || [];
  const [activeTab, setActiveTab] = useState('foreign');
  const [universitiesByType, setUniversitiesByType] = useState({ foreign: cachedForeign, twinning: cachedTwinning });
  const [loadingByType, setLoadingByType] = useState({ foreign: cachedForeign.length === 0, twinning: false });
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let active = true;

    const load = async (segment) => {
      const cachedSegmentData = readSessionCache(getForeignCacheKey(segment), FOREIGN_CACHE_TTL_MS) || [];
      if (cachedSegmentData.length === 0) {
        setLoadingByType((prev) => ({ ...prev, [segment]: true }));
      }
      try {
        const { data } = await api.get(`/universities?type=${segment}&limit=100`);
        if (!active) return;
        const nextUniversities = Array.isArray(data.data) ? data.data : [];
        setUniversitiesByType((prev) => ({ ...prev, [segment]: nextUniversities }));
        writeSessionCache(getForeignCacheKey(segment), nextUniversities);
      } catch {
        if (!active) return;
        if (cachedSegmentData.length === 0) {
          setUniversitiesByType((prev) => ({ ...prev, [segment]: [] }));
        }
      } finally {
        if (active) {
          setLoadingByType((prev) => ({ ...prev, [segment]: false }));
        }
      }
    };

    load('foreign');
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'twinning' && !loadingByType.twinning && !universitiesByType.twinning.length) {
      let active = true;

      const loadTwinning = async () => {
        setLoadingByType((prev) => ({ ...prev, twinning: true }));
        try {
          const { data } = await api.get('/universities?type=twinning&limit=100');
          if (!active) return;
          setUniversitiesByType((prev) => ({ ...prev, twinning: data.data || [] }));
        } catch {
          if (!active) return;
          setUniversitiesByType((prev) => ({ ...prev, twinning: [] }));
        } finally {
          if (active) {
            setLoadingByType((prev) => ({ ...prev, twinning: false }));
          }
        }
      };

      loadTwinning();
      return () => {
        active = false;
      };
    }
  }, [activeTab, loadingByType.twinning, universitiesByType.twinning.length]);

  const currentUniversities = universitiesByType[activeTab] || [];
  const loading = loadingByType[activeTab];
  const copy = typeCopy[activeTab];
  const indexedUniversities = useMemo(() => {
    return currentUniversities.map((university) => ({
      ...university,
      searchIndex: [
        university.name,
        university.city,
        university.state,
        university.description,
        ...(university.courses || []).map((course) => `${course.baseCourse || course.name} ${course.stream} ${course.category}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    }));
  }, [currentUniversities]);

  const filteredUniversities = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return indexedUniversities;

    return indexedUniversities.filter((university) => university.searchIndex.includes(query));
  }, [indexedUniversities, deferredSearch]);

  return (
    <div className="bg-[#f8fafc] dark:bg-dark-bg min-h-screen">
      <Seo
        title="Foreign & Twinning Universities in India | Vidyarthi Mitra"
        description="Explore foreign universities in India and twinning pathways managed directly through the Vidyarthi Mitra catalogue."
        path="/foreign-universities"
      />

      <div className="max-w-7xl mx-auto px-4 py-12 pb-28 md:pb-16 page-enter">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-full text-sm font-bold mb-5 border border-slate-100 dark:border-slate-500/20">
            <Globe className="w-4 h-4" />
            Study Abroad Options
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-slate-900 dark:text-white">
            Global Pathways,
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-light">Managed From One Catalogue</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-3xl mx-auto text-base leading-relaxed">
            Browse international institutions in India and admin-managed twinning pathways in one place. Your team can now control both from the same university workflow.
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-10">
          {Object.keys(typeCopy).map((segment) => (
            <button
              key={segment}
              onClick={() => setActiveTab(segment)}
              className={`px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border ${
                activeTab === segment
                  ? 'bg-slate-900 text-white shadow-xl border-slate-900'
                  : 'bg-white dark:bg-dark-card text-slate-400 hover:text-link border-slate-100 dark:border-white/5 shadow-sm'
              }`}
            >
              {typeCopy[segment].badge}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-10">
          <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Current Segment</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{copy.heading}</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Records Loaded</div>
            <div className="text-2xl font-bold text-link">{currentUniversities.length}</div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Search Catalogue</div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${activeTab} universities...`}
                className="input-field pl-11 pr-11 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-border"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
          <span>{filteredUniversities.length} results in {activeTab}</span>
          {search ? <span>Searching for "{deferredSearch.trim() || search}"</span> : null}
        </div>

        <div className="rounded-[2rem] bg-white dark:bg-dark-card border border-light-border dark:border-dark-border p-6 md:p-8 shadow-sm mb-10">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-link mt-0.5 shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{copy.heading}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{copy.description}</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {loading ? (
              <ListSkeleton count={4} />
            ) : filteredUniversities.length === 0 ? (
              <EmptyState
                icon={Globe}
                title={copy.emptyTitle}
                description="Try a different search or add records from the admin panel."
              />
            ) : (
              filteredUniversities.map((university, index) => {
                const courses = university.courses || [];
                const accent = accentBySegment[activeTab];
                const country = countryLabel(university.description || '');

                return (
                  <motion.div
                    key={university._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group"
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />

                    <div className="p-6 md:p-8 flex flex-col xl:flex-row gap-6 items-start border-b border-light-border dark:border-dark-border">
                      <div className="w-20 h-20 shrink-0 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-2xl flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                        <UniversityLogo logoUrl={university.logoUrl} name={university.name} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-500/10 text-slate-500 rounded-lg uppercase tracking-widest">
                            {country} {formatDisplayType(university)}
                          </span>
                          {university.naacGrade && (
                            <span className="px-2.5 py-1 text-[10px] font-bold bg-green-50 text-green-600 rounded-lg uppercase tracking-widest">
                              NAAC {university.naacGrade}
                            </span>
                          )}
                          {university.nirfRank && (
                            <span className="px-2.5 py-1 text-[10px] font-bold bg-orange-50 text-orange-600 rounded-lg uppercase tracking-widest">
                              NIRF #{university.nirfRank}
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                          {university.name}
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                          <MapPin className="w-4 h-4 text-link shrink-0" />
                          <span>{university.city !== 'Unknown' ? university.city : ''}{university.city && university.city !== 'Unknown' && university.state ? ', ' : ''}{university.state}</span>
                        </div>
                        {university.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                            {university.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-row xl:flex-col gap-3 shrink-0">
                        <Link to={`/universities/${university.slug}`} className="btn-primary gap-2 text-sm !px-4 !py-2.5">
                          View Profile <ArrowRight className="w-4 h-4" />
                        </Link>
                        {university.website && (
                          <a
                            href={university.website.startsWith('http') ? university.website : `https://${university.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline gap-2 text-sm !px-4 !py-2.5"
                          >
                            Visit Site <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="p-6 md:p-8">
                      <div className="grid gap-4 md:grid-cols-4 mb-6">
                        <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                            <BookOpen className="w-4 h-4 text-link" />
                            Courses
                          </div>
                          <div className="text-lg font-bold text-slate-900 dark:text-white">{courses.length}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                            <Building2 className="w-4 h-4 text-link" />
                            Segment
                          </div>
                          <div className="text-lg font-bold text-slate-900 dark:text-white capitalize">{formatDisplayType(university)}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                            <Award className="w-4 h-4 text-link" />
                            Avg Package
                          </div>
                          <div className="text-lg font-bold text-slate-900 dark:text-white">{university.stats?.avgPackageLPALabel ? `INR ${university.stats.avgPackageLPALabel} LPA` : university.stats?.avgPackageLPA ? `INR ${university.stats.avgPackageLPA} LPA` : 'N/A'}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                            <Globe className="w-4 h-4 text-link" />
                            Country Tag
                          </div>
                          <div className="text-lg font-bold text-slate-900 dark:text-white">{country}</div>
                        </div>
                      </div>

                      {courses.length > 0 ? (
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-link" />
                            Programs Offered
                          </h3>
                          <div className="grid gap-3 md:grid-cols-2">
                            {courses.slice(0, 6).map((course) => (
                              <div key={course._id} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2 leading-snug">
                                  {course.baseCourse || course.name}
                                </h4>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                                  {course.stream && (
                                    <span className="flex items-center gap-1">
                                      <Building2 className="w-3.5 h-3.5" />
                                      {course.stream}
                                    </span>
                                  )}
                                  {course.duration && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      {course.duration} yrs
                                    </span>
                                  )}
                                  {(course.feesPerYearLabel || course.feesPerYear) ? (
                                    <span className="flex items-center gap-1">
                                      <IndianRupee className="w-3.5 h-3.5" />
                                      {course.feesPerYearLabel || course.feesPerYear.toLocaleString('en-IN')}/yr
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Course details will appear here once your team uploads them from the admin panel.</p>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-16 text-center p-10 rounded-[2rem] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900/20 dark:to-blue-900/20 border border-slate-100 dark:border-slate-800/30">
          <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
            Need India-based options too?
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
            Explore private and deemed universities with structured course hierarchies and state-wise filters.
          </p>
          <Link to="/universities" className="btn-primary gap-2">
            <Globe className="w-4 h-4" />
            Browse Normal Universities
          </Link>
        </div>
      </div>
    </div>
  );
}
