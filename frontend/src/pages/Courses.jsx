import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, GraduationCap, MapPin, Search, Filter, X } from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';

export default function Courses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'All';
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

  const categories = useMemo(() => (
    ['All', ...new Set(courses.map((course) => course.category).filter(Boolean))]
  ), [courses]);

  // Normalize course names for better grouping
  const normalizeCourseName = (name) => {
    if (!name) return '';
    return name
      .replace(/\s*\([^)]*\)/g, '') // Remove parentheses content
      .replace(/\./g, '') // Remove dots (B.A. -> BA)
      .replace(/&/g, 'and')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const courseGroups = useMemo(() => {
    const scopedCourses = selectedCategory === 'All'
      ? courses
      : courses.filter((course) => course.category === selectedCategory);

    const grouped = scopedCourses.reduce((acc, course) => {
      if (!course.name) return acc;

      const normName = normalizeCourseName(course.name);
      if (!acc[normName]) {
        acc[normName] = {
          name: course.name.trim(), // Keep one representative name
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
      .sort((a, b) => b.collegeCount - a.collegeCount); // Show most available first
  }, [courses, selectedCategory]);

  const filteredCourseGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return courseGroups;

    return courseGroups.filter((group) => (
      [group.name, group.category, group.entranceExams.join(' ')].join(' ').toLowerCase().includes(query)
    ));
  }, [courseGroups, search]);

  const selectedCourseGroup = useMemo(
    () => courseGroups.find((group) => group.name.toLowerCase() === selectedCourse.toLowerCase() || group.normName.toLowerCase() === normalizeCourseName(selectedCourse).toLowerCase()) || null,
    [courseGroups, selectedCourse]
  );

  const filteredColleges = useMemo(() => {
    if (!selectedCourseGroup) return [];
    const query = search.trim().toLowerCase();
    if (!query) return selectedCourseGroup.colleges;

    return selectedCourseGroup.colleges.filter((course) => {
      return [
        course.universityId?.name,
        course.universityId?.city,
        course.universityId?.state,
      ].join(' ').toLowerCase().includes(query);
    });
  }, [selectedCourseGroup, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-20 md:pb-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Explore Courses</h1>
          <p className="text-light-muted dark:text-dark-muted">
            Find the right course across {courses.length} listings in top universities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search course, exam or college..."
              className="input-field pl-11"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="md:hidden p-2.5 rounded-xl border border-light-border dark:border-dark-border">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Course Filter Sidebar */}
        <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-white dark:bg-dark-bg p-6 overflow-y-auto' : 'hidden'} md:block md:w-64 shrink-0`}>
          <div className="flex items-center justify-between mb-6 md:hidden">
            <h3 className="font-bold">Filters</h3>
            <button onClick={() => setShowFilters(false)}><X className="w-5 h-5" /></button>
          </div>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">Course Level</h4>
              <div className="space-y-2">
                {['All', 'UG', 'PG', 'Diploma', 'PhD', 'Others'].map((cat) => (
                  <label key={cat} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                    <input 
                      type="radio" 
                      name="category" 
                      checked={selectedCategory === cat} 
                      onChange={() => setSearchParams(cat === 'All' ? {} : { category: cat })} 
                      className="text-primary focus:ring-primary"
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3">Popular Exclusions</h4>
              <label className="flex items-center gap-2 py-1 cursor-pointer text-sm text-light-muted italic">
                Grouping similar courses... (Auto)
              </label>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {selectedCourse && !loading && (
            <div className="card p-5 mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedCourse}</h2>
                <p className="text-sm text-light-muted">Available in {filteredColleges.length} colleges</p>
              </div>
              <button onClick={() => setSearchParams({})} className="btn-outline !py-2 inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}

          {loading ? (
            <CardSkeleton count={6} />
          ) : selectedCourse ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredColleges.map((course) => (
                <div key={course._id} className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="badge badge-orange mb-2">{course.category}</span>
                      <h2 className="text-xl font-semibold">{course.universityId?.name}</h2>
                      <p className="text-sm text-light-muted flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{course.universityId?.city}, {course.universityId?.state}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm mb-4">
                     {course.duration && <p>Duration: <strong>{course.duration} Years</strong></p>}
                     {course.feesPerYear && <p>Fees: <strong>₹{course.feesPerYear.toLocaleString()} /yr</strong></p>}
                  </div>
                  <Link to={`/universities/${course.universityId?.slug}`} className="btn-primary w-full text-center block !py-2 text-sm">View University</Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourseGroups.map((group) => (
                <button
                  key={group.normName}
                  onClick={() => setSearchParams({ ...(selectedCategory !== 'All' ? { category: selectedCategory } : {}), course: group.name })}
                  className="card p-6 text-left hover:border-primary transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="badge badge-blue">{group.category}</span>
                    {group.duration && <span className="text-xs text-light-muted">{group.duration} Yrs</span>}
                  </div>
                  <h2 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">{group.name}</h2>
                  <p className="text-sm text-primary font-medium mb-4">
                    Available in {group.collegeCount} college{group.collegeCount === 1 ? '' : 's'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {group.entranceExams.slice(0, 2).map((exam) => (
                      <span key={exam} className="text-[10px] px-2 py-0.5 rounded bg-light-card dark:bg-dark-border">{exam}</span>
                    ))}
                    {group.entranceExams.length > 2 && <span className="text-[10px] text-light-muted">+{group.entranceExams.length - 2} more</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
