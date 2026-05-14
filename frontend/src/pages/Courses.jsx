import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, BookOpen, GraduationCap, MapPin, Search, Filter, X, 
  ChevronRight, Award, Users, CheckCircle2, Sparkles, Building2
} from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';

const ALL_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi NCR', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal'
];

export default function Courses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'All';
  const selectedState = searchParams.get('state') || 'All';
  const selectedStream = searchParams.get('stream') || 'All';
  const selectedCourse = searchParams.get('course') || '';
  const selectedSpec = searchParams.get('specialization') || 'All';
  const universityId = searchParams.get('universityId');
  const universityName = searchParams.get('universityName');
  
  const [courses, setCourses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(24);

  // Fetch streams for the "Study Goal" section
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const { data } = await api.get('/courses/streams');
        if (data.success) setStreams(data.data);
      } catch (error) {
        console.error('Failed to fetch streams:', error);
      }
    };
    fetchStreams();
  }, []);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      try {
        let queryParams = new URLSearchParams();
        if (selectedCategory !== 'All') queryParams.append('category', selectedCategory);
        if (selectedState !== 'All') queryParams.append('state', selectedState);
        if (selectedStream !== 'All') queryParams.append('stream', selectedStream);
        if (universityId) queryParams.append('universityId', universityId);

        if (selectedCourse) {
          // Fetch specific colleges for the selected base course
          queryParams.append('baseCourse', selectedCourse);
          queryParams.append('limit', '100');
          const { data } = await api.get(`/courses?${queryParams.toString()}`);
          if (active) {
            setCourses(data.data || []);
            setTotalCount(data.pagination?.total || data.data.length);
          }
        } else {
          // Fetch high-performance grouped courses
          const { data } = await api.get(`/courses/grouped?${queryParams.toString()}`);
          if (active) {
            setCourses(data.data || []);
            // Set totalCount to the number of unique programs (groups)
            setTotalCount(data.data?.length || 0);
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
  }, [selectedCategory, selectedState, selectedStream, search, selectedCourse]);

  // Grouped results are already coming from the backend now
  const courseGroups = useMemo(() => {
    if (selectedCourse) return [];
    return courses.map(c => ({
      ...c,
      normName: c.name.toLowerCase()
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

    const query = search.trim().toLowerCase();
    if (!query) return filtered;
    return filtered.filter((group) => (
      [group.name, group.category, group.stream].join(' ').toLowerCase().includes(query)
    ));
  }, [courseGroups, search, selectedSpec]);

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

    const query = search.trim().toLowerCase();
    if (!query) return filtered;
    return filtered.filter((course) => {
      return [
        course.universityId?.name,
        course.universityId?.city,
        course.universityId?.state,
        course.specializationName
      ].join(' ').toLowerCase().includes(query);
    });
  }, [courses, selectedCourse, search, selectedSpec]);

  // Group visible courses by category for the "All" view
  const groupedByCategory = useMemo(() => {
    if (selectedCategory !== 'All') return { [selectedCategory]: visibleCourseGroups };
    
    const groups = {};
    visibleCourseGroups.forEach(course => {
      const cat = course.category || 'Others';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(course);
    });
    return groups;
  }, [visibleCourseGroups, selectedCategory]);

  const categoryOrder = ['UG', 'PG', 'PhD', 'Diploma', 'Foreign Program', 'Others'];

  const streamIcons = {
    'Arts': GraduationCap,
    'Commerce': Building2,
    'Science': Sparkles,
    'Engineering': Award,
    'Management': Users,
    'Medical': CheckCircle2,
    'Pharmacy': BookOpen,
    'Nursing': CheckCircle2,
    'Law': Award,
    'Architecture': Building2,
    'Agriculture': GraduationCap,
    'Design': Sparkles,
    'Education': BookOpen,
    'Hospitality': Users,
    'IT': Award,
    'Others': BookOpen
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
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
                  className="w-full pl-5 pr-8 py-7 bg-transparent border-none outline-none text-xl text-white font-bold placeholder:text-white/20"
                />
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
                    onChange={(e) => {
                      const query = e.target.value.toLowerCase();
                      const items = document.querySelectorAll('.state-item');
                      items.forEach(item => {
                        const text = item.textContent.toLowerCase();
                        item.style.display = text.includes(query) ? 'flex' : 'none';
                      });
                    }}
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
                {ALL_STATES.map((state) => (
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
            <div className="flex items-center justify-between gap-6 mb-10">
              <div className="flex items-center gap-6">
                <h2 className="text-2xl font-serif font-black text-slate-800 dark:text-white">
                  {selectedStream !== 'All' ? selectedStream : 'Academic Programs'}
                </h2>
                <div className="h-px w-24 bg-slate-200 dark:bg-dark-border hidden md:block" />
                <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-[11px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {totalCount} RESULTS
                </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AnimatePresence mode="popLayout">
                  {(selectedCourse ? filteredColleges : visibleCourseGroups).map((item, idx) => (
                    <motion.div 
                      layout
                      key={item._id || item.normName}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                      whileHover={{ y: -8 }}
                      className="group relative bg-white dark:bg-dark-card rounded-[3rem] p-1 border border-light-border dark:border-dark-border shadow-lg hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500"
                    >
                      <div className="p-8 space-y-8">
                        <div className="flex justify-between items-start">
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-3 py-1 rounded-lg bg-indigo-500/5 text-indigo-500 text-[10px] font-black uppercase tracking-widest border border-indigo-500/10">
                                {item.category || 'Professional'}
                              </span>
                              {item.stream && (
                                <span className="px-3 py-1 rounded-lg bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10">
                                  {item.stream}
                                </span>
                              )}
                              {selectedCourse && item.specializationName && item.specializationName !== 'General' && (
                                <span className="px-3 py-1 rounded-lg bg-emerald-500/5 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-500/10">
                                  {item.specializationName}
                                </span>
                              )}
                            </div>
                            <h3 className="text-2xl md:text-3xl font-serif font-black leading-tight group-hover:text-primary transition-colors cursor-pointer"
                                onClick={() => {
                                  if (!selectedCourse) {
                                    const params = new URLSearchParams(searchParams);
                                    params.set('course', item.name);
                                    setSearchParams(params);
                                  } else {
                                    navigate(`/universities/${item.universityId?.slug || item.universityId?._id}`, { state: { activeTab: 1 } });
                                  }
                                }}>
                              {selectedCourse ? item.universityId?.name : item.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                              <MapPin className="w-4 h-4 text-primary" /> 
                              {selectedCourse ? `${item.universityId?.city}, ${item.universityId?.state}` : `${item.collegeCount} Participating Institutions`}
                            </div>
                          </div>
                          <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-dark-border/20 flex items-center justify-center p-3 shrink-0 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 shadow-inner">
                             {selectedCourse ? (
                               item.universityId?.logoUrl ? <img src={item.universityId.logoUrl} alt="" className="w-full h-full object-contain" /> : <div className="text-2xl font-black text-primary">{item.universityId?.name?.[0]}</div>
                             ) : (
                               <div className="text-primary"><GraduationCap className="w-10 h-10" /></div>
                             )}
                          </div>
                        </div>

                        {selectedCourse && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                              <span>Specialization</span>
                              <span className="text-emerald-500">{item.specializationName || 'General'}</span>
                            </div>
                            <div className="h-1 w-full bg-slate-50 dark:bg-dark-border/30 rounded-full overflow-hidden">
                               <div className="h-full bg-primary w-2/3" />
                            </div>
                          </div>
                        )}

                        {!selectedCourse && item.specializations?.length > 0 && (
                          <div className="flex flex-wrap gap-2 py-6 border-y border-slate-50 dark:border-dark-border/30">
                            {item.specializations.slice(0, 4).map(spec => (
                              <span key={spec} className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-dark-border/50 text-[11px] font-bold text-slate-500 border border-slate-100 dark:border-dark-border">
                                {spec}
                              </span>
                            ))}
                            {item.specializations.length > 4 && (
                              <span className="text-[11px] font-black text-primary px-2">+{item.specializations.length - 4} Others</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-3">
                             <div className="flex -space-x-3">
                               {[1,2,3,4].map(i => (
                                 <div key={i} className="w-8 h-8 rounded-full border-4 border-white dark:border-dark-card bg-slate-100 dark:bg-dark-border flex items-center justify-center text-[10px] font-black overflow-hidden shadow-sm">
                                   {i === 4 ? <span className="text-primary">+</span> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-indigo-500/20" />}
                                 </div>
                               ))}
                             </div>
                             <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">A-Grade Accreditation</span>
                          </div>
                          <button 
                            onClick={() => {
                              if (selectedCourse) {
                                navigate(`/universities/${item.universityId?.slug || item.universityId?._id}`, { state: { activeTab: 1 } });
                              } else {
                                const params = new URLSearchParams(searchParams);
                                params.set('course', item.name);
                                setSearchParams(params);
                              }
                            }}
                            className="flex items-center gap-3 pl-6 pr-2 py-2 bg-slate-900 dark:bg-primary text-white rounded-full font-black text-[11px] uppercase tracking-widest group-hover:pr-3 transition-all shadow-xl shadow-slate-900/20"
                          >
                            Explore {selectedCourse ? 'University' : 'Programs'}
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {((!selectedCourse && visibleCourseGroups.length < filteredCourseGroups.length) || (selectedCourse && filteredColleges.length > 24)) && (
                <div className="py-20 text-center">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (!selectedCourse) setVisibleCount(prev => prev + 24);
                    }}
                    className="px-16 py-5 bg-white dark:bg-dark-card border-2 border-primary text-primary rounded-[2rem] font-black text-sm tracking-widest shadow-2xl shadow-primary/10 hover:bg-primary hover:text-white transition-all duration-300"
                  >
                    LOAD MORE PROGRAMS
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
