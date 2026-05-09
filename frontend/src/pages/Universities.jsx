import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Bookmark, Filter, X, Star, Download, BookOpen, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { calculateFitScore } from '../utils/fitScore';

const states = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi NCR', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal'
];
const naacGrades = ['A++','A+','A','B++','B','Not Rated'];

export default function Universities() {
  const { user } = useAuth();
  const [universities, setUniversities] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('ranking');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';
  const initialState = searchParams.get('state');
  const initialCity = searchParams.get('city');
  
  const [filters, setFilters] = useState({ 
    state: initialState ? [initialState] : [], 
    type: 'both', 
    naacGrade: [],
    city: initialCity || ''
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const newState = searchParams.get('state');
    const newCity = searchParams.get('city');
    
    setFilters(f => ({
      ...f,
      state: newState ? [newState] : f.state,
      city: newCity || f.city
    }));
    setPage(1);
  }, [location.search]);

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
    if (initialSearch) params.set('search', initialSearch);
    if (filters.state.length) params.set('state', filters.state.join(','));
    if (filters.city) params.set('city', filters.city);
    if (filters.type !== 'both') params.set('type', filters.type);
    if (filters.naacGrade.length) params.set('naacGrade', filters.naacGrade.join(','));
    params.set('sort', sort);
    params.set('page', page);
    params.set('limit', 12);
    api.get(`/universities?${params}`).then(({ data }) => {
      if (page === 1) {
        setUniversities(data.data || []);
      } else {
        setUniversities(prev => [...prev, ...(data.data || [])]);
      }
      setTotal(data.total || 0);
    }).catch(() => setUniversities([])).finally(() => setLoading(false));
  }, [filters, sort, page, initialSearch]);

  const toggleFilter = (key, value) => {
    setFilters(f => {
      // All filters are now single select
      const currentValues = f[key];
      const isSelected = currentValues.includes(value);
      return { ...f, [key]: isSelected ? [] : [value] };
    });
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

          </select>
          <button onClick={() => setShowFilters(!showFilters)} className="md:hidden p-2 rounded-xl border border-light-border dark:border-dark-border">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md p-6 overflow-y-auto' : 'hidden'} md:block md:static md:w-72 shrink-0`}>
          <div className="bg-white dark:bg-dark-card rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-xl h-full md:h-auto overflow-y-auto md:overflow-visible">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-lg">Filters</h3>
              <button className="md:hidden" onClick={() => setShowFilters(false)}><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-8">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">State</h4>
                <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {states.map(s => (
                    <label key={s} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                      <input 
                        type="radio" 
                        name="state"
                        checked={filters.state.includes(s)} 
                        onChange={() => toggleFilter('state', s)} 
                        className="w-4 h-4 text-primary focus:ring-primary border-slate-300"
                      />
                      <span className={`text-sm font-bold transition-colors ${filters.state.includes(s) ? 'text-primary' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Institution Type</h4>
                <div className="space-y-2">
                  {['both','private','deemed'].map(t => (
                    <label key={t} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                      <input 
                        type="radio" 
                        name="type" 
                        checked={filters.type === t} 
                        onChange={() => { setFilters(f => ({ ...f, type: t })); setPage(1); }} 
                        className="w-4 h-4 text-primary focus:ring-primary border-slate-300"
                      />
                      <span className={`text-sm font-bold transition-colors ${filters.type === t ? 'text-primary' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                        {t === 'both' ? 'All Types' : t === 'deemed' ? 'Deemed University' : 'Private University'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">NAAC Grade</h4>
                <div className="space-y-2">
                  {naacGrades.map(g => (
                    <label key={g} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                      <input 
                        type="radio" 
                        name="naacGrade"
                        checked={filters.naacGrade.includes(g)} 
                        onChange={() => toggleFilter('naacGrade', g)} 
                        className="w-4 h-4 text-primary focus:ring-primary border-slate-300"
                      />
                      <span className={`text-sm font-bold transition-colors ${filters.naacGrade.includes(g) ? 'text-primary' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>{g}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => { setFilters({ state: [], type: 'both', naacGrade: [] }); setPage(1); }} 
              className="w-full mt-8 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all"
            >
              Reset Filters
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <p className="text-sm text-light-muted mb-4">{total} universities found</p>
          {loading ? <CardSkeleton /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {universities.map(u => {
                 const isSaved = savedIds.includes(u._id);
                 const userPrefs = user?.profile;
                 const fitScore = calculateFitScore(u, userPrefs);
                 
                  return (
                    <motion.div 
                      key={u._id} 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative h-full min-h-[380px] [perspective:1500px]"
                    >
                      <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${u.overview ? 'group-hover:[transform:rotateY(180deg)]' : ''}`}>
                        {/* Front Face */}
                        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-white dark:bg-dark-card rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-lg flex flex-col overflow-hidden">
                          {/* Top Badges */}
                          <div className="absolute top-5 left-5 z-20 flex gap-2">
                            {u.type && (
                              <div className="bg-white/90 backdrop-blur-md text-slate-900 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border border-slate-100">
                                {u.type}
                              </div>
                            )}
                          </div>

                          {/* Bookmark Button */}
                          <button 
                            onClick={(e) => { e.preventDefault(); handleBookmark(u._id); }}
                            className={`absolute top-5 right-5 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-90 ${isSaved ? 'bg-primary text-white' : 'bg-white/90 backdrop-blur-md text-slate-400 hover:text-primary hover:bg-white'}`}
                          >
                            <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
                          </button>
                          
                          <div className="p-6 pt-16 flex flex-col h-full relative">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 blur-[40px] rounded-full" />
                            
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex items-center gap-4 mb-5">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-md border border-slate-50 p-2 flex items-center justify-center overflow-hidden shrink-0">
                                  {u.logoUrl ? (
                                    <img src={u.logoUrl} alt={u.name} className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-2xl font-black text-primary">{u.name[0]}</span>
                                  )}
                                </div>
                                <div>
                                   <h3 className="text-lg font-black text-slate-900 dark:text-white line-clamp-2 leading-tight">{u.name}</h3>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-6 px-1">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                {u.city === 'Unknown' ? u.state : `${u.city}, ${u.state}`}
                              </div>

                              <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                                {u.naacGrade && (
                                  <div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                    <Award className="w-3 h-3" /> NAAC {u.naacGrade}
                                  </div>
                                )}
                                {u.nirfRank && (
                                  <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                    <Star className="w-3 h-3 fill-orange-600" /> #{u.nirfRank} NIRF
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <Link 
                                  to={`/universities/${u.slug}`}
                                  className="flex-1 py-3 bg-slate-900 dark:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                                >
                                  View Details
                                </Link>
                                {u.links?.brochureLink && (
                                  <button 
                                    onClick={(e) => { e.preventDefault(); window.open(u.links.brochureLink, '_blank'); }}
                                    className="w-12 h-12 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white rounded-xl flex items-center justify-center transition-all shrink-0 active:scale-95"
                                    title="Download Brochure"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Back Face (Overview) - Only render if overview exists */}
                        {u.overview && (
                          <div className="absolute inset-0 w-full h-full [transform:rotateY(180deg)] [backface-visibility:hidden] bg-gradient-to-br from-orange-500 to-primary rounded-[2.5rem] p-8 flex flex-col text-white shadow-2xl overflow-hidden z-30">
                             <h3 className="text-2xl font-black mb-4 flex items-center gap-2"><BookOpen className="w-6 h-6" /> Overview</h3>
                             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 text-sm text-white/90 leading-relaxed font-medium">
                               {u.overview}
                             </div>
                             <Link 
                                to={`/universities/${u.slug}`}
                                className="mt-6 py-3 w-full bg-white text-primary font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-lg active:scale-95"
                              >
                                Explore Full Details
                             </Link>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
              })}
            </div>
          )}

          {universities.length < total && !loading && (
            <div className="mt-10 text-center">
              <button 
                onClick={() => setPage(prev => prev + 1)}
                className="btn-outline !py-2.5 !px-8"
              >
                Load More Universities
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
