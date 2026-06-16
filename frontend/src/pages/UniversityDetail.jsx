import { useState, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, Globe, Phone, Mail, BookOpen, Users, Award, 
  Building, Bookmark, Share2, Camera, ChevronRight, CheckCircle2, ArrowRight, ExternalLink,
  Edit, Trash2, Save, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import QASection from '../components/QASection';
import UniversityLogo from '../components/common/UniversityLogo';

const tabs = ['Overview', 'Courses', 'Admissions', 'Placements', 'Campus', 'Scholarships', 'Q&A', 'News'];

const getHostname = (value) => {
  if (!value) return '';

  try {
    const normalizedUrl = value.startsWith('http') ? value : `https://${value}`;
    return new URL(normalizedUrl).hostname;
  } catch {
    return value;
  }
};

const getDisplayType = (university) => {
  if (university?.segment === 'twinning' || university?.type === 'twinning') return 'Twinning';
  if (university?.segment === 'foreign' || university?.type === 'foreign') return 'Foreign';
  return university?.institutionKind === 'deemed' || university?.type === 'deemed' ? 'Deemed' : 'Private';
};

export default function UniversityDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [uni, setUni] = useState(null);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 0);
  const [loading, setLoading] = useState(true);
  const [similarUnis, setSimilarUnis] = useState([]);
  const [logoFailed, setLogoFailed] = useState(false);

  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const isAdmin = user?.role === 'admin';

  // Edit & Delete states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setLogoFailed(false);
    api.get(`/universities/${slug}`)
      .then(({ data }) => {
        const u = data.data;
        setUni(u);
        setEditForm(u); // populate edit form
        if (u) {
          const prev = JSON.parse(localStorage.getItem('vm_recent') || '[]');
          const filtered = prev.filter(r => r._id !== u._id);
          const entry = { _id: u._id, name: u.name, slug: u.slug, state: u.state, city: u.city, type: getDisplayType(u), naacGrade: u.naacGrade, nirfRank: u.nirfRank };
          localStorage.setItem('vm_recent', JSON.stringify([entry, ...filtered].slice(0, 10)));

          if (u._id) {
            api.get(`/universities/${u._id}/similar`)
              .then(res => setSimilarUnis(res.data.data))
              .catch(() => {});
          }
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

  // Edit handlers
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/universities/${uni._id}`, editForm);
      toast.success('University updated successfully');
      setIsEditing(false);
      // Refresh data
      const { data } = await api.get(`/universities/${slug}`);
      setUni(data.data);
      setEditForm(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/admin/universities/${uni._id}`);
      toast.success('University deleted');
      navigate('/universities');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
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
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light opacity-20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] dark:from-dark-bg to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-24 relative z-10">
        <div className="bg-white dark:bg-dark-card rounded-[3rem] p-8 md:p-10 shadow-2xl border border-slate-100 dark:border-white/5 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-end">
              <div className="w-32 h-32 rounded-[2.5rem] bg-white shadow-2xl border-4 border-white flex items-center justify-center overflow-hidden shrink-0 p-4">
                <UniversityLogo logoUrl={uni.logoUrl} name={uni.name} />
              </div>
              <div className="text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                  <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">{getDisplayType(uni)}</span>
                  {uni.naacGrade && <span className="bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">NAAC {uni.naacGrade}</span>}
                  {uni.nirfRank && <span className="bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">#{uni.nirfRank} NIRF</span>}
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white mb-2">{uni.name}</h1>
                <p className="text-slate-500 font-bold flex items-center justify-center md:justify-start gap-2 uppercase text-xs tracking-widest">
                  <MapPin className="w-4 h-4 text-primary" /> {uni.city}, {uni.state}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              {/* Admin Edit & Delete Buttons */}
              {isAdmin && !isEditing && (
                <>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-4 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all shadow-lg"
                    title="Edit University"
                  >
                    <Edit className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal(true)}
                    className="p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all shadow-lg"
                    title="Delete University"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </>
              )}
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
                  href={uni.website?.startsWith('http') ? uni.website : `https://${uni.website}`} 
                  target="_blank" rel="noreferrer"
                  className="bg-gradient-to-br from-primary to-primary-light text-white font-black text-sm px-8 py-4 rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 transition-all border border-accent/20"
                >
                  APPLY NOW
                </a>
              )}
            </div>
          </div>

          {/* Edit Form (conditionally shown) */}
          {isEditing && (
            <div className="mt-10 pt-8 border-t border-slate-100 dark:border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" /> Edit University Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="name" value={editForm.name || ''} onChange={handleEditChange} className="input-field" placeholder="University Name" />
                <input name="state" value={editForm.state || ''} onChange={handleEditChange} className="input-field" placeholder="State" />
                <input name="city" value={editForm.city || ''} onChange={handleEditChange} className="input-field" placeholder="City" />
                <input name="establishedYear" value={editForm.establishedYear || ''} onChange={handleEditChange} className="input-field" placeholder="Established Year" />
                <input name="naacGrade" value={editForm.naacGrade || ''} onChange={handleEditChange} className="input-field" placeholder="NAAC Grade" />
                <input name="nirfRank" value={editForm.nirfRank || ''} onChange={handleEditChange} className="input-field" placeholder="NIRF Rank" />
                <input name="website" value={editForm.website || ''} onChange={handleEditChange} className="input-field" placeholder="Website" />
                <input name="email" value={editForm.email || ''} onChange={handleEditChange} className="input-field" placeholder="Email" />
                <input name="phone" value={editForm.phone || ''} onChange={handleEditChange} className="input-field" placeholder="Phone" />
                <textarea name="description" value={editForm.description || ''} onChange={handleEditChange} className="input-field col-span-2" rows="4" placeholder="Description" />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-xl text-sm font-bold">Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-2">
                  {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </div>
          )}

          {/* Stats Grid - unchanged */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mt-12 pt-10 border-t border-slate-50 dark:border-white/5">
            {[
              { icon: Users, label: 'Students', value: uni.stats?.totalStudents?.toLocaleString() || 'N/A' },
              { icon: Award, label: 'Avg Package', value: uni.stats?.avgPackageLPA ? `INR ${uni.stats.avgPackageLPA} LPA` : 'N/A' },
              { icon: BookOpen, label: 'Courses', value: uni.stats?.totalCoursesCount || uni.courses?.length || 0, link: `/courses?universityId=${uni._id}&universityName=${encodeURIComponent(uni.name)}` },
              { icon: Building, label: 'Campus', value: uni.stats?.campusSizeAcres ? `${uni.stats.campusSizeAcres} Acres` : 'N/A' },
              { icon: CheckCircle2, label: 'Placement', value: uni.stats?.placementPercentage ? `${uni.stats.placementPercentage}%` : 'N/A' },
              { icon: Award, label: 'Highest Pkg', value: uni.stats?.highestPackageLPA ? `INR ${uni.stats.highestPackageLPA} LPA` : 'N/A' },
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

        {/* Tabs - unchanged */}
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

        {/* Tab Content - unchanged */}
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
                    <h2 className="text-2xl font-serif font-bold mb-6">About the Institution</h2>
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
                               <a href={item.value?.startsWith('http') ? item.value : `https://${item.value}`} target="_blank" rel="noreferrer" className="text-slate-600 font-bold hover:text-primary transition-colors mt-2 break-all">{item.value}</a>
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

              {activeTab === 1 && (
                <div>
                  <h2 className="text-2xl font-serif font-bold mb-6">Courses & Programs</h2>
                  {uni.courses?.length === 0 ? <p className="text-slate-500 text-center py-8">No course data available yet.</p> : null}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {uni.courses?.map((course) => (
                      <div key={course._id} className="p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                          <div>
                            <h3 className="font-bold text-lg">{course.name}</h3>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
                              {course.category} | {course.duration} Year{course.duration > 1 ? 's' : ''}
                            </p>
                          </div>
                          {course.feesPerYear ? <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black">INR {course.feesPerYear.toLocaleString()}/yr</span> : null}
                        </div>
                        {course.entranceExams?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {course.entranceExams.map(exam => <span key={exam} className="px-2 py-1 bg-white dark:bg-white/10 border border-slate-100 dark:border-white/10 rounded-lg text-[10px] font-black text-slate-500 uppercase">{exam}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div className="space-y-12">
                  <div>
                    <h2 className="text-2xl font-serif font-bold mb-6">Admission Overview</h2>
                    <p className="text-slate-500 font-medium leading-relaxed">{uni.admissions?.overview || 'Admission details for the upcoming academic session will be updated soon.'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {uni.admissions?.process?.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary">Process Steps</h3>
                        {uni.admissions.process.map((step, idx) => (
                          <div key={idx} className="flex gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                            <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 font-black text-sm">{idx + 1}</span>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">{step}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-6">
                       <div className="p-6 rounded-3xl bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10">
                         <h4 className="text-orange-600 font-black text-[10px] uppercase tracking-widest mb-2">Counselling & Deadline</h4>
                         <p className="text-slate-700 dark:text-slate-200 font-bold">{uni.admissions?.counsellingInfo || 'Admissions are currently open. Apply via the link above.'}</p>
                       </div>
                       {uni.admissions?.documentsRequired?.length > 0 && (
                         <div className="space-y-3">
                           <h3 className="text-xs font-black uppercase tracking-widest text-primary">Required Documents</h3>
                           <div className="flex flex-wrap gap-2">
                             {uni.admissions.documentsRequired.map(doc => <span key={doc} className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-xl text-xs font-bold text-slate-500">{doc}</span>)}
                           </div>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 3 && (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 text-center">
                      <p className="text-4xl font-serif font-black text-indigo-600 mb-2">{uni.stats?.avgPackageLPA ? `INR ${uni.stats.avgPackageLPA} LPA` : 'N/A'}</p>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Average Package</p>
                    </div>
                    <div className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 text-center">
                      <p className="text-4xl font-serif font-black text-emerald-600 mb-2">{uni.stats?.highestPackageLPA ? `INR ${uni.stats.highestPackageLPA} LPA` : 'N/A'}</p>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Highest Package</p>
                    </div>
                    <div className="p-8 rounded-[2.5rem] bg-orange-500/5 border border-orange-500/10 text-center">
                      <p className="text-4xl font-serif font-black text-orange-600 mb-2">{uni.stats?.placementPercentage || 'N/A'}{uni.stats?.placementPercentage ? '%' : ''}</p>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Placement Rate</p>
                    </div>
                  </div>
                  {uni.topRecruiters?.length > 0 && (
                    <div>
                      <h3 className="text-2xl font-serif font-bold mb-8">Top Hiring Partners</h3>
                      <div className="flex flex-wrap justify-center gap-4">
                        {uni.topRecruiters.map(r => (
                          <div key={r} className="px-6 py-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl font-black text-sm text-slate-400 shadow-sm">
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 4 && (
                <div className="space-y-12">
                  <div>
                    <h2 className="text-2xl font-serif font-bold mb-6">Campus Life & Facilities</h2>
                    <p className="text-slate-500 font-medium leading-relaxed">{uni.campus?.overview || 'The institution features a modern campus equipped with state-of-the-art facilities for academic and personal growth.'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { title: 'Hostel Accommodation', desc: uni.campus?.hostelDetails, icon: Building },
                      { title: 'Central Library', desc: uni.campus?.libraryDetails, icon: BookOpen },
                      { title: 'Advanced Laboratories', desc: uni.campus?.labDetails, icon: Award },
                      { title: 'Sports & Recreation', desc: uni.campus?.sportsDetails, icon: Users },
                    ].map((f, i) => f.desc && (
                      <div key={i} className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-dark-bg flex items-center justify-center shrink-0 shadow-sm">
                          <f.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-2">{f.title}</h4>
                          <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 5 && (
                <div className="space-y-8">
                  <h2 className="text-2xl font-serif font-bold mb-6">Financial Aid & Scholarships</h2>
                  {uni.scholarships?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {uni.scholarships.map((s, idx) => (
                        <div key={idx} className="p-8 rounded-[2.5rem] bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
                          <h3 className="font-black text-xl text-indigo-700 dark:text-indigo-400 mb-3">{s.name}</h3>
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4">{s.description}</p>
                          <div className="flex flex-wrap gap-3">
                            {s.amount && <span className="px-3 py-1 bg-white dark:bg-dark-bg rounded-lg text-xs font-black text-indigo-600">Value: {s.amount}</span>}
                            {s.deadline && <span className="px-3 py-1 bg-white dark:bg-dark-bg rounded-lg text-xs font-black text-orange-600">Deadline: {new Date(s.deadline).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-dashed border-slate-200">
                      <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">No specific scholarship data available for this year.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 6 && <QASection universityId={uni._id} user={user} />}

              {activeTab === 7 && (
                <div className="space-y-8">
                  <h2 className="text-2xl font-serif font-bold mb-6">Latest Updates & News</h2>
                  {uni.newsLinks?.length > 0 ? (
                    <div className="space-y-4">
                      {uni.newsLinks.map((item, idx) => (
                        <a key={idx} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 dark:bg-white/5 hover:bg-primary/5 border border-slate-100 dark:border-white/5 transition-all group">
                          <div>
                            <p className="font-bold text-lg group-hover:text-primary transition-colors">{item.title}</p>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">{getHostname(item.url)}</p>
                          </div>
                          <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-12">No recent news found for this institution.</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Similar Universities Section */}
        {similarUnis.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Similar Universities</h2>
              <Link to="/universities" className="text-primary font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:underline">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {similarUnis.map((u) => (
                <Link 
                  key={u._id} 
                  to={`/universities/${u.slug}`}
                  className="bg-white dark:bg-dark-card rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/5 shadow-lg hover:-translate-y-2 transition-all group"
                >
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border border-slate-100 p-2">
                    {u.logoUrl ? (
                      <img src={u.logoUrl} alt={u.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl font-black text-primary">{u.name[0]}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors">{u.name}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <MapPin className="w-3 h-3 text-primary" /> {u.city}, {u.state}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-dark-card rounded-3xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-red-600">Delete University</h3>
                <button onClick={() => setShowDeleteModal(false)} className="p-1 rounded-full hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-2">
                Are you sure you want to delete <strong className="text-red-600">{uni.name}</strong>?
              </p>
              <p className="text-sm text-slate-400 mb-6">This action cannot be undone. All associated courses and data will also be removed.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold">Cancel</button>
                <button onClick={handleDelete} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                  {saving ? 'Deleting...' : <><Trash2 className="w-4 h-4" /> Delete Permanently</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}