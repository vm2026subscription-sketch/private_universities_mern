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
  const selectedCourse = searchParams.get('course') || '';
  const universityId = searchParams.get('universityId');
  const universityName = searchParams.get('universityName');
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      try {
        let queryParams = new URLSearchParams();
        if (selectedCategory !== 'All') queryParams.append('category', selectedCategory);
        if (selectedState !== 'All') queryParams.append('state', selectedState);
        if (universityId) queryParams.append('universityId', universityId);

        if (selectedCourse) {
          // Fetch specific colleges for the selected course
          queryParams.append('name', selectedCourse);
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
            // Calculate total items from college counts
            const total = (data.data || []).reduce((acc, curr) => acc + (curr.collegeCount || 0), 0);
            setTotalCount(total);
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
  }, [selectedCategory, universityId, selectedState, selectedCourse]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(24);
  }, [selectedCategory, selectedState, search, selectedCourse]);

  // Grouped results are already coming from the backend now
  const courseGroups = useMemo(() => {
    if (selectedCourse) return [];
    return courses.map(c => ({
      ...c,
      normName: c.name.toLowerCase()
    }));
  }, [courses, selectedCourse]);

  const filteredCourseGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return courseGroups;
    return courseGroups.filter((group) => (
      [group.name, group.category].join(' ').toLowerCase().includes(query)
    ));
  }, [courseGroups, search]);

  const visibleCourseGroups = useMemo(() => {
    return filteredCourseGroups.slice(0, visibleCount);
  }, [filteredCourseGroups, visibleCount]);

  const filteredColleges = useMemo(() => {
    if (!selectedCourse) return [];
    const query = search.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((course) => {
      return [
        course.universityId?.name,
        course.universityId?.city,
        course.universityId?.state,
      ].join(' ').toLowerCase().includes(query);
    });
  }, [courses, selectedCourse, search]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-20 md:pb-12 min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      {/* Premium Hero Section */}
      <div className="relative mb-12 rounded-[2rem] overflow-hidden bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl shadow-primary/5">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary/[0.02] to-transparent pointer-events-none" />
        
        <div className="relative px-8 py-12 md:px-12 md:py-16 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest"
            >
              <Sparkles className="w-3.5 h-3.5" /> Discovery Portal
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-serif font-black tracking-tight leading-[1.1]"
            >
              {universityName ? (
                <>Programs at <span className="text-primary">{universityName}</span></>
              ) : (
                <>Master Your Future with the <span className="text-primary">Right Course</span></>
              )}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-light-muted dark:text-dark-muted max-w-2xl leading-relaxed"
            >
              {universityName 
                ? `Explore the specialized academic programs and degree offerings at this institution to find your perfect fit.` 
                : `Navigate through thousands of specialized programs, degree levels, and professional certifications from India's most prestigious universities.`
              }
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center gap-6 pt-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-black">{totalCount.toLocaleString()}+</p>
                  <p className="text-[10px] text-light-muted font-bold uppercase">Listings</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-black">750+</p>
                  <p className="text-[10px] text-light-muted font-bold uppercase">Partners</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-black">Verified</p>
                  <p className="text-[10px] text-light-muted font-bold uppercase">Admissions</p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full md:w-[400px] space-y-4"
          >
            <div className="relative group">
              <Search className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-primary group-focus-within:scale-110 transition-transform" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search course, exam or degree..."
                className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] bg-light-bg dark:bg-dark-border/20 border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-dark-card transition-all outline-none text-lg font-bold shadow-xl shadow-primary/5"
              />
            </div>
            {universityName && (
              <button onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete('universityId');
                params.delete('universityName');
                setSearchParams(params);
              }} className="w-full py-4 rounded-[1.25rem] border-2 border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-black text-primary">
                <X className="w-4 h-4" /> Clear Institution Filter
              </button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Modern Sidebar Filter */}
        <aside className={`${showFilters ? 'fixed inset-0 z-[110] bg-white dark:bg-dark-bg p-8 overflow-y-auto' : 'hidden'} lg:block lg:w-80 shrink-0`}>
          <div className="sticky top-24 space-y-8">
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <h3 className="text-2xl font-black text-primary">Refine Results</h3>
              <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-light-bg dark:hover:bg-dark-border rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-10">
              {/* Category Filter */}
              <div className="bg-white dark:bg-dark-card p-6 rounded-3xl border border-light-border dark:border-dark-border shadow-sm">
                <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4" /> Degree Level
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {['All', 'UG', 'PG', 'Diploma', 'PhD', 'Others'].map((cat) => (
                    <label key={cat} className={`
                      flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer text-sm font-bold transition-all duration-300
                      ${selectedCategory === cat 
                        ? 'bg-primary text-white shadow-xl shadow-primary/20 translate-x-1' 
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-dark-border'}
                    `}>
                      <input type="radio" name="category" checked={selectedCategory === cat} onChange={() => handleCategoryChange(cat)} className="hidden" />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selectedCategory === cat ? 'border-white' : 'border-slate-200'}`}>
                        {selectedCategory === cat && <motion.div layoutId="cat-dot" className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      {cat}
                    </label>
                  ))}
                </div>
              </div>

              {/* State Filter */}
              <div className="bg-white dark:bg-dark-card p-6 rounded-3xl border border-light-border dark:border-dark-border shadow-sm">
                <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-2.5">
                  <MapPin className="w-4 h-4" /> State / Region
                </h4>
                <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  <label className={`
                    flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer text-sm font-bold transition-all
                    ${selectedState === 'All' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-dark-border'}
                  `}>
                    <input type="radio" name="state" checked={selectedState === 'All'} onChange={() => handleStateChange('All')} className="hidden" />
                    All Regions
                  </label>
                  {ALL_STATES.map((state) => (
                    <label key={state} className={`
                      flex items-center gap-3 px-4 py-2.5 rounded-2xl cursor-pointer text-[13px] font-bold transition-all
                      ${selectedState === state ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-dark-border'}
                    `}>
                      <input type="radio" name="state" checked={selectedState === state} onChange={() => handleStateChange(state)} className="hidden" />
                      <span className="truncate">{state}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-indigo-500" />
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-indigo-500">Why choose us?</h4>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Our algorithm groups over 13,000 course listings to help you find precisely what you're looking for with zero clutter.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1">
          {selectedCourse && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 p-8 rounded-[2rem] bg-gradient-to-br from-primary to-primary-light text-white shadow-2xl shadow-primary/20 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <BookOpen className="w-32 h-32" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-serif font-black mb-2">{selectedCourse}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm font-bold">
                    <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {filteredColleges.length} Institutions</span>
                    {selectedState !== 'All' && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {selectedState}</span>}
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Verified Listings</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('course');
                    setSearchParams(params);
                  }} 
                  className="px-8 py-4 bg-white text-primary rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-all flex items-center gap-2 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Catalog
                </button>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : selectedCourse ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnimatePresence>
                {filteredColleges.map((course, idx) => (
                  <motion.div 
                    key={course._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative bg-white dark:bg-dark-card rounded-[2.5rem] p-1 border border-light-border dark:border-dark-border shadow-xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden"
                  >
                    <div className="p-8 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-lg bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest">{course.category || 'Professional'}</span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-light-muted uppercase tracking-tighter"><Sparkles className="w-3 h-3" /> {course.duration} Year Program</span>
                          </div>
                          <h3 className="text-2xl font-serif font-black leading-tight group-hover:text-primary transition-colors mb-2">{course.universityId?.name}</h3>
                          <p className="flex items-center gap-1.5 text-sm font-bold text-light-muted">
                            <MapPin className="w-4 h-4 text-primary" /> {course.universityId?.city}, {course.universityId?.state}
                          </p>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-white shadow-lg border border-slate-50 flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform duration-500">
                          {course.universityId?.logoUrl ? (
                            <img src={course.universityId.logoUrl} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <div className="text-2xl font-black text-primary">{course.universityId?.name?.[0]}</div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-dark-border/30 border border-slate-100 dark:border-dark-border/50">
                          <p className="text-[10px] font-black text-light-muted uppercase tracking-widest mb-1">Annual Tuition</p>
                          <p className="text-lg font-black text-primary">₹{course.feesPerYear ? course.feesPerYear.toLocaleString() : 'N/A'}</p>
                        </div>
                        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-dark-border/30 border border-slate-100 dark:border-dark-border/50">
                          <p className="text-[10px] font-black text-light-muted uppercase tracking-widest mb-1">Entrance Req.</p>
                          <p className="text-xs font-bold truncate">{(course.entranceExams && course.entranceExams[0]) || 'Not Specified'}</p>
                        </div>
                      </div>

                      <Link 
                        to={`/universities/${course.universityId?.slug}`}
                        className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-sm tracking-widest shadow-2xl shadow-slate-900/20 group-hover:bg-primary transition-all duration-300"
                      >
                        VIEW FULL PROFILE <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredColleges.length === 0 && (
                <div className="col-span-full py-32 text-center bg-white dark:bg-dark-card rounded-[3rem] border-2 border-dashed border-light-border dark:border-dark-border">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-dark-border rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-black mb-2">No Matching Institutions</h3>
                  <p className="text-light-muted font-bold mb-8">Try clearing your filters or selecting a different region.</p>
                  <button onClick={() => handleStateChange('All')} className="px-8 py-3 bg-primary text-white rounded-xl font-black text-xs shadow-lg shadow-primary/20">Clear State Filter</button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-16">
              {categoryOrder.map(cat => {
                const groups = groupedByCategory[cat];
                if (!groups || groups.length === 0) return null;
                
                return (
                  <div key={cat} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200 dark:to-dark-border" />
                      <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary bg-primary/5 px-6 py-2 rounded-full border border-primary/10">
                        {cat === 'UG' ? 'Undergraduate (UG)' : cat === 'PG' ? 'Postgraduate (PG)' : cat === 'PhD' ? 'Doctoral (PhD)' : cat} Programs
                      </h2>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200 dark:to-dark-border" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <AnimatePresence>
                        {groups.map((group, idx) => (
                          <motion.button
                            key={group.normName}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            onClick={() => {
                              const params = new URLSearchParams(searchParams);
                              params.set('course', group.name);
                              setSearchParams(params);
                            }}
                            className="group text-left relative bg-white dark:bg-dark-card rounded-[2.5rem] p-1 border border-light-border dark:border-dark-border shadow-xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-700">
                              <GraduationCap className="w-32 h-32" />
                            </div>
                            
                            <div className="p-8 space-y-6 relative z-10">
                              <div className="flex justify-between items-start">
                                <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">{group.category}</span>
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black">
                                  <Building2 className="w-3 h-3" /> {group.collegeCount} COLLEGES
                                </div>
                              </div>

                              <div className="min-h-[64px]">
                                <h3 className="text-2xl font-serif font-black leading-tight group-hover:text-primary transition-colors line-clamp-2">{group.name}</h3>
                              </div>

                              <div className="flex items-center gap-3 py-4 border-y border-slate-50 dark:border-dark-border/30">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-border flex items-center justify-center shrink-0">
                                   {group.university?.logoUrl ? (
                                     <img src={group.university.logoUrl} alt="" className="w-5 h-5 object-contain" />
                                   ) : (
                                     <span className="text-xs font-black text-primary">{group.university?.name?.[0]}</span>
                                   )}
                                </div>
                                <span className="text-[10px] font-bold text-light-muted uppercase tracking-widest truncate">{group.university?.name || 'Academic Partners'}</span>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {group.entranceExams.slice(0, 2).map((exam) => (
                                  <span key={exam} className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-dark-border/50 border border-slate-100 dark:border-dark-border/50 text-[9px] font-black uppercase text-light-muted tracking-wider">{exam}</span>
                                ))}
                                {group.entranceExams.length > 2 && (
                                  <span className="px-3 py-1 text-[9px] font-black text-primary uppercase tracking-widest">+{group.entranceExams.length - 2} More</span>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
              
              {visibleCourseGroups.length < filteredCourseGroups.length && (
                <div className="py-16 text-center">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVisibleCount(prev => prev + 24)}
                    className="inline-flex items-center gap-3 px-16 py-5 bg-white dark:bg-dark-card border-2 border-primary text-primary rounded-[1.5rem] font-black text-sm tracking-widest shadow-xl shadow-primary/10 hover:bg-primary hover:text-white transition-all duration-300"
                  >
                    LOAD MORE PROGRAMS <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              )}

              {filteredCourseGroups.length === 0 && (
                <div className="py-32 text-center bg-white dark:bg-dark-card rounded-[3rem] border-2 border-dashed border-light-border dark:border-dark-border">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-dark-border rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-3xl font-black mb-2 text-slate-400">No Courses Found</h3>
                  <p className="text-light-muted font-bold max-w-md mx-auto mb-8">We couldn't find any courses matching your current filters. Try resetting or adjusting your search criteria.</p>
                  <button onClick={() => { handleStateChange('All'); handleCategoryChange('All'); setSearch(''); }} className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20">Reset Discovery Engine</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
