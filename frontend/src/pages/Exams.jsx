import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, FileCheck2, Landmark, Search } from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';

const CATEGORY_LABELS = ['all', 'engineering', 'medical', 'management', 'law', 'others'];

export default function Exams() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadExams = async () => {
      setLoading(true);
      try {
        const query = selectedCategory === 'all' ? '' : `?category=${selectedCategory}`;
        const { data } = await api.get(`/exams${query}`);
        if (active) setExams(data.data || []);
      } catch {
        if (active) setExams([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadExams();
    return () => {
      active = false;
    };
  }, [selectedCategory]);

  const filteredExams = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return exams;

    return exams.filter((exam) => (
      [
        exam.name,
        exam.shortName,
        exam.conductingBody,
        exam.category,
        exam.eligibility,
      ].join(' ').toLowerCase().includes(query)
    ));
  }, [exams, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-20 md:pb-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-10">
        <div>
          <span className="badge badge-orange mb-4 inline-flex">Exam Updates</span>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3 text-primary">Upcoming Entrance Exams</h1>
          <p className="text-light-muted dark:text-dark-muted max-w-2xl">
            Track exam dates, registration deadlines, eligibility, and official links from the backend.
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search exam or conducting body..."
            className="w-full rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
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

      {loading ? (
        <CardSkeleton count={6} />
      ) : filteredExams.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No exams available</h2>
          <p className="text-light-muted dark:text-dark-muted">
            Either no exams are seeded yet or the selected filter returned nothing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredExams.map((exam) => (
            <div key={exam._id} className="card p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {exam.shortName ? <span className="badge badge-blue">{exam.shortName}</span> : null}
                    <span className="badge badge-orange capitalize">{exam.category || 'others'}</span>
                  </div>
                  <h2 className="text-xl font-serif font-bold">{exam.name}</h2>
                </div>
                {exam.officialUrl ? (
                  <a href={exam.officialUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm inline-flex items-center gap-1">
                    Official <ExternalLink className="w-4 h-4" />
                  </a>
                ) : null}
              </div>

              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2 text-light-muted dark:text-dark-muted">
                  <Landmark className="w-4 h-4 text-primary" />
                  <span className="text-light-text dark:text-dark-text">{exam.conductingBody || 'Conducting body not listed'}</span>
                </p>
                <p className="flex items-center gap-2 text-light-muted dark:text-dark-muted">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Exam Date: <span className="text-light-text dark:text-dark-text">{exam.examDate ? new Date(exam.examDate).toLocaleDateString() : 'TBA'}</span>
                </p>
                <p className="flex items-center gap-2 text-light-muted dark:text-dark-muted">
                  <FileCheck2 className="w-4 h-4 text-primary" />
                  Registration Deadline: <span className="text-light-text dark:text-dark-text">{exam.registrationDeadline ? new Date(exam.registrationDeadline).toLocaleDateString() : 'TBA'}</span>
                </p>
              </div>

              <div className="mt-5 p-4 rounded-2xl bg-light-card dark:bg-dark-card">
                <p className="text-sm font-medium mb-2">Eligibility</p>
                <p className="text-sm text-light-muted dark:text-dark-muted">{exam.eligibility || 'Check official brochure for detailed eligibility.'}</p>
              </div>

              {exam.participatingUniversities ? (
                <p className="mt-4 text-sm text-light-muted dark:text-dark-muted">
                  Participating Universities: <span className="font-medium text-light-text dark:text-dark-text">{exam.participatingUniversities}</span>
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
