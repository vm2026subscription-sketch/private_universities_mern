import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Check, GraduationCap, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const EXAMPLE_UNIVERSITIES = ['BITS Pilani', 'MAHE Manipal', 'Symbiosis International University'];

const formatValue = (type, value) => {
  if (value === null || value === undefined) return 'N/A';
  if (type === 'currency') return `Rs ${Number(value).toLocaleString()}`;
  return Number(value).toLocaleString();
};

export default function UniversityComparison() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedUniversities, setSelectedUniversities] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoadingResults(true);
      try {
        const { data } = await api.get(`/universities/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoadingResults(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const selectedIds = useMemo(
    () => new Set(selectedUniversities.map((university) => university._id)),
    [selectedUniversities]
  );

  const addUniversity = (university) => {
    if (selectedIds.has(university._id)) return;
    if (selectedUniversities.length >= 4) {
      toast.error('You can compare up to 4 universities');
      return;
    }

    setSelectedUniversities((current) => [...current, university]);
    setQuery('');
    setResults([]);
  };

  const removeUniversity = (universityId) => {
    setSelectedUniversities((current) => current.filter((university) => university._id !== universityId));
    setComparison(null);
  };

  const runComparison = async () => {
    if (selectedUniversities.length < 2) {
      toast.error('Select at least 2 universities to compare');
      return;
    }

    setComparing(true);
    try {
      const { data } = await api.post('/universities/compare', {
        universityIds: selectedUniversities.map((university) => university._id),
      });
      setComparison(data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load comparison');
    } finally {
      setComparing(false);
    }
  };

  const summaryLabels = {
    ranking: 'Best Ranking',
    placements: 'Best Placements',
    affordability: 'Most Affordable',
    courseBreadth: 'Most Course Options',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 pb-20 md:pb-10 space-y-8">
      <section className="card p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <span className="badge badge-blue mb-4 inline-flex">Backend Powered Tool</span>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">University Comparison</h1>
            <p className="text-light-muted dark:text-dark-muted">
              Compare fees, placements, rankings, approvals, courses, and entrance exams using your website's real university data.
            </p>
          </div>

          <button
            type="button"
            onClick={runComparison}
            disabled={selectedUniversities.length < 2 || comparing}
            className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {comparing ? 'Comparing...' : 'Compare Universities'}
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Search University</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type university name..."
                className="w-full rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {(loadingResults || results.length > 0) && (
              <div className="mt-3 border border-light-border dark:border-dark-border rounded-2xl overflow-hidden">
                {loadingResults && <p className="px-4 py-3 text-sm text-light-muted dark:text-dark-muted">Searching universities...</p>}
                {!loadingResults && results.map((university) => (
                  <button
                    key={university._id}
                    type="button"
                    onClick={() => addUniversity(university)}
                    className="w-full px-4 py-3 text-left hover:bg-light-card dark:hover:bg-dark-card border-b last:border-b-0 border-light-border dark:border-dark-border"
                  >
                    <p className="font-medium">{university.name}</p>
                    <p className="text-xs text-light-muted dark:text-dark-muted">{university.city}, {university.state}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-light-card dark:bg-dark-card p-5">
            <p className="text-sm font-semibold mb-3">Quick Try</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_UNIVERSITIES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setQuery(name)}
                  className="px-3 py-2 rounded-full text-sm bg-white dark:bg-dark-bg border border-light-border dark:border-dark-border hover:border-primary"
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-4">
              Select 2 to 4 universities to generate a direct comparison table.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Selected Universities</h2>
            <span className="text-sm text-light-muted dark:text-dark-muted">{selectedUniversities.length}/4 selected</span>
          </div>
          {selectedUniversities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-light-border dark:border-dark-border p-6 text-sm text-light-muted dark:text-dark-muted">
              No universities selected yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {selectedUniversities.map((university) => (
                <div key={university._id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold line-clamp-2">{university.name}</p>
                      <p className="text-xs text-light-muted dark:text-dark-muted mt-1">{university.city}, {university.state}</p>
                    </div>
                    <button type="button" onClick={() => removeUniversity(university._id)} className="text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {comparison && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {Object.entries(summaryLabels).map(([key, label]) => {
              const winnerIds = comparison.summary.bestFor[key] || [];
              const winnerNames = comparison.universities
                .filter((university) => winnerIds.includes(university._id))
                .map((university) => university.name);

              return (
                <div key={key} className="card p-5">
                  <p className="text-sm text-light-muted dark:text-dark-muted mb-2">{label}</p>
                  <p className="font-semibold">{winnerNames.length ? winnerNames.join(', ') : 'N/A'}</p>
                </div>
              );
            })}
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-6">
            <div className="card p-6 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-light-border dark:border-dark-border">
                    <th className="text-left py-3 px-3">Metric</th>
                    {comparison.universities.map((university) => (
                      <th key={university._id} className="text-left py-3 px-3">{university.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.comparisonRows.map((row) => (
                    <tr key={row.key} className="border-b border-light-border dark:border-dark-border">
                      <td className="py-3 px-3 font-medium">{row.label}</td>
                      {row.values.map((entry) => (
                        <td key={`${row.key}-${entry.universityId}`} className="py-3 px-3">
                          <div className={`inline-flex items-center gap-2 ${row.bestUniversityIds.includes(entry.universityId) ? 'text-primary font-semibold' : ''}`}>
                            {row.bestUniversityIds.includes(entry.universityId) && <Check className="w-4 h-4" />}
                            <span>{formatValue(row.type, entry.value)}</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-6">
              <div className="card p-5">
                <h3 className="font-semibold mb-3">Common Course Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {(comparison.summary.commonCourseCategories || []).length ? comparison.summary.commonCourseCategories.map((category) => (
                    <span key={category} className="badge badge-blue">{category}</span>
                  )) : <span className="text-sm text-light-muted dark:text-dark-muted">No common categories found.</span>}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold mb-3">Common Entrance Exams</h3>
                <div className="flex flex-wrap gap-2">
                  {(comparison.summary.commonEntranceExams || []).length ? comparison.summary.commonEntranceExams.map((exam) => (
                    <span key={exam} className="badge badge-orange">{exam}</span>
                  )) : <span className="text-sm text-light-muted dark:text-dark-muted">No common exams found.</span>}
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {comparison.universities.map((university) => (
              <div key={university._id} className="card p-6">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-dark-border flex items-center justify-center text-primary">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{university.name}</h3>
                    <p className="text-sm text-light-muted dark:text-dark-muted">{university.city}, {university.state} • {university.type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-2xl bg-light-card dark:bg-dark-card p-3">
                    <p className="text-xs text-light-muted dark:text-dark-muted">NAAC</p>
                    <p className="font-semibold mt-1">{university.naacGrade}</p>
                  </div>
                  <div className="rounded-2xl bg-light-card dark:bg-dark-card p-3">
                    <p className="text-xs text-light-muted dark:text-dark-muted">NIRF</p>
                    <p className="font-semibold mt-1">{university.nirfRank || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium mb-2">Approvals</p>
                    <div className="flex flex-wrap gap-2">
                      {university.approvals.length ? university.approvals.map((approval) => (
                        <span key={approval} className="badge badge-green">{approval}</span>
                      )) : <span className="text-light-muted dark:text-dark-muted">N/A</span>}
                    </div>
                  </div>

                  <div>
                    <p className="font-medium mb-2">Top Recruiters</p>
                    <div className="flex flex-wrap gap-2">
                      {university.topRecruiters.length ? university.topRecruiters.map((recruiter) => (
                        <span key={recruiter} className="badge badge-blue">{recruiter}</span>
                      )) : <span className="text-light-muted dark:text-dark-muted">N/A</span>}
                    </div>
                  </div>

                  <div>
                    <p className="font-medium mb-2">Popular Courses</p>
                    <div className="space-y-2">
                      {university.featuredCourses.length ? university.featuredCourses.map((course) => (
                        <div key={`${university._id}-${course.name}-${course.category}`} className="rounded-2xl bg-light-card dark:bg-dark-card px-4 py-3">
                          <p className="font-medium">{course.name}</p>
                          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
                            {course.category} • {course.duration || 'N/A'} years • {course.feesPerYear ? `Rs ${course.feesPerYear.toLocaleString()}/yr` : 'Fees N/A'}
                          </p>
                        </div>
                      )) : <p className="text-light-muted dark:text-dark-muted">No course data available.</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
