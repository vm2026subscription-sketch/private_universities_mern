import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, FileCheck2, Landmark, Search, Globe, MapPin, CheckCircle2, X } from 'lucide-react';
import Seo from '../components/common/Seo';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { readSessionCache, writeSessionCache } from '../utils/pageCache';
import { EmptyState } from '../components/ui';

const CATEGORY_LABELS = ['all', 'engineering', 'medical', 'management', 'law', 'others'];
const EXAMS_CACHE_KEY = 'vm_exams_catalog_v1';
const EXAMS_CACHE_TTL_MS = 10 * 60 * 1000;

export default function Exams() {
  const cachedExams = readSessionCache(EXAMS_CACHE_KEY, EXAMS_CACHE_TTL_MS) || [];
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedScope, setSelectedScope] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [search, setSearch] = useState('');
  const [exams, setExams] = useState(cachedExams);
  const [loading, setLoading] = useState(cachedExams.length === 0);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let active = true;

    const loadExams = async () => {
      if (cachedExams.length === 0) {
        setLoading(true);
      }
      try {
        const { data } = await api.get('/exams');
        if (!active) return;
        const nextExams = Array.isArray(data.data) ? data.data : [];
        setExams(nextExams);
        writeSessionCache(EXAMS_CACHE_KEY, nextExams);
      } catch {
        if (active && cachedExams.length === 0) setExams([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadExams();
    return () => {
      active = false;
    };
  }, []);

  const indexedExams = useMemo(() => {
    return exams.map((exam) => ({
      ...exam,
      searchIndex: [
        exam.name,
        exam.shortName,
        exam.conductingBody,
        exam.category,
        exam.eligibility,
        exam.state,
        ...(Array.isArray(exam.courses) ? exam.courses : []),
        ...(Array.isArray(exam.highlights) ? exam.highlights : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    }));
  }, [exams]);

  const statesList = useMemo(() => {
    const statesSet = new Set();
    indexedExams.forEach((exam) => {
      if (exam.scope === 'state' && exam.state) {
        statesSet.add(exam.state);
      }
    });
    return ['All States', ...Array.from(statesSet).sort()];
  }, [indexedExams]);

  const filteredExams = useMemo(() => {
    let list = indexedExams;

    if (selectedCategory !== 'all') {
      list = list.filter((exam) => exam.category === selectedCategory);
    }

    if (selectedScope !== 'all') {
      list = list.filter((exam) => exam.scope === selectedScope);
    }

    if (selectedState !== 'all') {
      list = list.filter((exam) => exam.state === selectedState);
    }

    const query = deferredSearch.trim().toLowerCase();
    if (query) {
      list = list.filter((exam) => exam.searchIndex.includes(query));
    }

    return list;
  }, [indexedExams, selectedCategory, selectedScope, selectedState, deferredSearch]);

  const handleScopeChange = (scope) => {
    setSelectedScope(scope);
    if (scope !== 'state') {
      setSelectedState('all');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-20 md:pb-12">
      <Seo
        title="Entrance Exams 2026 | JEE, NEET, MHT-CET, CAT & More | Vidyarthi Mitra"
        description="Complete list of entrance exams for engineering, medical, management and law in India. Get exam dates, eligibility, syllabus and registration details."
        path="/exams"
      />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-10">
        <div>
          <span className="badge badge-orange mb-4 inline-flex">Exam Updates</span>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3 text-link">Entrance Exams Directory</h1>
          <p className="text-light-muted dark:text-dark-muted max-w-2xl">
            Find and track central national exams and state-wise entrance tests for private universities across India.
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search exam, state, body..."
            className="w-full rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card pl-11 pr-11 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-light-muted dark:text-dark-muted hover:bg-white/80 dark:hover:bg-dark-border"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
        <span>{filteredExams.length} exams match your filters</span>
        {search ? <span>Searching for "{deferredSearch.trim() || search}"</span> : null}
      </div>

      {/* Primary Category Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {CATEGORY_LABELS.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-white'
                : 'bg-light-card dark:bg-dark-card hover:bg-primary-50 dark:hover:bg-dark-border'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Scope and State Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-2xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-light-muted dark:text-dark-muted">Exam Scope:</span>
          <div className="flex gap-2">
            {['all', 'national', 'state', 'university'].map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => handleScopeChange(scope)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  selectedScope === scope
                    ? 'bg-primary/10 text-link border border-primary/20'
                    : 'bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border hover:bg-light-border'
                }`}
              >
                {scope === 'all' ? 'All Levels' : scope === 'university' ? 'University specific' : `${scope} level`}
              </button>
            ))}
          </div>
        </div>

        {selectedScope === 'state' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-light-muted dark:text-dark-muted">Select State:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card px-3 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
            >
              {statesList.map((state) => (
                <option key={state} value={state === 'All States' ? 'all' : state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <CardSkeleton count={6} />
      ) : filteredExams.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No exams found"
          description="Try adjusting your category, scope, or state filters."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredExams.map((exam) => (
            <div key={exam._id} className="card p-6 flex flex-col justify-between border border-light-border dark:border-dark-border hover:shadow-lg transition-shadow">
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {exam.shortName ? <span className="badge badge-blue">{exam.shortName}</span> : null}
                      <span className="badge badge-orange capitalize">{exam.category || 'others'}</span>
                      <span className={`badge inline-flex items-center gap-1 text-xs font-semibold ${
                        exam.scope === 'national' 
                          ? 'badge-blue' 
                          : exam.scope === 'state' 
                            ? 'badge-green' 
                            : 'badge-orange'
                      }`}>
                        {exam.scope === 'national' && (
                          <>
                            <Globe className="w-3 h-3" /> National
                          </>
                        )}
                        {exam.scope === 'state' && (
                          <>
                            <MapPin className="w-3 h-3" /> {exam.state || 'State Level'}
                          </>
                        )}
                        {exam.scope === 'university' && (
                          <>
                            <Landmark className="w-3 h-3" /> University Specific
                          </>
                        )}
                      </span>
                    </div>
                    <h2 className="text-xl font-serif font-bold text-link">{exam.name}</h2>
                  </div>
                  {exam.officialUrl ? (
                    <a href={exam.officialUrl} target="_blank" rel="noreferrer" className="text-link hover:underline text-sm inline-flex items-center gap-1 font-semibold">
                      Apply <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : null}
                </div>

                <div className="space-y-3 text-sm mb-5">
                  <p className="flex items-center gap-2 text-light-muted dark:text-dark-muted">
                    <Landmark className="w-4 h-4 text-link" />
                    <span className="text-light-text dark:text-dark-text">{exam.conductingBody || 'Conducting body not listed'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-light-muted dark:text-dark-muted">
                    <CalendarDays className="w-4 h-4 text-link" />
                    Exam Date: <span className="text-light-text dark:text-dark-text font-medium">{exam.examDate ? new Date(exam.examDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'TBA'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-light-muted dark:text-dark-muted">
                    <FileCheck2 className="w-4 h-4 text-link" />
                    Registration Deadline: <span className="text-light-text dark:text-dark-text font-medium">{exam.registrationDeadline ? new Date(exam.registrationDeadline).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'TBA'}</span>
                  </p>
                </div>

                {exam.courses && exam.courses.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider mb-2">Courses Offered</p>
                    <div className="flex flex-wrap gap-1.5">
                      {exam.courses.map((course, index) => (
                        <span key={index} className="px-2.5 py-1 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-xs font-semibold text-link">
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {exam.highlights && exam.highlights.length > 0 && (
                  <div className="mb-5 p-4 rounded-2xl bg-primary-50/50 dark:bg-dark-border/40 border border-primary-50 dark:border-dark-border/30">
                    <p className="text-xs font-bold text-link uppercase tracking-wider mb-2">Key Highlights</p>
                    <ul className="space-y-1.5">
                      {exam.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-light-muted dark:text-dark-muted">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <div className="p-4 rounded-2xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border">
                  <p className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider mb-1">Eligibility Criteria</p>
                  <p className="text-sm text-light-text dark:text-dark-text">{exam.eligibility || 'Check official brochure for detailed eligibility.'}</p>
                </div>

                {exam.participatingUniversities ? (
                  <p className="mt-4 text-xs text-light-muted dark:text-dark-muted font-medium flex justify-between items-center">
                    <span>Participating Institutions:</span>
                    <span className="text-sm font-bold text-link">{exam.participatingUniversities}+ {exam.scope === 'university' ? 'Campuses' : 'Universities'}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
