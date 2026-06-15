import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, BookOpen, GraduationCap, MapPin, Search, Filter, X, 
  ChevronRight, Award, Users, CheckCircle2, Sparkles, Building2, Star
} from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { readSessionCache, writeSessionCache } from '../utils/pageCache';

const ALL_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi NCR', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal'
];

const STREAMS_CACHE_KEY = 'vm_course_streams_v1';
const STREAMS_CACHE_TTL_MS = 10 * 60 * 1000;
const COURSE_RESULTS_CACHE_TTL_MS = 10 * 60 * 1000;
const getCourseResultsCacheKey = (suffix) => `vm_course_results_${suffix}`;
const formatCourseFee = (course) => {
  if (course?.feesPerYearLabel) return `Rs ${course.feesPerYearLabel}`;
  if (course?.feesPerYear) return `Rs ${Number(course.feesPerYear).toLocaleString('en-IN')}`;
  return '-';
};
const formatCourseSeats = (course) => course?.totalSeatsLabel || course?.totalSeats || '-';
const formatEligibility = (value) => {
  if (!value) return '-';
  return value.length > 30 ? `${value.substring(0, 30)}...` : value;
};

export default function Courses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'All';
  const selectedState = searchParams.get('state') || 'All';
  const selectedStream = searchParams.get('stream') || 'All';
  const selectedCourse = searchParams.get('course') || '';
  const selectedSpec = searchParams.get('specialization') || 'All';
  const universityId = searchParams.get('universityId');
  const universityName = searchParams.get('universityName');
  const cachedStreams = readSessionCache(STREAMS_CACHE_KEY, STREAMS_CACHE_TTL_MS) || [];
  
  const [courses, setCourses] = useState([]);
  const [streams, setStreams] = useState(cachedStreams);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(24);
  const deferredSearch = useDeferredValue(search);
  const deferredStateSearch = useDeferredValue(stateSearch);

  const normalizeText = (...values) =>
    values
      .flat()
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value).trim())
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

  // Fetch streams for the "Study Goal" section
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const { data } = await api.get('/courses/streams');
        if (data.success) {
          setStreams(data.data);
          writeSessionCache(STREAMS_CACHE_KEY, data.data);
        }
      } catch (error) {
        console.error('Failed to fetch streams:', error);
      }
    };
    fetchStreams();
  }, []);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        let queryParams = new URLSearchParams();
        if (selectedCategory !== 'All') queryParams.append('category', selectedCategory);
        if (selectedState !== 'All') queryParams.append('state', selectedState);
        if (selectedStream !== 'All') queryParams.append('stream', selectedStream);
        if (universityId) queryParams.append('universityId', universityId);
        const queryStringBase = queryParams.toString();
        const requestKey = selectedCourse
          ? getCourseResultsCacheKey(`list_${queryStringBase}&baseCourse=${encodeURIComponent(selectedCourse)}`)
          : getCourseResultsCacheKey(`grouped_${queryStringBase}`);
        const cachedData = readSessionCache(requestKey, COURSE_RESULTS_CACHE_TTL_MS);

        if (cachedData && active) {
          setCourses(cachedData.data || []);
          setTotalCount(cachedData.total || cachedData.data?.length || 0);
          setLoading(false);
        } else {
          setLoading(true);
        }

        if (selectedCourse) {
          // Fetch specific colleges for the selected base course
          queryParams.append('baseCourse', selectedCourse);
          queryParams.append('limit', '100');
          const { data } = await api.get(`/courses?${queryParams.toString()}`);
          if (active) {
            const nextCourses = data.data || [];
            const nextTotal = data.pagination?.total || nextCourses.length;
            setCourses(nextCourses);
            setTotalCount(nextTotal);
            writeSessionCache(requestKey, { data: nextCourses, total: nextTotal });
          }
        } else {
          // Fetch high-performance grouped courses
          const { data } = await api.get(`/courses/grouped?${queryParams.toString()}`);
          if (active) {
            const nextCourses = data.data || [];
            const nextTotal = nextCourses.length || 0;
            setCourses(nextCourses);
            setTotalCount(nextTotal);
            writeSessionCache(requestKey, { data: nextCourses, total: nextTotal });
          }
        }
      } catch {
        if (active) setCourses([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, [selectedCategory, universityId, selectedState, selectedCourse, selectedStream]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(24);
  }, [selectedCategory, selectedState, selectedStream, search, selectedCourse, selectedSpec]);

  // Grouped results are already coming from the backend now
  const courseGroups = useMemo(() => {
    if (selectedCourse) return [];
    return courses
      .filter((course) => course && course.name && course.name.trim() !== '' && (course.category || course.stream))
      .map((course, index) => ({
        ...course,
        _id: course._id || `${course.name}-${course.category || 'misc'}-${index}`,
        name: course.name.trim(),
        category: course.category || 'Others',
        stream: course.stream || 'Others',
        normName: normalizeText(course.name),
        searchIndex: normalizeText(course.name, course.category, course.stream, course.specializations),
      }));
  }, [courses, selectedCourse]);

  const filteredCourseGroups = useMemo(() => {
    let filtered = courseGroups;

    // Filter by specialization if active
    if (selectedSpec !== 'All') {
      filtered = filtered.filter(group => 
        group.specializations?.includes(selectedSpec) || 
        group.specializationName === selectedSpec
      );
    }

    const query = normalizeText(deferredSearch);
    if (!query) return filtered;
    const terms = query.split(' ').filter(Boolean);
    return filtered.filter((group) => terms.every(t => group.searchIndex.includes(t)));
  }, [courseGroups, deferredSearch, selectedSpec]);

  const visibleCourseGroups = useMemo(() => {
    return filteredCourseGroups.slice(0, visibleCount);
  }, [filteredCourseGroups, visibleCount]);

  const handleStateChange = (state) => {
    const params = new URLSearchParams(searchParams);
    if (state === 'All') params.delete('state');
    else params.set('state', state);
    setSearchParams(params);
  };

  const handleCategoryChange = (cat) => {
    const params = new URLSearchParams(searchParams);
    if (cat === 'All') params.delete('category');
    else params.set('category', cat);
    setSearchParams(params);
  };

  const handleStreamChange = (stream) => {
    const params = new URLSearchParams(searchParams);
    // Clear stale course/category/specialization params when switching streams
    params.delete('course');
    params.delete('category');
    params.delete('specialization');
    if (stream === 'All') params.delete('stream');
    else params.set('stream', stream);
    setSearchParams(params);
  };

  const handleSpecChange = (spec) => {
    const params = new URLSearchParams(searchParams);
    if (spec === 'All') params.delete('specialization');
    else params.set('specialization', spec);
    setSearchParams(params);
  };

  const availableSpecs = useMemo(() => {
    if (!selectedCourse && selectedCategory === 'All') return [];
    const specs = new Set();
    courses.forEach(c => {
      if (c.specializationName && c.specializationName !== 'General') {
        specs.add(c.specializationName);
      }
    });
    return Array.from(specs).sort();
  }, [courses, selectedCourse, selectedCategory]);

  const filteredColleges = useMemo(() => {
    if (!selectedCourse) return [];
    let filtered = courses;
    
    if (selectedSpec !== 'All') {
      filtered = filtered.filter(c => c.specializationName === selectedSpec);
    }

    const query = normalizeText(deferredSearch);
    if (!query) return filtered;
    const terms = query.split(' ').filter(Boolean);
    return filtered.filter((course) => {
      const searchIndex = normalizeText(
        course.universityId?.name,
        course.universityId?.city,
        course.universityId?.state,
        course.specializationName,
        course.name
      );
      return terms.every(t => searchIndex.includes(t));
    });
  }, [courses, selectedCourse, deferredSearch, selectedSpec]);

  const visibleColleges = useMemo(() => filteredColleges.slice(0, visibleCount), [filteredColleges, visibleCount]);

  const filteredStates = useMemo(() => {
    const query = deferredStateSearch.trim().toLowerCase();
    if (!query) return ALL_STATES;
    return ALL_STATES.filter((state) => state.toLowerCase().includes(query));
  }, [deferredStateSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <Helmet>
        <title>Courses in India | UG PG PhD Diploma | VidyarthiMitra</title>
        <meta name="description" content="Browse 10,000+ courses across engineering, management, medical, law, design and more. Find fees, seats, entrance exams and eligibility." />
      </Helmet>
      {/* Professional Compact Hero */}
      <div className="relative mb-6 shrink-0 rounded-[3rem] overflow-hidden bg-slate-900 text-white shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-indigo-500/20" />
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        
        <div className="relative px-8 py-12 md:px-16 md:py-16 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="max-w-xl space-y-6 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl text-white/80 text-[10px] font-black uppercase tracking-[0.3em] border border-white/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Institutional Course Directory
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-serif font-black leading-tight tracking-tight"
            >
              Explore Your <span className="text-primary italic">Potential.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base md:text-lg text-white/50 font-medium leading-relaxed"
            >
              Discover {totalCount.toLocaleString()}+ verified academic programs from India's most prestigious universities.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full lg:w-[500px]"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-indigo-500 rounded-[2rem] blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
              <div className="relative flex items-center bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] overflow-hidden shadow-2xl">
                <Search className="w-6 h-6 ml-8 text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by degree, stream or keyword..."
                  className="w-full pl-5 pr-14 py-7 bg-transparent border-none outline-none text-xl text-white font-bold placeholder:text-white/20"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="mr-4 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {(universityName || selectedStream !== 'All' || selectedCourse) && (
              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete('universityId');
                  params.delete('universityName');
                  params.delete('stream');
                  params.delete('course');
                  setSearchParams(params);
                }} 
                className="mt-4 mx-auto lg:ml-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-primary transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Reset active filters
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 items-start flex-1">
        {/* Advanced Sidebar Filter */}
        <aside className={`${showFilters ? 'fixed inset-0 z-[150] bg-white dark:bg-dark-bg p-6 overflow-y-auto' : 'hidden'} lg:block lg:w-80 shrink-0 lg:sticky lg:top-24 lg:h-[calc(100vh-120px)] lg:overflow-y-auto custom-scrollbar`}>
          <div className="space-y-6 pb-10 lg:pb-4">
            {/* Mobile Close Button */}
            {showFilters && (
              <div className="flex items-center justify-between mb-8 lg:hidden">
                <h3 className="text-xl font-black">Filters</h3>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-border flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Stream/Goal Selection */}
            <div className="bg-slate-50/50 dark:bg-dark-card/50 backdrop-blur-xl p-7 rounded-[2.5rem] border border-slate-200/60 dark:border-dark-border shadow-sm">
              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-primary" /> Academic Stream
              </h4>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <button 
                  onClick={() => {
                    handleStreamChange('All');
                    if(showFilters) setShowFilters(false);
                  }}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[13px] font-black transition-all ${selectedStream === 'All' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white dark:bg-dark-bg hover:bg-slate-100 text-slate-500 dark:text-dark-muted dark:hover:bg-dark-border border border-slate-100 dark:border-transparent'}`}
                >
                  All Streams <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
                {streams.map((s) => (
                  <button 
                    key={s.stream}
                    onClick={() => {
                      handleStreamChange(s.stream);
                      if(showFilters) setShowFilters(false);
                    }}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[13px] font-black transition-all ${selectedStream === s.stream ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white dark:bg-dark-bg hover:bg-slate-100 text-slate-500 dark:text-dark-muted dark:hover:bg-dark-border border border-slate-100 dark:border-transparent'}`}
                  >
                    <span className="truncate">{s.stream}</span>
                    <span className={`text-[10px] ${selectedStream === s.stream ? 'text-white/70' : 'text-slate-400'}`}>{s.collegeCount}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* State Filter */}
            <div className="bg-slate-50/50 dark:bg-dark-card/50 backdrop-blur-xl p-7 rounded-[2.5rem] border border-slate-200/60 dark:border-dark-border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-primary" /> State / Region
                </h4>
                <div className="px-3 py-1 rounded-full bg-white dark:bg-dark-border text-[9px] font-black text-slate-400 shadow-sm">
                  {selectedState === 'All' ? '37 Regions' : '1 Active'}
                </div>
              </div>
              
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search state..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-dark-bg rounded-xl text-[11px] font-bold border border-slate-100 dark:border-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <button 
                  onClick={() => {
                    handleStateChange('All');
                    if(showFilters) setShowFilters(false);
                  }}
                  className={`state-item w-full text-left px-5 py-3 rounded-xl text-[12px] font-bold transition-all ${selectedState === 'All' ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 text-slate-400 dark:hover:bg-dark-border'}`}
                >
                  All Regions
                </button>
                {filteredStates.map((state) => (
                  <button 
                    key={state}
                    onClick={() => {
                      handleStateChange(state);
                      if(showFilters) setShowFilters(false);
                    }}
                    className={`state-item w-full text-left px-5 py-3 rounded-xl text-[12px] font-bold transition-all ${selectedState === state ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 text-slate-400 dark:hover:bg-dark-border'}`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="bg-slate-50/50 dark:bg-dark-card/50 backdrop-blur-xl p-7 rounded-[2.5rem] border border-slate-200/60 dark:border-dark-border shadow-sm">
              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2.5">
                <GraduationCap className="w-4 h-4 text-primary" /> Degree Level
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {['All', 'UG', 'PG', 'Diploma', 'PhD'].map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => {
                      handleCategoryChange(cat);
                      if(showFilters) setShowFilters(false);
                    }}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-[13px] font-black transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 dark:bg-primary' : 'bg-white dark:bg-dark-bg hover:bg-slate-100 text-slate-500 dark:text-dark-muted dark:hover:bg-dark-border border border-slate-100 dark:border-transparent'}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${selectedCategory === cat ? 'bg-primary dark:bg-white' : 'bg-slate-200 dark:bg-dark-border'}`} />
                    {cat === 'UG' ? 'Undergraduate' : cat === 'PG' ? 'Postgraduate' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Content Area */}
        <div className="flex-1 w-full pb-20">
          {(selectedCourse || selectedCategory !== 'All') ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-10 p-10 rounded-[3rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden group shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-700">
                {selectedCourse ? <BookOpen className="w-48 h-48" /> : <GraduationCap className="w-48 h-48" />}
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">
                    {selectedCourse ? 'Degree Profile' : `${selectedCategory} Directory`}
                  </span>
                  <h2 className="text-4xl md:text-5xl font-serif font-black">
                    {selectedCourse || (selectedCategory === 'UG' ? 'Undergraduate' : selectedCategory === 'PG' ? 'Postgraduate' : selectedCategory)}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-white/50 text-xs font-bold pt-2">
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      <Building2 className="w-3.5 h-3.5" /> {selectedCourse ? courses.length : filteredCourseGroups.length} {selectedCourse ? 'Institutions' : 'Programs'}
                    </span>
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {availableSpecs.length} Specializations
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('course');
                    params.delete('category');
                    params.delete('specialization');
                    setSearchParams(params);
                  }} 
                  className="px-8 py-4 bg-white text-slate-900 rounded-[1.25rem] font-black text-xs transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-xl"
                >
                  <ArrowLeft className="w-4 h-4" /> RESET FILTERS
                </button>
              </div>

              {/* Sub-Filter for Specializations */}
              {availableSpecs.length > 0 && (
                <div className="relative z-10 mt-12 pt-8 border-t border-white/10">
                   <div className="flex items-center justify-between mb-4">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Browse by Specialization</h4>
                     {selectedSpec !== 'All' && (
                       <button onClick={() => handleSpecChange('All')} className="text-[10px] font-black text-white/30 hover:text-white underline">Clear Selection</button>
                     )}
                   </div>
                   <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                     <button 
                       onClick={() => handleSpecChange('All')}
                       className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${selectedSpec === 'All' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                     >
                       All Specs
                     </button>
                     {availableSpecs.map(spec => (
                       <button 
                         key={spec}
                         onClick={() => handleSpecChange(spec)}
                         className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${selectedSpec === spec ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                       >
                         {spec}
                       </button>
                     ))}
                   </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                <h2 className="text-2xl font-serif font-black text-slate-800 dark:text-white">
                  {selectedStream !== 'All' ? selectedStream : 'Academic Programs'}
                </h2>
                <div className="h-px w-24 bg-slate-200 dark:bg-dark-border hidden md:block" />
                <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-[11px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {totalCount} RESULTS
                </div>
                {search ? (
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Searching for "{deferredSearch || search}"
                  </div>
                ) : null}
              </div>
              
              <button 
                onClick={() => setShowFilters(true)}
                className="lg:hidden flex items-center gap-3 px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                <Filter className="w-4 h-4" /> FILTERS
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="space-y-16">
              {filteredCourseGroups.length === 0 && !selectedCourse && (
                <div className="py-32 text-center bg-white dark:bg-dark-card rounded-[3rem] border-2 border-dashed border-light-border dark:border-dark-border">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-dark-border rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-3xl font-black mb-2 text-slate-400">No Courses Found</h3>
                  <p className="text-light-muted font-bold max-w-md mx-auto mb-8">We couldn't find any courses matching your current filters.</p>
                  <button onClick={() => { handleStreamChange('All'); handleCategoryChange('All'); setSearch(''); }} className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20">Reset Filters</button>
                </div>
              )}

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {(selectedCourse ? visibleColleges : visibleCourseGroups).map((item, idx) => (
                    <motion.div
                      layout
                      key={item._id || item.normName || `${item.name || 'item'}-${idx}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3) }}
                      className="group bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300 overflow-hidden"
                    >
                      {selectedCourse ? (
                        /* ── HIGH FIDELITY COLLEGE CARD ── */
                        <div className="flex flex-col lg:flex-row relative">
                          {/* NIRF Rank Stripe / Badge */}
                          {item.universityId?.nirfRank && (
                            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black tracking-wider shadow-md">
                              <Award className="w-3.5 h-3.5" /> NIRF #{item.universityId.nirfRank}
                            </div>
                          )}

                          {/* Logo + Rating Left Stripe */}
                          <div className="lg:w-48 shrink-0 bg-slate-50/60 dark:from-dark-border/20 dark:to-dark-border/5 flex flex-col items-center justify-center p-6 gap-4 border-b lg:border-b-0 lg:border-r border-light-border dark:border-dark-border">
                            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border flex items-center justify-center shadow-sm p-2 overflow-hidden transform group-hover:scale-105 transition-transform duration-300">
                              {item.universityId?.logoUrl ? (
                                <img src={item.universityId.logoUrl} alt={item.universityId?.name} className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-3xl font-black text-primary">{item.universityId?.name?.[0] || '?'}</span>
                              )}
                            </div>
                            
                            {/* Stars rating mockup */}
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1 text-amber-500 font-black text-xs">
                                <Star className="w-3.5 h-3.5 fill-amber-500" />
                                <span>{item.universityId?.stats?.rating || '4.6'} / 5</span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">VidyarthiMitra Verified</span>
                            </div>
                          </div>

                          {/* Main Detailed Content */}
                          <div className="flex-1 p-6 flex flex-col justify-between gap-4">
                            <div>
                              {/* Pill Badges */}
                              <div className="flex flex-wrap gap-1.5 mb-2.5">
                                {item.category && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">{item.category}</span>
                                )}
                                {item.specializationName && item.specializationName !== 'General' && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">{item.specializationName}</span>
                                )}
                                {item.universityId?.naacGrade && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-800">NAAC Grade {item.universityId.naacGrade}</span>
                                )}
                              </div>

                              <h3
                                onClick={() => { const r = item.universityId?.slug || item.universityId?._id; if (r) navigate(`/universities/${r}`, { state: { activeTab: 1 } }); }}
                                className="text-lg md:text-xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors cursor-pointer leading-snug line-clamp-2"
                              >
                                {item.universityId?.name}
                              </h3>

                              <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mt-2">
                                <MapPin className="w-4 h-4 text-primary shrink-0" />
                                {item.universityId?.city}{item.universityId?.state ? `, ${item.universityId.state}` : ''}
                              </p>
                            </div>

                            {/* Structured Grid Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-slate-100 dark:border-dark-border/60">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</span>
                                <span className="text-[13px] font-black text-slate-800 dark:text-slate-200 mt-1">{item.duration ? `${item.duration} Years` : 'N/A'}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg. Fees</span>
                                <span className="text-[13px] font-black text-primary mt-1">{formatCourseFee(item)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg. Placement</span>
                                <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                  {item.universityId?.stats?.averagePackage ? `₹ ${item.universityId.stats.averagePackage} LPA` : '₹ 6.2 LPA'}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Seats</span>
                                <span className="text-[13px] font-black text-slate-800 dark:text-slate-200 mt-1">{formatCourseSeats(item)}</span>
                              </div>
                            </div>

                            {/* Footer info: Exams + CTA */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-400 font-bold mr-1">Exams:</span>
                                {(item.entranceExams || []).length > 0 ? (
                                  item.entranceExams.slice(0, 3).map(exam => (
                                    <span key={exam} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] font-black border border-amber-200 dark:border-amber-900">{exam}</span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-semibold bg-slate-50 dark:bg-dark-border px-2 py-0.5 rounded-md">Direct Admission</span>
                                )}
                              </div>

                              <button
                                onClick={() => { const r = item.universityId?.slug || item.universityId?._id; if (r) navigate(`/universities/${r}`, { state: { activeTab: 1 } }); }}
                                className="shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl font-black text-[11px] uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all shadow-lg shadow-primary/20"
                              >
                                View Details <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* ── PREMIUM COURSE GROUP CARD ── */
                        <div
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 cursor-pointer hover:bg-slate-50/40 dark:hover:bg-dark-border/20 transition-colors"
                          onClick={() => { const params = new URLSearchParams(searchParams); params.set('course', item.name || ''); setSearchParams(params); }}
                        >
                          {/* Left Icon Panel */}
                          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                            <GraduationCap className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                          </div>

                          {/* Center info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider">{item.category || 'UG/PG'}</span>
                              {item.stream && <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider">{item.stream}</span>}
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors truncate">{item.name}</h3>
                            <div className="flex flex-wrap gap-4 mt-2">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-slate-400" /> {item.collegeCount || 0} Colleges in India
                              </span>
                              {item.specializations?.length > 0 && (
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                  <Award className="w-4 h-4 text-amber-500" /> {item.specializations.length} Specializations
                                </span>
                              )}
                            </div>

                            {/* Tags preview */}
                            {item.specializations?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {item.specializations.slice(0, 5).map(spec => (
                                  <span key={spec} className="px-2.5 py-0.5 rounded-lg bg-slate-50 dark:bg-dark-border/50 text-slate-500 dark:text-dark-muted text-[10px] font-bold border border-slate-100 dark:border-dark-border">{spec}</span>
                                ))}
                                {item.specializations.length > 5 && (
                                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-50 dark:bg-dark-border/50 text-primary text-[10px] font-black">+{item.specializations.length - 5} more</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right Arrow */}
                          <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-50 dark:bg-dark-border/50 group-hover:bg-primary flex items-center justify-center transition-all duration-300 self-center">
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {((!selectedCourse && visibleCourseGroups.length < filteredCourseGroups.length) || (selectedCourse && visibleColleges.length < filteredColleges.length)) && (
                <div className="py-20 text-center">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVisibleCount((prev) => prev + 24)}
                    className="px-16 py-5 bg-white dark:bg-dark-card border-2 border-primary text-primary rounded-[2rem] font-black text-sm tracking-widest shadow-2xl shadow-primary/10 hover:bg-primary hover:text-white transition-all duration-300"
                  >
                    {selectedCourse ? 'LOAD MORE UNIVERSITIES' : 'LOAD MORE PROGRAMS'}
                  </motion.button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
