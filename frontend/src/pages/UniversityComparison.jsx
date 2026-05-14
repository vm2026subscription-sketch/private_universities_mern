import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Check, GraduationCap, Search, Trash2, MapPin, X, Scale, Layers, Sparkles, GripVertical, AlertCircle, Loader2, Award, Star, ArrowUpRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import api from '../utils/api';

const EXAMPLE_UNIVERSITIES = ['BITS Pilani', 'MAHE Manipal', 'Symbiosis International', 'Amity University'];

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
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('compareRecentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

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

  const saveRecentSearch = (university) => {
    const updated = [university, ...recentSearches.filter(u => u._id !== university._id)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('compareRecentSearches', JSON.stringify(updated));
  };

  const addUniversity = (university) => {
    if (selectedIds.has(university._id)) {
      toast.error('University already selected');
      return;
    }
    if (selectedUniversities.length >= 4) {
      toast.error('You can compare up to 4 universities');
      return;
    }

    setSelectedUniversities((current) => [...current, university]);
    saveRecentSearch(university);
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
      setTimeout(() => {
        document.getElementById('comparison-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-indigo-900/10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 space-y-12">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100 dark:border-indigo-500/20 mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI-Powered Analytics
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-serif font-black mb-4 text-slate-900 dark:text-white"
          >
            Smart University <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">Comparison</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 dark:text-slate-400 text-lg"
          >
            Make data-driven decisions. Compare up to 4 institutions side-by-side on fees, placements, rankings, and infrastructure.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start">
          {/* Left Column: Search & Selected */}
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative group z-40">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
              <div className="relative flex items-center bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-[2rem] shadow-lg overflow-hidden">
                <Search className="w-6 h-6 ml-6 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search university to add to comparison..."
                  className="w-full pl-4 pr-6 py-5 bg-transparent border-none outline-none text-lg text-slate-800 dark:text-white font-semibold placeholder:font-normal placeholder:text-slate-400"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="pr-6 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {(query?.trim()?.length > 0 || (query === '' && recentSearches?.length > 0)) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl shadow-2xl overflow-hidden z-50"
                  >
                    {loadingResults ? (
                      <div className="p-8 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                        <p className="text-sm font-bold">Searching database...</p>
                      </div>
                    ) : query?.trim()?.length > 0 ? (
                      results?.length > 0 ? (
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar py-2">
                          {results.map((university) => (
                            <button
                              key={university._id}
                              type="button"
                              onClick={() => addUniversity(university)}
                              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b last:border-b-0 border-light-border dark:border-dark-border group/item text-left"
                            >
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-bg flex items-center justify-center border border-slate-200 dark:border-dark-border shrink-0 p-1.5 overflow-hidden">
                                {university.logoUrl ? (
                                  <img src={university.logoUrl} alt="" className="w-full h-full object-contain" />
                                ) : (
                                  <GraduationCap className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white truncate group-hover/item:text-primary transition-colors">{university.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{university.city}, {university.state}</p>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <Check className="w-4 h-4" />
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-500">
                          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                          <p>No universities found for "{query}"</p>
                        </div>
                      )
                    ) : (
                      <div className="p-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2">Recent Searches</h4>
                        {recentSearches.map((u) => (
                          <button
                            key={u._id}
                            onClick={() => addUniversity(u)}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-left group/recent"
                          >
                            <Search className="w-4 h-4 text-slate-300 group-hover/recent:text-primary" />
                            <span className="font-semibold text-sm text-slate-700 dark:text-slate-300 truncate">{u.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Selected Universities */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Comparison Bench
                </h3>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${selectedUniversities.length >= 4 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 dark:bg-dark-card text-slate-500'}`}>
                  {selectedUniversities.length} / 4 Added
                </span>
              </div>

              {selectedUniversities.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white/50 dark:bg-dark-card/50 backdrop-blur-sm border-2 border-dashed border-slate-200 dark:border-dark-border rounded-[2rem] p-12 text-center"
                >
                  <div className="w-20 h-20 bg-slate-100 dark:bg-dark-bg rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-inner">
                    <Scale className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Bench is Empty</h3>
                  <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto">
                    Search and add up to 4 universities to see a detailed head-to-head comparison.
                  </p>
                </motion.div>
              ) : (
                <Reorder.Group 
                  axis="y" 
                  values={selectedUniversities} 
                  onReorder={setSelectedUniversities} 
                  className="space-y-3"
                >
                  <AnimatePresence>
                    {selectedUniversities.map((university) => (
                      <Reorder.Item 
                        key={university._id} 
                        value={university}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                        className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-4 shadow-sm flex items-center gap-4 group cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative"
                      >
                        <div className="w-8 flex items-center justify-center text-slate-300 hover:text-slate-500">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border p-1.5 flex items-center justify-center shrink-0">
                           {university.logoUrl ? (
                             <img src={university.logoUrl} alt="" className="w-full h-full object-contain" />
                           ) : (
                             <span className="text-lg font-black text-slate-400">{university.name[0]}</span>
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate pr-4">{university.name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {university.city}, {university.state}
                          </div>
                        </div>
                        <button 
                          onClick={() => removeUniversity(university._id)}
                          className="w-10 h-10 rounded-full bg-slate-50 dark:bg-dark-bg text-slate-400 hover:text-error hover:bg-error/10 flex items-center justify-center transition-colors shrink-0"
                          title="Remove from comparison"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              )}
            </div>
          </div>

          {/* Right Column: Actions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-card rounded-[2rem] border border-light-border dark:border-dark-border p-8 shadow-lg sticky top-24">
              <h3 className="text-lg font-black mb-2 text-slate-900 dark:text-white">Ready to Compare?</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">Add at least 2 universities to generate a comprehensive benchmark report.</p>
              
              <button
                onClick={runComparison}
                disabled={selectedUniversities.length < 2 || comparing}
                className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 ${
                  selectedUniversities.length >= 2 && !comparing
                    ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-100 dark:bg-dark-border text-slate-400 cursor-not-allowed'
                }`}
              >
                {comparing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generating Report...</>
                ) : (
                  <><Scale className="w-5 h-5" /> Compare {selectedUniversities.length > 0 ? selectedUniversities.length : ''} Universities</>
                )}
              </button>

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-dark-border">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 text-center">Popular Benchmarks</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {EXAMPLE_UNIVERSITIES.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setQuery(name);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2.5 rounded-full text-xs font-bold bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="comparison-results" className="scroll-mt-24">
        {comparison ? (
          <div className="max-w-7xl mx-auto px-4 pb-20">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <ArrowRightLeft className="w-8 h-8 text-primary" />
                  Comparison Results
                </h2>
              </div>

              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {Object.entries(summaryLabels).map(([key, label], idx) => {
                  const winnerIds = comparison?.summary?.bestFor?.[key] || [];
                  const winnerNames = comparison?.universities
                    .filter((university) => winnerIds.includes(university._id))
                    .map((university) => university.name);

                  return (
                    <motion.div 
                      key={key} 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white dark:bg-dark-card rounded-[2rem] p-6 border border-light-border dark:border-dark-border shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden"
                    >
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
                      <div className="flex items-center gap-3 mb-4 text-primary">
                         <Award className="w-5 h-5" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                      </div>
                      <p className="font-black text-lg text-slate-800 dark:text-white leading-tight">
                        {winnerNames?.length ? winnerNames.join(', ') : 'N/A'}
                      </p>
                    </motion.div>
                  );
                })}
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-8">
                <div className="bg-white dark:bg-dark-card rounded-[2rem] border border-light-border dark:border-dark-border shadow-lg overflow-x-auto custom-scrollbar relative">
                  <div className="p-8 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                    <h3 className="font-black text-lg">Detailed Metrics</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Head to Head</span>
                  </div>
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-light-border dark:border-dark-border bg-slate-50/50 dark:bg-dark-bg/50">
                        <th className="text-left py-5 px-8 font-black text-slate-400 text-[11px] uppercase tracking-widest">Metric</th>
                        {comparison.universities.map((university) => (
                          <th key={university._id} className="text-left py-5 px-6 font-bold text-slate-900 dark:text-white w-48">
                            <div className="flex items-center gap-3">
                              {university.logoUrl && <img src={university.logoUrl} className="w-6 h-6 object-contain" alt="" />}
                              <span className="truncate">{university.name}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.comparisonRows.map((row) => (
                        <tr key={row.key} className="border-b last:border-b-0 border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-5 px-8 font-bold text-slate-600 dark:text-slate-300">{row.label}</td>
                          {row.values.map((entry) => (
                            <td key={`${row.key}-${entry.universityId}`} className="py-5 px-6">
                              <div className={`inline-flex items-center gap-2 ${row.bestUniversityIds.includes(entry.universityId) ? 'text-emerald-600 font-black bg-emerald-50 px-3 py-1.5 rounded-lg' : 'text-slate-600 dark:text-slate-400 font-medium'}`}>
                                {row.bestUniversityIds.includes(entry.universityId) && <Check className="w-4 h-4 shrink-0" />}
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
                  <div className="bg-white dark:bg-dark-card rounded-[2rem] border border-light-border dark:border-dark-border shadow-lg p-8">
                    <h3 className="font-black mb-6 text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" /> Common Course Categories
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(comparison?.summary?.commonCourseCategories || []).length
                        ? comparison?.summary?.commonCourseCategories.map((category) => (
                          <span key={category} className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {category}
                          </span>
                        ))
                        : <span className="text-sm text-slate-500 font-medium">No common categories found.</span>}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-dark-card rounded-[2rem] border border-light-border dark:border-dark-border shadow-lg p-8">
                    <h3 className="font-black mb-6 text-slate-900 dark:text-white flex items-center gap-2">
                      <Check className="w-5 h-5 text-orange-500" /> Common Entrance Exams
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(comparison?.summary?.commonEntranceExams || []).length
                        ? comparison?.summary?.commonEntranceExams.map((exam) => (
                          <span key={exam} className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100">
                            {exam}
                          </span>
                        ))
                        : <span className="text-sm text-slate-500 font-medium">No common exams found.</span>}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {comparison.universities.map((university, idx) => (
                  <motion.div 
                    key={university._id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white dark:bg-dark-card rounded-[2rem] border border-light-border dark:border-dark-border shadow-lg p-8 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-start justify-between gap-4 mb-8">
                      <div className="flex gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border flex items-center justify-center p-2 shrink-0">
                           {university.logoUrl ? (
                             <img src={university.logoUrl} alt="" className="w-full h-full object-contain" />
                           ) : (
                             <GraduationCap className="w-8 h-8 text-primary" />
                           )}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 line-clamp-2">{university.name}</h3>
                          <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" /> {university.city}, {university.state}
                          </p>
                        </div>
                      </div>
                      {university.slug && (
                        <a href={`/universities/${university.slug}`} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shrink-0">
                          <ArrowUpRight className="w-5 h-5" />
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">NAAC Grade</p>
                        <p className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                           {university.naacGrade || 'N/A'}
                           {university.naacGrade && <Award className="w-4 h-4 text-green-500" />}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">NIRF Rank</p>
                        <p className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                           {university.nirfRank ? `#${university.nirfRank}` : 'N/A'}
                           {university.nirfRank && <Star className="w-4 h-4 text-orange-500 fill-orange-500" />}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Key Approvals</p>
                        <div className="flex flex-wrap gap-2">
                          {(university.approvals || []).length
                            ? university.approvals.map((approval) => (
                              <span key={approval} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">{approval}</span>
                            ))
                            : <span className="text-sm font-medium text-slate-400">N/A</span>}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Top Recruiters</p>
                        <div className="flex flex-wrap gap-2">
                          {(university.topRecruiters || []).length
                            ? university.topRecruiters.slice(0, 5).map((recruiter) => (
                              <span key={recruiter} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">{recruiter}</span>
                            ))
                            : <span className="text-sm font-medium text-slate-400">N/A</span>}
                          {(university.topRecruiters || []).length > 5 && (
                             <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-500">+{university.topRecruiters.length - 5} more</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Popular Courses</p>
                        <div className="space-y-3">
                          {(university.featuredCourses || []).length
                            ? university.featuredCourses.slice(0, 3).map((course) => (
                              <div key={`${university._id}-${course.name}`} className="flex items-center justify-between pb-3 border-b last:border-0 border-slate-100 dark:border-dark-border">
                                <div>
                                  <p className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">{course.name}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {course.category} • {course.duration ? `${course.duration}YRS` : 'N/A'}
                                  </p>
                                </div>
                                <div className="text-right">
                                   <p className="font-black text-sm text-primary">{course.feesPerYear ? `₹${(course.feesPerYear/100000).toFixed(1)}L` : 'N/A'}</p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Per Year</p>
                                </div>
                              </div>
                            ))
                            : <p className="text-sm font-medium text-slate-400">No course data available.</p>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </section>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
