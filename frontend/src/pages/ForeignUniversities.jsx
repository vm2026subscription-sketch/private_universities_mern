import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Globe, BookOpen, Clock, IndianRupee, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';

export default function ForeignUniversities() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadUniversities = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/universities?type=foreign&limit=50');
        if (active) {
          setUniversities(data.data || []);
        }
      } catch {
        if (active) {
          setUniversities([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadUniversities();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 pb-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Foreign Universities</h1>
        <p className="text-light-muted dark:text-dark-muted max-w-2xl mx-auto">
          Explore world-class international campuses established in India. Discover their courses, fees, and admission details directly.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((item) => <CardSkeleton key={item} count={1} />)}
        </div>
      ) : universities.length === 0 ? (
        <div className="text-center py-20">
          <Globe className="w-16 h-16 text-light-muted mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold">No foreign universities found</h3>
        </div>
      ) : (
        <div className="space-y-8">
          {universities.map((university) => {
            const courses = university.courses || [];

            return (
              <div key={university._id} className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start border-b border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-900/20">
                  <div className="w-24 h-24 shrink-0 bg-white border border-light-border dark:border-dark-border rounded-xl flex items-center justify-center p-2">
                    {university.logoUrl ? (
                      <img
                        src={university.logoUrl}
                        alt={university.name}
                        className="max-w-full max-h-full object-contain"
                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Globe className="w-10 h-10 text-light-muted opacity-50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2.5 py-1 text-xs font-bold bg-indigo-500/10 text-indigo-500 rounded-lg">
                        Foreign University
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{university.name}</h2>
                    <div className="flex items-center gap-2 text-light-muted dark:text-dark-muted text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>{university.city}{university.city && university.state ? ', ' : ''}{university.state}</span>
                    </div>
                  </div>
                  <Link to={`/universities/${university.slug}`} className="btn-primary whitespace-nowrap hidden md:inline-flex shrink-0">
                    View Full Profile <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>

                <div className="p-6 md:p-8">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Programs Offered
                  </h3>

                  {courses.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {courses.slice(0, 8).map((course) => (
                        <div key={course._id} className="p-4 rounded-xl border border-light-border dark:border-dark-border hover:border-primary/30 transition-colors">
                          <h4 className="font-bold text-primary mb-3">{course.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-light-muted dark:text-dark-muted">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              {course.duration || 'N/A'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <IndianRupee className="w-4 h-4" />
                              {course.feesPerYear ? `${course.feesPerYear.toLocaleString()}/yr` : 'Fees TBD'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-light-muted">No course details available yet.</p>
                  )}

                  <div className="mt-6 md:hidden">
                    <Link to={`/universities/${university.slug}`} className="btn-primary w-full justify-center">
                      View Full Profile <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
