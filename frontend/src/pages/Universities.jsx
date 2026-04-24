import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bookmark, Filter, X } from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const states = ['Maharashtra','Karnataka','Gujarat','Delhi NCR','Uttar Pradesh','Rajasthan','Madhya Pradesh','Tamil Nadu','Telangana','Kerala','West Bengal'];
const naacGrades = ['A++','A+','A','B++','B','Not Rated'];

export default function Universities() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ state: [], type: 'both', naacGrade: [] });
  const [sort, setSort] = useState('ranking');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState([]);

  useEffect(() => {
    if (user) {
      api.get('/users/saved-universities').then(({ data }) => setSavedIds(data.data.map(u => u._id))).catch(() => {});
    } else {
      setSavedIds([]);
    }
  }, [user]);

  const handleBookmark = async (universityId) => {
    if (!user) return toast.error('Please login to save universities');
    try {
      if (savedIds.includes(universityId)) {
        await api.delete(`/users/saved-universities/${universityId}`);
        setSavedIds(prev => prev.filter(id => id !== universityId));
        toast.success('Removed from saved');
      } else {
        await api.post(`/users/saved-universities/${universityId}`);
        setSavedIds(prev => [...prev, universityId]);
        toast.success('Saved to profile');
      }
    } catch (error) {
      toast.error('Failed to update saved status');
    }
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.state.length) params.set('state', filters.state.join(','));
    if (filters.type !== 'both') params.set('type', filters.type);
    if (filters.naacGrade.length) params.set('naacGrade', filters.naacGrade.join(','));
    params.set('sort', sort);
    params.set('page', page);
    params.set('limit', 12);
    api.get(`/universities?${params}`).then(({ data }) => {
      setUniversities(data.data || []);
      setTotal(data.total || 0);
    }).catch(() => setUniversities([])).finally(() => setLoading(false));
  }, [filters, sort, page]);

  const toggleFilter = (key, value) => {
    setFilters(f => ({
      ...f, [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value]
    }));
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-20 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Universities</h1>
        <div className="flex items-center gap-3">
          <select value={sort} onChange={e => setSort(e.target.value)} className="input-field !w-auto !py-2 text-sm">
            <option value="ranking">By Ranking</option>
            <option value="name">Name A-Z</option>
            <option value="package">Avg Package</option>
            <option value="established">Established Year</option>
          </select>
          <button onClick={() => setShowFilters(!showFilters)} className="md:hidden p-2 rounded-xl border border-light-border dark:border-dark-border">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-white dark:bg-dark-bg p-6 overflow-y-auto' : 'hidden'} md:block md:static md:w-64 shrink-0`}>
          <div className="flex items-center justify-between mb-4 md:hidden">
            <h3 className="font-bold">Filters</h3>
            <button onClick={() => setShowFilters(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-sm mb-3">State</h4>
              {states.map(s => (
                <label key={s} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                  <input type="checkbox" checked={filters.state.includes(s)} onChange={() => toggleFilter('state', s)} className="rounded text-primary" />
                  {s}
                </label>
              ))}
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Type</h4>
              {['both','private','deemed'].map(t => (
                <label key={t} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                  <input type="radio" name="type" checked={filters.type === t} onChange={() => { setFilters(f => ({ ...f, type: t })); setPage(1); }} />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </label>
              ))}
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">NAAC Grade</h4>
              {naacGrades.map(g => (
                <label key={g} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                  <input type="checkbox" checked={filters.naacGrade.includes(g)} onChange={() => toggleFilter('naacGrade', g)} className="rounded text-primary" />
                  {g}
                </label>
              ))}
            </div>
            <button onClick={() => { setFilters({ state: [], type: 'both', naacGrade: [] }); setPage(1); }} className="text-sm text-primary font-medium">Clear All Filters</button>
          </div>
        </aside>

        <div className="flex-1">
          <p className="text-sm text-light-muted mb-4">{total} universities found</p>
          {loading ? <CardSkeleton /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {universities.map(u => {
                 const isSaved = savedIds.includes(u._id);
                 
                 return (
                <div key={u._id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Link to={`/universities/${u.slug}`} className="font-semibold hover:text-primary line-clamp-1">{u.name}</Link>
                      <p className="text-sm text-light-muted flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{u.city}, {u.state}</p>
                    </div>
                    <button className={`p-1.5 rounded-lg border dark:border-dark-border ${isSaved ? 'bg-primary text-white border-primary' : 'hover:bg-light-card dark:hover:bg-dark-border'}`} onClick={() => handleBookmark(u._id)}>
                       <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-3">
                    <span className={`badge ${u.type === 'deemed' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'badge-orange'}`}>{u.type}</span>
                    {u.naacGrade && <span className="badge badge-green">NAAC {u.naacGrade}</span>}
                    {u.nirfRank && <span className="badge badge-blue">#{u.nirfRank}</span>}
                  </div>
                  <div className="text-sm text-light-muted dark:text-dark-muted space-y-1 mb-4">
                    {u.stats?.avgPackageLPA && <p>Avg Package: ₹{u.stats.avgPackageLPA} LPA</p>}
                    {u.stats?.placementPercentage && <p>Placement: {u.stats.placementPercentage}%</p>}
                  </div>
                  <Link to={`/universities/${u.slug}`} className="btn-primary w-full text-center block text-sm !py-2">View Details</Link>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
