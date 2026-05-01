import { useState, useEffect } from 'react';
import { Navigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, Bookmark, BookOpen, Settings, Lightbulb, 
  GitCompare, Clock, Moon, Sun, Download, Share2, Menu, X, 
  User as UserIcon, LogOut, ChevronRight, Briefcase, Bell, MapPin
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Components
import DashboardOverview from '../components/profile/DashboardOverview';
import SavedColleges from '../components/profile/SavedColleges';
import SavedCourses from '../components/profile/SavedCourses';
import Preferences from '../components/profile/Preferences';
import Recommendations from '../components/profile/Recommendations';
import CompareView from '../components/profile/CompareView';
import ProfileSettings from '../components/profile/ProfileSettings';
import RecentlyViewed from '../components/profile/RecentlyViewed';
import ApplicationTracker from '../components/profile/ApplicationTracker';
import DeadlineTracker from '../components/profile/DeadlineTracker';
import GeographicView from '../components/profile/GeographicView';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({});
  const [trends, setTrends] = useState({ popularUniversities: [], trendingCourses: [] });
  const [fullUser, setFullUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [compareList, setCompareList] = useState([]);
  const [allUniversities, setAllUniversities] = useState([]);

  useEffect(() => {
    if (user) {
      fetchData();
      // Load recent from localStorage
      const recent = JSON.parse(localStorage.getItem('vm_recent') || '[]');
      setRecentlyViewed(recent);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileRes, coursesRes, recommendRes, trendsRes, allUniRes] = await Promise.all([
        api.get('/users/profile'),
        api.get('/courses'),
        api.get('/users/recommendations'),
        api.get('/universities/trends'),
        api.get('/universities?limit=1000')
      ]);
      setFullUser(profileRes.data.data);
      setAllCourses(coursesRes.data.data || []);
      setRecommendations(recommendRes.data.data || []);
      setTrends(trendsRes.data);
      setAllUniversities(allUniRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <Navigate to="/login" replace />;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'saved-colleges', label: 'Saved Colleges', icon: Bookmark },
    { id: 'applications', label: 'Applications', icon: Briefcase },
    { id: 'deadlines', label: 'Admission Deadlines', icon: Clock },
    { id: 'saved-courses', label: 'Interested Courses', icon: BookOpen },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'recommendations', label: 'Suggest', icon: Lightbulb },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'map', label: 'Geographic View', icon: MapPin },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'settings', label: 'Settings', icon: UserIcon },
  ];

  const handleUpdateAppStatus = async (appId, status) => {
    try {
      await api.put(`/users/applications/${appId}/status`, { status });
      toast.success('Application status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
    setSidebarOpen(false);
  };

  // --- Handlers ---
  const handleUpdateProfile = async (data) => {
    try {
      const res = await api.put('/users/profile', data);
      updateUser(res.data.data);
      setFullUser(prev => ({ ...prev, ...res.data.data }));
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

  const handleChangePassword = async (data) => {
    try {
      await api.put('/users/change-password', data);
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleSavePref = async (data) => {
    try {
      const res = await api.put('/users/profile', { profile: { ...fullUser.profile, ...data } });
      setFullUser(res.data.data);
      toast.success('Preferences saved');
      // Refresh recommendations
      const recRes = await api.get('/users/recommendations');
      setRecommendations(recRes.data.data);
    } catch (err) {
      toast.error('Failed to save preferences');
    }
  };

  const handleBookmarkAction = async (id, action) => {
    try {
      if (action === 'remove') {
        await api.delete(`/users/saved-universities/${id}`);
        setFullUser(prev => ({ ...prev, savedUniversities: prev.savedUniversities.filter(u => u._id !== id) }));
        toast.success('University removed');
      } else {
        await api.post(`/users/saved-universities/${id}`);
        toast.success('University saved');
        fetchData(); // Refresh list
      }
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  const handleCourseAction = async (id, action) => {
    try {
      if (action === 'remove') {
        await api.delete(`/users/saved-courses/${id}`);
        setFullUser(prev => ({ ...prev, savedCourses: prev.savedCourses.filter(c => c._id !== id) }));
        toast.success('Course removed');
      } else {
        await api.post(`/users/saved-courses/${id}`);
        toast.success('Course added');
        fetchData();
      }
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  const handleRating = async (uniId, rating) => {
    try {
      await api.put(`/users/ratings/${uniId}`, { rating });
      setFullUser(prev => ({ ...prev, ratings: { ...prev.ratings, [uniId]: rating } }));
      toast.success('Rating saved');
    } catch (err) {
      toast.error('Failed to save rating');
    }
  };

  const handleNote = async (uniId, note) => {
    try {
      await api.put(`/users/notes/${uniId}`, { note });
      setFullUser(prev => ({ ...prev, notes: { ...prev.notes, [uniId]: note } }));
      toast.success('Note saved');
    } catch (err) {
      toast.error('Failed to save note');
    }
  };

  const toggleCompare = (uni) => {
    setCompareList(prev => {
      const exists = prev.find(c => c._id === uni._id);
      if (exists) return prev.filter(c => c._id !== uni._id);
      if (prev.length >= 3) {
        toast.error('You can only compare up to 3 colleges');
        return prev;
      }
      return [...prev, uni];
    });
    setSearchParams({ tab: 'compare' });
  };

  const handleShare = (uni) => {
    const url = `${window.location.origin}/universities/${uni.slug}`;
    if (navigator.share) {
      navigator.share({ title: uni.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const handleShareWA = (uni) => {
    const url = `${window.location.origin}/universities/${uni.slug}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out ${uni.name} on Vidyarthi Mitra: ${url}`)}`, '_blank');
  };

  const handleClearHistory = () => {
    localStorage.removeItem('vm_recent');
    setRecentlyViewed([]);
    toast.success('History cleared');
  };

  // --- Export Logic ---
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("My Saved Colleges - Vidyarthi Mitra", 14, 15);
    const tableData = fullUser.savedUniversities.map(u => [u.name, u.city, u.state, u.type, u.nirfRank || 'N/A']);
    doc.autoTable({
      head: [['College Name', 'City', 'State', 'Type', 'NIRF Rank']],
      body: tableData,
      startY: 20,
    });
    doc.save("VidyarthiMitra_Saved_Colleges.pdf");
    toast.success('PDF exported');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(fullUser.savedUniversities.map(u => ({
      Name: u.name,
      City: u.city,
      State: u.state,
      Type: u.type,
      NIRFRank: u.nirfRank || 'N/A',
      Website: u.website || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Colleges");
    XLSX.writeFile(wb, "VidyarthiMitra_Saved_Colleges.xlsx");
    toast.success('Excel exported');
  };

  if (loading || !fullUser) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg gap-4">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary shadow-lg"></div>
      <p className="text-sm font-bold text-light-muted animate-pulse">Synchronizing your dashboard...</p>
    </div>
  );

  const dashboardCounts = {
    savedCollegesCount: fullUser?.savedUniversities?.length || 0,
    savedCoursesCount: fullUser?.savedCourses?.length || 0,
    recentCount: recentlyViewed?.length || 0
  };

  const getPageTitle = () => {
    if (activeTab === 'overview') return 'Student Dashboard';
    if (activeTab === 'settings') return 'Account Settings';
    if (activeTab === 'saved-colleges') return 'My Saved Colleges';
    if (activeTab === 'saved-courses') return 'Interested Courses';
    return activeTab.replace('-', ' ');
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-dark-bg flex flex-col md:flex-row relative selection:bg-primary/30">
      
      {/* Mobile Sidebar Toggle */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-2xl shadow-2xl z-50 flex items-center justify-center"
      >
        <Menu className="w-6 h-6" />
      </motion.button>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-72 bg-white dark:bg-dark-card border-r border-light-border dark:border-dark-border z-[70] transition-all duration-500 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-10 px-2">
            <Link to="/" className="text-xl font-black text-primary tracking-tighter hover:opacity-80 transition-opacity flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm">VM</div>
              VIDYARTHI MITRA
            </Link>
            <button className="md:hidden p-2 hover:bg-light-bg rounded-full transition-colors" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent dark:from-primary/20 mb-8 border border-primary/10"
          >
             <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20 overflow-hidden shrink-0 border-2 border-white/50">
               {fullUser?.avatar ? (
                 <img src={fullUser.avatar} className="w-full h-full object-cover" alt="Profile" />
               ) : (
                 fullUser?.name?.charAt(0)
               )}
             </div>
             <div className="min-w-0">
               <p className="font-bold text-sm truncate">{fullUser?.name}</p>
               <p className="text-[10px] text-light-muted font-bold truncate uppercase tracking-tighter opacity-70">{fullUser?.email}</p>
             </div>
          </motion.div>

          <nav className="flex-1 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200
                  ${activeTab === tab.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'text-light-muted hover:bg-primary-50 dark:hover:bg-dark-border hover:text-primary'}
                `}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} /> 
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-light-border dark:border-dark-border mt-auto space-y-2">
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-light-muted hover:bg-primary-50 dark:hover:bg-dark-border transition-all"
            >
              {dark ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
              {dark ? 'Light' : 'Dark'} Mode
            </button>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8">
           <motion.div
             initial={{ x: -20, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
           >
             <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3">
               <span className="w-10 h-[2px] bg-primary rounded-full"></span>
               {getPageTitle()}
             </div>
             <h1 className="text-4xl font-black mb-2 tracking-tight text-slate-900 dark:text-white">
                Welcome back, <span className="text-primary">{fullUser?.name?.split(' ')[0]}!</span> 👋
             </h1>
             <p className="text-sm text-light-muted font-medium max-w-md">
                Manage your applications, track progress, and find your dream university.
             </p>
           </motion.div>
           <motion.div 
             initial={{ x: 20, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
             className="flex items-center gap-4"
           >
              {/* Notifications */}
              <div className="relative">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-12 h-12 bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-light-border dark:border-dark-border flex items-center justify-center relative text-light-muted hover:text-primary transition-colors"
                >
                   <Bell className="w-5 h-5" />
                   {notifications.some(n => !n.read) && (
                     <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 border-2 border-white dark:border-dark-card rounded-full shadow-lg" />
                   )}
                </motion.button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-80 bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-light-border dark:border-dark-border z-[100] overflow-hidden"
                    >
                       <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-primary/5">
                          <span className="font-bold text-sm">Notifications</span>
                          <span className="text-[10px] font-black text-primary uppercase">{notifications.filter(n=>!n.read).length} New</span>
                       </div>
                       <div className="max-h-[350px] overflow-y-auto">
                          {notifications.map((n, i) => (
                            <div key={i} className={`p-4 border-b border-light-border dark:border-dark-border last:border-0 hover:bg-light-bg dark:hover:bg-dark-border transition-colors cursor-pointer ${!n.read ? 'bg-primary/5' : ''}`}>
                               <p className="text-xs font-bold mb-1">{n.title}</p>
                               <p className="text-[10px] text-light-muted line-clamp-2">{n.message}</p>
                               <p className="text-[9px] text-light-muted mt-2 font-bold uppercase">{new Date(n.createdAt).toLocaleTimeString()}</p>
                            </div>
                          ))}
                          {notifications.length === 0 && (
                            <div className="p-8 text-center text-light-muted text-xs italic">
                               No new notifications
                            </div>
                          )}
                       </div>
                       <div className="p-3 text-center bg-light-bg dark:bg-dark-border/30">
                          <button className="text-[10px] font-black uppercase text-primary hover:underline">Mark all as read</button>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => handleShare({ name: 'My Profile', slug: 'profile' })} 
                className="btn-primary !py-3 !px-6 text-xs flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share Dashboard
              </button>
           </motion.div>
        </header>

        <motion.div 
          key={activeTab}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {activeTab === 'overview' && <DashboardOverview stats={dashboardCounts} recentlyViewed={recentlyViewed} fullUser={fullUser} trends={trends} />}
          
          {activeTab === 'applications' && (
            <ApplicationTracker 
              applications={fullUser?.applications || []} 
              onUpdateStatus={handleUpdateAppStatus} 
            />
          )}

          {activeTab === 'deadlines' && (
            <DeadlineTracker universities={fullUser?.savedUniversities || []} />
          )}
          {activeTab === 'saved-colleges' && (
            <SavedColleges 
              savedUnis={fullUser?.savedUniversities || []} 
              ratings={fullUser?.ratings || {}}
              notes={fullUser?.notes || {}}
              compareList={compareList}
              userPrefs={fullUser?.profile}
              onRemove={(id) => handleBookmarkAction(id, 'remove')}
              onRating={handleRating}
              onNoteSave={handleNote}
              onShare={handleShare}
              onShareWA={handleShareWA}
              onToggleCompare={toggleCompare}
              onExportPDF={exportPDF}
              onExportExcel={exportExcel}
            />
          )}

          {activeTab === 'saved-courses' && (
            <SavedCourses 
              savedCourses={fullUser?.savedCourses || []} 
              allCourses={allCourses}
              onAdd={(id) => handleCourseAction(id, 'add')}
              onRemove={(id) => handleCourseAction(id, 'remove')}
            />
          )}

          {activeTab === 'preferences' && (
            <Preferences profile={fullUser?.profile || {}} onSave={handleSavePref} />
          )}

          {activeTab === 'recommendations' && (
            <Recommendations 
              recommendations={recommendations} 
              onSave={(u) => handleBookmarkAction(u._id, 'add')}
              userPrefs={fullUser?.profile}
            />
          )}

          {activeTab === 'map' && (
            <GeographicView 
              universities={allUniversities} 
              savedUniversities={fullUser?.savedUniversities || []} 
            />
          )}

          {activeTab === 'compare' && (
            <CompareView 
              compareList={compareList} 
              onRemove={(u) => toggleCompare(u)} 
            />
          )}

          {activeTab === 'settings' && (
            <ProfileSettings 
              user={fullUser} 
              onUpdateProfile={handleUpdateProfile}
              onChangePassword={handleChangePassword}
              onLogout={logout}
            />
          )}

          {activeTab === 'history' && (
            <RecentlyViewed items={recentlyViewed} onClear={handleClearHistory} />
          )}
        </motion.div>
      </main>
    </div>
  );
}
