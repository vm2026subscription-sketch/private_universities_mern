import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { 
  MapPin, Globe, Phone, Mail, BookOpen, Users, Award, 
  Building, Bookmark, Share2, Camera, ChevronRight, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';

const tabs = ['Overview'];

export default function UniversityDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const [uni, setUni] = useState(null);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 0);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/universities/${slug}`)
      .then(({ data }) => {
        const u = data.data;
        setUni(u);
        if (u) {
          const prev = JSON.parse(localStorage.getItem('vm_recent') || '[]');
          const filtered = prev.filter(r => r._id !== u._id);
          const entry = { _id: u._id, name: u.name, slug: u.slug, state: u.state, city: u.city, type: u.type, naacGrade: u.naacGrade, nirfRank: u.nirfRank };
          localStorage.setItem('vm_recent', JSON.stringify([entry, ...filtered].slice(0, 10)));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch university details:', err);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (user && uni) {
      api.get('/users/saved-universities').then(({ data }) => {
        setIsSaved(data.data.some(u => u._id === uni._id));
      }).catch(() => {});
    } else {
      setIsSaved(false);
    }
  }, [user, uni]);

  const handleBookmark = async () => {
    if (!user) return toast.error('Please login to save universities');
    try {
      if (isSaved) {
        await api.delete(`/users/saved-universities/${uni._id}`);
        setIsSaved(false);
        toast.success('Removed from saved');
      } else {
        await api.post(`/users/saved-universities/${uni._id}`);
        setIsSaved(true);
        toast.success('Saved to profile');
      }
    } catch {
      toast.error('Failed to update saved status');
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center">Loading...</div>;
  if (!uni) return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-500">University not found. Connect to backend to load data.</div>;

  return (
    <div className="bg-[#f8fafc] dark:bg-dark-bg min-h-screen">
      <Helmet>
        <title>{uni.name} | Fees, Placements, Admissions 2026 | VidyarthiMitra</title>
        <meta name="description" content={`Explore ${uni.name}, ${uni.city}. Get details on fees structure, placement statistics, NIRF ranking, courses, and admission process for 2026.`} />
        <meta name="keywords" content={`${uni.name}, ${uni.city} university, ${uni.name} fees, ${uni.name} placement, ${uni.name} admission 2026`} />
      </Helmet>
      {/* Header Banner */}
      <div className="h-48 md:h-64 bg-slate-900 relative overflow-hidden">
        {uni.bannerImageUrl ? (
          <img src={uni.bannerImageUrl} alt={uni.name} className="w-full h-full object-cover opacity-50" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-600 opacity-20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] dark:from-dark-bg to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-24 relative z-10">
        <div className="bg-white dark:bg-dark-card rounded-[3rem] p-8 md:p-10 shadow-2xl border border-slate-100 dark:border-white/5 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-end">
              {/* Logo */}
              <div className="w-32 h-32 rounded-[2.5rem] bg-white shadow-2xl border-4 border-white flex items-center justify-center overflow-hidden shrink-0">
                {uni.logoUrl ? (
                  <img src={uni.logoUrl} alt={uni.name} className="w-full h-full object-contain p-4" />
                ) : (
                  <span className="text-4xl font-black text-primary">{uni.name[0]}</span>
                )}
              </div>
              <div className="text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                  <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">{uni.type}</span>
                  {uni.naacGrade && <span className="bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">NAAC {uni.naacGrade}</span>}
                  {uni.nirfRank && <span className="bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">#{uni.nirfRank} NIRF</span>}
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">{uni.name}</h1>
                <p className="text-slate-500 font-bold flex items-center justify-center md:justify-start gap-2 uppercase text-xs tracking-widest">
                  <MapPin className="w-4 h-4 text-primary" /> {uni.city}, {uni.state}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button 
                onClick={handleBookmark}
                className={`p-4 rounded-2xl transition-all shadow-lg ${isSaved ? 'bg-primary text-white shadow-primary/30' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 shadow-slate-200/50'}`}
              >
                <Bookmark className="w-6 h-6" fill={isSaved ? "currentColor" : "none"} />
              </button>
              <button 
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
                className="p-4 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 shadow-lg shadow-slate-200/50 transition-all"
              >
                <Share2 className="w-6 h-6" />
              </button>
              {uni.website && (
                <a 
                  href={uni.website.startsWith('http') ? uni.website : `https://${uni.website}`} 
                  target="_blank" rel="noreferrer"
                  className="bg-primary text-white font-black text-sm px-8 py-4 rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 transition-all"
                >
                  APPLY NOW
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mt-12 pt-10 border-t border-slate-50 dark:border-white/5">
            {[
              { icon: Users, label: 'Students', value: uni.stats?.totalStudents?.toLocaleString() || '5,000+' },
              { icon: Award, label: 'Avg Package', value: uni.stats?.avgPackageLPA ? `₹${uni.stats.avgPackageLPA} LPA` : '4.5 LPA' },
              { icon: BookOpen, label: 'Courses', value: uni.stats?.totalCoursesCount || uni.courses?.length || 0, link: `/courses?universityId=${uni._id}&universityName=${encodeURIComponent(uni.name)}` },
              { icon: Building, label: 'Campus', value: uni.stats?.campusSizeAcres ? `${uni.stats.campusSizeAcres} Acres` : '50+ Acres' },
              { icon: CheckCircle2, label: 'Placement', value: uni.stats?.placementPercentage ? `${uni.stats.placementPercentage}%` : '85%' },
              { icon: Award, label: 'Highest Pkg', value: uni.stats?.highestPackageLPA ? `₹${uni.stats.highestPackageLPA} LPA` : '12 LPA' },
            ].map((s, i) => {
              const content = (
                <>
                  <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                    <s.icon className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-none group-hover:text-primary transition-colors">{s.value}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{s.label}</p>
                </>
              );

              return s.link ? (
                <Link key={i} to={s.link} className="text-center group block hover:-translate-y-1 transition-transform">
                  {content}
                </Link>
              ) : (
                <div key={i} className="text-center group">
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-10 pb-2 no-scrollbar">
          {tabs.map((t, i) => (
            <button 
              key={i} 
              onClick={() => setActiveTab(i)} 
              className={`whitespace-nowrap px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all
                ${activeTab === i ? 'bg-slate-900 text-white shadow-xl' : 'bg-white dark:bg-dark-card text-slate-400 hover:text-primary border border-slate-100 dark:border-white/5'}
              `}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-dark-card rounded-[3rem] p-10 border border-slate-100 dark:border-white/5 shadow-sm mb-20 min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 0 && (
                <div className="space-y-12">
                  <div>
                    <h2 className="text-2xl font-black mb-6">About the Institution</h2>
                    <p className="text-slate-500 font-medium leading-relaxed text-lg">
                      {uni.description || `${uni.name} is a leading ${uni.type} institution located in the educational hub of ${uni.city}, ${uni.state}. Established with a vision to provide world-class education, it offers a wide range of undergraduate and postgraduate programs across various disciplines.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary border-b border-primary/10 pb-4">Campus Contacts</h3>
                      <div className="space-y-5">
                         {[
                           { icon: MapPin, value: uni.address || `${uni.city}, ${uni.state}` },
                           { icon: Globe, value: uni.website, link: true },
                           { icon: Mail, value: uni.email || `admissions@${uni.slug}.edu.in` },
                           { icon: Phone, value: uni.phone || '+91 000 000 0000' }
                         ].map((item, i) => (
                           <div key={i} className="flex gap-4 items-start">
                             <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                               <item.icon className="w-4 h-4 text-slate-400" />
                             </div>
                             {item.link ? (
                               <a href={item.value.startsWith('http') ? item.value : `https://${item.value}`} target="_blank" rel="noreferrer" className="text-slate-600 font-bold hover:text-primary transition-colors mt-2 break-all">{item.value}</a>
                             ) : (
                               <span className="text-slate-600 font-bold mt-2 leading-relaxed">{item.value}</span>
                             )}
                           </div>
                         ))}
                      </div>
                    </div>

                    <div className="space-y-8">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary border-b border-primary/10 pb-4">Key Approvals & Affiliations</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(uni.approvals || {}).map(([key, val]) => val && (
                          <div key={key} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-[1.5rem] border border-slate-100 dark:border-white/5">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{key}</span>
                          </div>
                        ))}
                      </div>
                      {uni.facilities?.length > 0 && (
                        <>
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary border-b border-primary/10 pb-4 mt-8">Campus Facilities</h3>
                          <div className="flex flex-wrap gap-2">
                            {uni.facilities.map((f, i) => <span key={i} className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 px-4 py-2 rounded-xl text-xs font-bold text-slate-500">{f}</span>)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
