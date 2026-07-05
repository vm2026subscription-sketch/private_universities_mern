import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Filter, X, GraduationCap } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { getUniversityDisplayType } from '../utils/universityType';
import { generateBrochure } from '../utils/brochureGenerator';
import LeadCaptureModal from '../components/university/LeadCaptureModal';
import UniversityCard from '../components/university/UniversityCard';
import PageContainer from '../components/ui/PageContainer';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import EmptyState from '../components/ui/EmptyState';
import SectionHeading from '../components/ui/SectionHeading';


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
  const [downloadingId, setDownloadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('ranking');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [selectedUni, setSelectedUni] = useState(null);
  const [leadType, setLeadType] = useState('apply');
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
      state: newState ? [newState] : [],
      city: newCity || ''
    }));
    setPage(1);
  }, [location.search]);

  useEffect(() => {
    if (!user) {
      setSavedIds([]);
      return;
    }

    api.get('/users/saved-universities')
      .then(({ data }) => {
        const ids = Array.isArray(data?.data) ? data.data.map((item) => item._id) : [];
        setSavedIds(ids);
      })
      .catch(() => {
        setSavedIds([]);
      });
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

  const handleDownloadBrochure = async (university) => {
    try {
      setDownloadingId(university._id);
      // Fetch full university data so the brochure has all details
      const { data } = await api.get(`/universities/${university.slug || university._id}`);
      const fullData = data?.data || university;
      generateBrochure(fullData);
      toast.success('Brochure downloaded!');
    } catch (error) {
      console.error('Brochure download failed:', error);
      // Fall back to generating with whatever data we already have
      try {
        generateBrochure(university);
        toast.success('Brochure downloaded!');
      } catch (pdfErr) {
        toast.error('Failed to generate brochure. Please try again.');
      }
    } finally {
      setDownloadingId(null);
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
      const currentValues = f[key];
      const isSelected = currentValues.includes(value);
      if (key === 'state') {
        return { ...f, state: isSelected ? [] : [value] };
      }
      return { ...f, [key]: isSelected ? currentValues.filter(v => v !== value) : [...currentValues, value] };
    });
    setPage(1);
  };

  return (
    <PageContainer className="py-8">
      <Helmet>
        <title>Universities in India | Fees, Rankings & Admissions 2026 | VidyarthiMitra</title>
        <meta name="description" content="Explore 500+ private and deemed universities in India. Compare fees, NAAC grades, NIRF rankings, placements and admission process." />
      </Helmet>

      <Breadcrumbs items={[{ label: 'Universities' }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <SectionHeading title="Universities" description={`${total} institutions found`} className="mb-0" />
        <div className="flex items-center gap-3">
          <label htmlFor="sort-universities" className="sr-only">Sort by</label>
          <select
            id="sort-universities"
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="input-field !w-auto !py-2 text-body-sm"
          >
            <option value="ranking">By Ranking</option>
            <option value="name">Name A-Z</option>
            <option value="package">Avg Package</option>
          </select>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-md border border-light-border dark:border-dark-border"
            aria-label="Toggle filters"
            aria-expanded={showFilters}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md p-6 overflow-y-auto' : 'hidden'} md:block md:static md:w-72 shrink-0`}>
          <div className="card p-6 h-full md:h-auto overflow-y-auto md:overflow-visible md:sticky md:top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-h3">Filters</h3>
              <button type="button" className="md:hidden" onClick={() => setShowFilters(false)} aria-label="Close filters">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-8">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">State</h4>
                <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {states.map(s => (
                    <label key={s} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                      <input 
                        type="checkbox" 
                        checked={filters.state.includes(s)} 
                        onChange={() => toggleFilter('state', s)} 
                        className="w-4 h-4 text-primary focus:ring-primary border-slate-300 rounded"
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
                        type="checkbox"
                        checked={filters.naacGrade.includes(g)} 
                        onChange={() => toggleFilter('naacGrade', g)} 
                        className="w-4 h-4 text-primary focus:ring-primary border-slate-300 rounded"
                      />
                      <span className={`text-sm font-bold transition-colors ${filters.naacGrade.includes(g) ? 'text-primary' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>{g}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => { setFilters({ state: [], type: 'both', naacGrade: [], city: '' }); setPage(1); }}
              className="btn-outline w-full mt-6 !text-body-sm"
            >
              Reset Filters
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {loading ? <CardSkeleton /> : universities.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No universities found"
              description="Try adjusting your filters or search term to discover more institutions."
              actionLabel="Clear filters"
              onAction={() => setFilters({ state: [], type: 'both', naacGrade: [], city: '' })}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {universities.map(u => (
                <UniversityCard
                  key={u._id}
                  university={{ ...u, displayType: getUniversityDisplayType(u) }}
                  isSaved={savedIds.includes(u._id)}
                  onBookmark={handleBookmark}
                  onDownloadBrochure={handleDownloadBrochure}
                  downloading={downloadingId === u._id}
                  showApply
                  onApply={(uni) => {
                    setSelectedUni(uni);
                    setLeadModalOpen(true);
                    setLeadType('apply');
                  }}
                />
              ))}
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
      <LeadCaptureModal 
        isOpen={leadModalOpen} 
        onClose={() => setLeadModalOpen(false)} 
        university={selectedUni} 
        leadType={leadType} 
      />
    </PageContainer>
  );
}
