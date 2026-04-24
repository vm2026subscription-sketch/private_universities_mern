import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, GraduationCap, MapPin, Search } from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';

export default function Courses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'All';
  const selectedCourse = searchParams.get('course') || '';
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
    return () => {
      active = false;
    };
  }, [selectedCategory]);

  const categories = useMemo(() => (
    ['All', ...new Set(courses.map((course) => course.category).filter(Boolean))]
  ), [courses]);

  const courseGroups = useMemo(() => {
    const scopedCourses = selectedCategory === 'All'
      ? courses
      : courses.filter((course) => course.category === selectedCategory);

    const grouped = scopedCourses.reduce((acc, course) => {
      if (!course.name) return acc;

      const key = course.name.trim();
      if (!acc[key]) {
        acc[key] = {
          name: key,
          category: course.category,
          duration: course.duration || null,
          entranceExams: new Set(),
          colleges: [],
        };
      }

      if (!acc[key].duration && course.duration) acc[key].duration = course.duration;
      (course.entranceExams || []).forEach((exam) => acc[key].entranceExams.add(exam));
      acc[key].colleges.push(course);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((group) => ({
        ...group,
        entranceExams: [...group.entranceExams],
        collegeCount: group.colleges.length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [courses, selectedCategory]);

  const filteredCourseGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return courseGroups;

    return courseGroups.filter((group) => (
      [group.name, group.category, group.entranceExams.join(' ')].join(' ').toLowerCase().includes(query)
    ));
  }, [courseGroups, search]);

  const selectedCourseGroup = useMemo(
    () => courseGroups.find((group) => group.name.toLowerCase() === selectedCourse.toLowerCase()) || null,
    [courseGroups, selectedCourse]
  );

  const filteredColleges = useMemo(() => {
    if (!selectedCourseGroup) return [];

    const query = search.trim().toLowerCase();
    if (!query) return selectedCourseGroup.colleges;

    return selectedCourseGroup.colleges.filter((course) => {
      const specializationNames = (course.specializations || []).map((item) => item.name).join(' ');
      return [
        course.universityId?.name,
        course.universityId?.city,
        course.universityId?.state,
        specializationNames,
      ].join(' ').toLowerCase().includes(query);
    });
  }, [selectedCourseGroup, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-20 md:pb-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-10">
        <div>
          <span className="badge badge-blue mb-4 inline-flex">Career Paths</span>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Courses Across Top Universities</h1>
          <p className="text-light-muted dark:text-dark-muted max-w-2xl">
            Start with a general course name, then view the list of colleges that offer that course.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={selectedCourse ? 'Search college or location...' : 'Search course name...'}
            className="w-full rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => {
              setSearch('');
              setSearchParams(category === 'All' ? {} : { category });
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-white'
                : 'bg-light-card dark:bg-dark-card hover:bg-primary-50 dark:hover:bg-dark-border'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {selectedCourse && !loading && (
        <div className="card p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">{selectedCourse}</h2>
              <p className="text-light-muted dark:text-dark-muted">
                This course is available in <span className="font-semibold text-light-text dark:text-dark-text">{filteredColleges.length}</span> college{filteredColleges.length === 1 ? '' : 's'}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchParams(selectedCategory === 'All' ? {} : { category: selectedCategory });
              }}
              className="btn-outline inline-flex items-center gap-2 !py-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back To Courses
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <CardSkeleton count={6} />
      ) : selectedCourse ? (
        filteredColleges.length === 0 ? (
          <div className="card p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No colleges found</h2>
            <p className="text-light-muted dark:text-dark-muted mb-5">
              No colleges matched the current search for this course.
            </p>
            <button type="button" onClick={() => setSearch('')} className="btn-primary">
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredColleges.map((course) => (
              <div key={course._id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="badge badge-orange">{course.category}</span>
                      {course.duration ? <span className="badge badge-blue">{course.duration} Years</span> : null}
                    </div>
                    <h2 className="text-xl font-semibold">{course.universityId?.name || 'University not linked'}</h2>
                  </div>
                </div>

                <div className="space-y-3 text-sm mb-5">
                  <p className="flex items-center gap-2 text-light-muted dark:text-dark-muted">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span className="text-light-text dark:text-dark-text font-medium">{selectedCourse}</span>
                  </p>
                  <p className="flex items-center gap-2 text-light-muted dark:text-dark-muted">
                    <MapPin className="w-4 h-4 text-primary" />
                    {course.universityId?.city && course.universityId?.state
                      ? `${course.universityId.city}, ${course.universityId.state}`
                      : 'Location unavailable'}
                  </p>
                  <p className="text-light-muted dark:text-dark-muted">
                    Eligibility: <span className="text-light-text dark:text-dark-text">{course.eligibility || 'Check with university'}</span>
                  </p>
                </div>

                {!!course.specializations?.length && (
                  <div className="mb-5">
                    <p className="text-sm font-medium mb-3">Available Specializations</p>
                    <div className="flex flex-wrap gap-2">
                      {course.specializations.slice(0, 6).map((specialization) => (
                        <span key={specialization.name} className="px-3 py-1 rounded-full text-xs bg-primary-50 text-primary">
                          {specialization.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {course.universityId?.slug ? (
                    <Link to={`/universities/${course.universityId.slug}`} className="btn-primary inline-flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> View University
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredCourseGroups.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No courses found</h2>
          <p className="text-light-muted dark:text-dark-muted mb-5">
            Backend is connected, but this filter/search combination returned no results.
          </p>
          <button type="button" onClick={() => { setSearch(''); setSearchParams({}); }} className="btn-primary">
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCourseGroups.map((group) => (
            <button
              key={group.name}
              type="button"
              onClick={() => setSearchParams({
                ...(selectedCategory !== 'All' ? { category: selectedCategory } : {}),
                course: group.name,
              })}
              className="card p-6 text-left hover:border-primary transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="badge badge-orange">{group.category}</span>
                {group.duration ? <span className="badge badge-blue">{group.duration} Years</span> : null}
              </div>
              <h2 className="text-xl font-semibold mb-3">{group.name}</h2>
              <p className="text-sm text-light-muted dark:text-dark-muted mb-4">
                Available in {group.collegeCount} college{group.collegeCount === 1 ? '' : 's'}
              </p>
              {!!group.entranceExams.length && (
                <div className="flex flex-wrap gap-2">
                  {group.entranceExams.slice(0, 3).map((exam) => (
                    <span key={exam} className="px-3 py-1 rounded-full text-xs bg-light-card dark:bg-dark-card">
                      {exam}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
