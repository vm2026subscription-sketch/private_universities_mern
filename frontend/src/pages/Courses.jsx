import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, GraduationCap, MapPin, Search, Filter, X } from 'lucide-react';
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
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCourses = async () => {
      setLoading(true);
      try {
        // Fetch based on category to keep response size manageable
        const query = selectedCategory !== 'All' ? `?category=${encodeURIComponent(selectedCategory)}` : '';
        const { data } = await api.get(`/courses${query}`);
        if (active) setCourses(data.data || []);
      } catch {
        if (active) setCourses([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadCourses();
    return () => { active = false; };
  }, [selectedCategory]);

  // Normalize course names for better grouping
  const normalizeCourseName = (name) => {
    if (!name) return '';
    return name
      .replace(/\./g, '') // Remove dots (B.A. -> BA)
      .replace(/&/g, 'and')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const courseGroups = useMemo(() => {
    let scopedCourses = courses;

    // Filter by state if selected
    if (selectedState !== 'All') {
      scopedCourses = scopedCourses.filter((course) => 
        course.universityId?.state?.trim().toLowerCase() === selectedState.trim().toLowerCase()
      );
    }

    const grouped = scopedCourses.reduce((acc, course) => {
      if (!course.name) return acc;

      const normName = normalizeCourseName(course.name);
      if (!acc[normName]) {
        acc[normName] = {
          name: course.name.trim(),
          normName: normName,
          category: course.category,
          duration: course.duration || null,
          entranceExams: new Set(),
          colleges: [],
        };
      }

      if (!acc[normName].duration && course.duration) acc[normName].duration = course.duration;
      (course.entranceExams || []).forEach((exam) => acc[normName].entranceExams.add(exam));
      acc[normName].colleges.push(course);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((group) => ({
        ...group,
        entranceExams: [...group.entranceExams],
        collegeCount: group.colleges.length,
      }))
      .sort((a, b) => b.collegeCount - a.collegeCount);
  }, [courses, selectedState]);

  const filteredCourseGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return courseGroups;

    return courseGroups.filter((group) => (
      [group.name, group.category, group.entranceExams.join(' ')].join(' ').toLowerCase().includes(query)
    ));
  }, [courseGroups, search]);

  const selectedCourseGroup = useMemo(
    () => courseGroups.find((group) => 
      group.name.toLowerCase() === selectedCourse.toLowerCase() || 
      group.normName.toLowerCase() === normalizeCourseName(selectedCourse).toLowerCase()
    ) || null,
    [courseGroups, selectedCourse]
  );

  const filteredColleges = useMemo(() => {
    if (!selectedCourseGroup) return [];
    const query = search.trim().toLowerCase();
    
    // Colleges are already filtered by state during grouping
    let filtered = selectedCourseGroup.colleges;

    if (!query) return filtered;

    return filtered.filter((course) => {
      return [
        course.universityId?.name,
        course.universityId?.city,
        course.universityId?.state,
      ].join(' ').toLowerCase().includes(query);
    });
  }, [selectedCourseGroup, search]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-20 md:pb-12 min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">Explore Courses</h1>
          <p className="text-sm font-medium text-light-muted dark:text-dark-muted flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> Find the right course across {courses.length} listings in top universities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-96 shadow-sm">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search course, exam or college..."
              className="input-field pl-12 py-3 rounded-2xl border-none ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary shadow-sm"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="md:hidden p-3 rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-sm">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-10">
        {/* Sidebar */}
        <aside className={`${showFilters ? 'fixed inset-0 z-[60] bg-white dark:bg-dark-bg p-8 overflow-y-auto' : 'hidden'} md:block md:w-72 shrink-0 animate-in fade-in slide-in-from-left-4 duration-300`}>
          <div className="flex items-center justify-between mb-8 md:hidden">
            <h3 className="text-xl font-bold">Filters</h3>
            <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-light-bg rounded-full"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="space-y-10">
            {/* Category Filter */}
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-primary mb-5 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Course Level
              </h4>
              <div className="space-y-1.5">
                {['All', 'UG', 'PG', 'Diploma', 'PhD', 'Others'].map((cat) => (
                  <label key={cat} className={`
                    flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer text-sm font-bold transition-all
                    ${selectedCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-light-muted hover:bg-primary-50 dark:hover:bg-dark-border'}
                  `}>
                    <input 
                      type="radio" 
                      name="category" 
                      checked={selectedCategory === cat} 
                      onChange={() => handleCategoryChange(cat)} 
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedCategory === cat ? 'border-white' : 'border-light-border'}`}>
                      {selectedCategory === cat && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {/* State Filter */}
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-primary mb-5 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> All States
              </h4>
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                <label className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer text-sm font-bold mb-1 transition-all
                  ${selectedState === 'All' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-light-muted hover:bg-primary-50 dark:hover:bg-dark-border'}
                `}>
                  <input type="radio" name="state" checked={selectedState === 'All'} onChange={() => handleStateChange('All')} className="hidden" />
                  All States
                </label>
                {ALL_STATES.map((state) => (
                  <label key={state} className={`
                    flex items-center gap-3 px-4 py-2 rounded-xl cursor-pointer text-xs font-bold transition-all
                    ${selectedState === state ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' : 'text-light-muted hover:bg-primary-50 dark:hover:bg-dark-border'}
                  `}>
                    <input 
                      type="radio" 
                      name="state" 
                      checked={selectedState === state} 
                      onChange={() => handleStateChange(state)} 
                      className="hidden"
                    />
                    <span className="truncate">{state}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10">
              <h4 className="font-bold text-xs mb-2">Smart Grouping</h4>
              <p className="text-[10px] text-light-muted leading-relaxed">Similar courses are grouped together to help you compare colleges offering them easily.</p>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {selectedCourse && (
            <div className="card p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-4 border-2 border-primary/10 bg-primary/5">
              <div>
                <h2 className="text-2xl font-black text-primary">{selectedCourse}</h2>
                <p className="text-sm font-bold text-light-muted">
                   {filteredColleges.length > 0 
                     ? `Available in ${filteredColleges.length} colleges ${selectedState !== 'All' ? `in ${selectedState}` : ''}`
                     : `No colleges found for this course in ${selectedState === 'All' ? 'the database' : selectedState}`}
                </p>
              </div>
              <button onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete('course');
                setSearchParams(params);
              }} className="btn-primary !py-2.5 !px-6 flex items-center gap-2 text-sm font-bold">
                <ArrowLeft className="w-4 h-4" /> Browse All Courses
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 rounded-3xl bg-light-card animate-pulse"></div>)}
            </div>
          ) : selectedCourse ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredColleges.map((course) => (
                <div key={course._id} className="card p-8 group hover:border-primary transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="badge badge-orange font-black text-[10px]">{course.category}</span>
                        {course.duration && <span className="text-[10px] font-bold text-light-muted italic">{course.duration} Years</span>}
                      </div>
                      {/* University logo + name row */}
                      <div className="flex items-center gap-3 mb-2">
                        {course.universityId?.logoUrl ? (
                          <img
                            src={course.universityId.logoUrl}
                            alt={`${course.universityId.name} logo`}
                            className="w-10 h-10 rounded-lg object-contain bg-white border border-light-border dark:border-dark-border p-0.5 shrink-0"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-dark-border flex items-center justify-center text-primary font-bold text-base shrink-0">
                            {course.universityId?.name?.charAt(0)}
                          </div>
                        )}
                        <h2 className="text-2xl font-black group-hover:text-primary transition-colors leading-tight">{course.universityId?.name}</h2>
                      </div>
                      <p className="text-sm font-bold text-light-muted flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" />{course.universityId?.city}, {course.universityId?.state}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 p-4 rounded-2xl bg-light-bg dark:bg-dark-border/50 mb-8">
                     <div>
                       <p className="text-[10px] font-black uppercase text-light-muted mb-1 tracking-widest">Est. Year</p>
                       <p className="text-sm font-bold">{course.universityId?.establishedYear || 'N/A'}</p>
                     </div>
                     <div>
                       <p className="text-[10px] font-black uppercase text-light-muted mb-1 tracking-widest">Fees / Year</p>
                       <p className="text-sm font-bold text-primary">₹{course.feesPerYear ? course.feesPerYear.toLocaleString() : 'Contact for Fees'}</p>
                     </div>
                  </div>
                  <Link to={`/universities/${course.universityId?.slug}`} className="btn-primary w-full text-center block !py-3 font-black text-sm tracking-wide shadow-lg shadow-primary/20">View Detailed Profile</Link>
                </div>
              ))}
              {filteredColleges.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <BookOpen className="w-16 h-16 text-light-muted mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-bold text-light-muted">No universities found offering this course in {selectedState}.</p>
                  <button onClick={() => handleStateChange('All')} className="text-primary font-bold mt-2 hover:underline">Clear State Filter</button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourseGroups.map((group) => (
                <button
                  key={group.normName}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('course', group.name);
                    setSearchParams(params);
                  }}
                  className="card p-8 text-left hover:border-primary transition-all duration-300 group hover:shadow-2xl hover:shadow-primary/5"
                >
                  <div className="flex justify-between items-start mb-5">
                    <span className="badge badge-blue font-black text-[10px]">{group.category}</span>
                    {group.duration && <span className="text-xs font-black text-light-muted tracking-tighter">{group.duration} Yrs</span>}
                  </div>
                  <h2 className="text-xl font-black mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight">{group.name}</h2>
                  <p className="text-sm text-primary font-black mb-6 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">{group.collegeCount}</span>
                    Available College{group.collegeCount === 1 ? '' : 's'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 border-t border-light-border dark:border-dark-border pt-5">
                    {group.entranceExams.slice(0, 3).map((exam) => (
                      <span key={exam} className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-light-card dark:bg-dark-border tracking-wider text-light-muted">{exam}</span>
                    ))}
                    {group.entranceExams.length > 3 && <span className="text-[9px] font-black text-light-muted">+{group.entranceExams.length - 3} more</span>}
                  </div>
                </button>
              ))}
              {filteredCourseGroups.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <Search className="w-16 h-16 text-light-muted mx-auto mb-4 opacity-20" />
                  <h3 className="text-2xl font-black mb-2">No Courses Found</h3>
                  <p className="text-light-muted font-bold">Try adjusting your filters or search query.</p>
                  <button onClick={() => { handleStateChange('All'); handleCategoryChange('All'); setSearch(''); }} className="btn-primary !py-2 !px-6 mt-6">Reset All Filters</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
