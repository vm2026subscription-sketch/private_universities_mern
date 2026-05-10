import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Bookmark,
  BookOpen,
  Settings,
  Lightbulb,
  GitCompare,
  Clock,
  Moon,
  Sun,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Briefcase,
  Bell,
  MapPin,
  Share2,
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardOverview = lazy(() => import('../components/profile/DashboardOverview'));
const SavedColleges = lazy(() => import('../components/profile/SavedColleges'));
const SavedCourses = lazy(() => import('../components/profile/SavedCourses'));
const Preferences = lazy(() => import('../components/profile/Preferences'));
const Recommendations = lazy(() => import('../components/profile/Recommendations'));
const CompareView = lazy(() => import('../components/profile/CompareView'));
const ProfileSettings = lazy(() => import('../components/profile/ProfileSettings'));
const RecentlyViewed = lazy(() => import('../components/profile/RecentlyViewed'));
const ApplicationTracker = lazy(() => import('../components/profile/ApplicationTracker'));
const DeadlineTracker = lazy(() => import('../components/profile/DeadlineTracker'));
const GeographicView = lazy(() => import('../components/profile/GeographicView'));

function ProfileSectionLoader() {
  return (
    <div className="card p-6 text-sm text-light-muted dark:text-dark-muted">
      Loading section...
    </div>
  );
}

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    if (!user) return;

    fetchData();
    const recent = JSON.parse(localStorage.getItem('vm_recent') || '[]');
    setRecentlyViewed(recent);
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        profileRes,
        coursesRes,
        recommendRes,
        trendsRes,
        allUniRes,
        notificationsRes,
      ] = await Promise.all([
        api.get('/users/profile'),
        api.get('/courses'),
        api.get('/users/recommendations'),
        api.get('/universities/trends'),
        api.get('/universities?limit=1000'),
        api.get('/notifications'),
      ]);

      setFullUser(profileRes.data.data);
      setAllCourses(coursesRes.data.data || []);
      setRecommendations(recommendRes.data.data || []);
      setTrends(trendsRes.data);
      setAllUniversities(allUniRes.data.data || []);
      setNotifications(notificationsRes.data.data || []);
    } catch {
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
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
    setSidebarOpen(false);
  };

  const handleUpdateProfile = async (data) => {
    try {
      const response = await api.put('/users/profile', data);
      updateUser(response.data.data);
      setFullUser(response.data.data);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleChangePassword = async (data) => {
    try {
      await api.put('/users/change-password', data);
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  };

  const handleSavePref = async (data) => {
    try {
      const response = await api.put('/users/profile', { profile: { ...fullUser.profile, ...data } });
      setFullUser(response.data.data);
      toast.success('Preferences saved');

      const recommendResponse = await api.get('/users/recommendations');
      setRecommendations(recommendResponse.data.data || []);
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  const handleBookmarkAction = async (id, action) => {
    try {
      if (action === 'remove') {
        await api.delete(`/users/saved-universities/${id}`);
        setFullUser((current) => ({
          ...current,
          savedUniversities: current.savedUniversities.filter((item) => item._id !== id),
        }));
        toast.success('University removed');
        return;
      }

      await api.post(`/users/saved-universities/${id}`);
      toast.success('University saved');
      fetchData();
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleCourseAction = async (id, action) => {
    try {
      if (action === 'remove') {
        await api.delete(`/users/saved-courses/${id}`);
        setFullUser((current) => ({
          ...current,
          savedCourses: current.savedCourses.filter((item) => item._id !== id),
        }));
        toast.success('Course removed');
        return;
      }

      await api.post(`/users/saved-courses/${id}`);
      toast.success('Course added');
      fetchData();
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleRating = async (uniId, rating) => {
    try {
      await api.put(`/users/ratings/${uniId}`, { rating });
      setFullUser((current) => ({ ...current, ratings: { ...current.ratings, [uniId]: rating } }));
      toast.success('Rating saved');
    } catch {
      toast.error('Failed to save rating');
    }
  };

  const handleNote = async (uniId, note) => {
    try {
      await api.put(`/users/notes/${uniId}`, { note });
      setFullUser((current) => ({ ...current, notes: { ...current.notes, [uniId]: note } }));
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    }
  };

  const toggleCompare = (university) => {
    setCompareList((current) => {
      const exists = current.find((item) => item._id === university._id);
      if (exists) return current.filter((item) => item._id !== university._id);
      if (current.length >= 3) {
        toast.error('You can only compare up to 3 colleges');
        return current;
      }
      return [...current, university];
    });
    setSearchParams({ tab: 'compare' });
  };

  const handleShare = ({ name, slug, url }) => {
    const shareUrl = url || `${window.location.origin}/universities/${slug}`;
    const shareTitle = name || 'Vidyarthi Mitra';

    if (navigator.share) {
      navigator.share({ title: shareTitle, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    }
  };

  const handleShareWA = (university) => {
    const url = `${window.location.origin}/universities/${university.slug}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Check out ${university.name} on Vidyarthi Mitra: ${url}`)}`,
      '_blank'
    );
  };

  const handleClearHistory = () => {
    localStorage.removeItem('vm_recent');
    setRecentlyViewed([]);
    toast.success('History cleared');
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await api.patch(`/notifications/${notification._id}/read`);
        setNotifications((current) => current.map((item) => (
          item._id === notification._id ? { ...item, isRead: true } : item
        )));
      } catch {
        toast.error('Failed to update notification');
      }
    }

    if (notification.link) {
      window.open(notification.link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Could not update notifications');
    }
  };

  const exportPDF = async () => {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const doc = new jsPDF();
      doc.text('My Saved Colleges - Vidyarthi Mitra', 14, 15);
      const tableData = fullUser.savedUniversities.map((university) => [
        university.name,
        university.city,
        university.state,
        university.type,
        university.nirfRank || 'N/A',
      ]);
      autoTable(doc, {
        head: [['College Name', 'City', 'State', 'Type', 'NIRF Rank']],
        body: tableData,
        startY: 20,
      });
      doc.save('VidyarthiMitra_Saved_Colleges.pdf');
      toast.success('PDF exported');
    } catch {
      toast.error('Could not export PDF');
    }
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const sheet = XLSX.utils.json_to_sheet(fullUser.savedUniversities.map((university) => ({
        Name: university.name,
        City: university.city,
        State: university.state,
        Type: university.type,
        NIRFRank: university.nirfRank || 'N/A',
        Website: university.website || '',
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Colleges');
      XLSX.writeFile(workbook, 'VidyarthiMitra_Saved_Colleges.xlsx');
      toast.success('Excel exported');
    } catch {
      toast.error('Could not export Excel');
    }
  };

  if (loading || !fullUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary shadow-lg" />
        <p className="text-sm font-bold text-light-muted animate-pulse">Synchronizing your dashboard...</p>
      </div>
    );
  }

  const dashboardCounts = {
    savedCollegesCount: fullUser.savedUniversities?.length || 0,
    savedCoursesCount: fullUser.savedCourses?.length || 0,
    recentCount: recentlyViewed?.length || 0,
  };

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const getPageTitle = () => {
    if (activeTab === 'overview') return 'Student Dashboard';
    if (activeTab === 'settings') return 'Account Settings';
    if (activeTab === 'saved-colleges') return 'My Saved Colleges';
    if (activeTab === 'saved-courses') return 'Interested Courses';
    return activeTab.replace('-', ' ');
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-dark-bg flex flex-col md:flex-row relative selection:bg-primary/30">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-2xl shadow-2xl z-50 flex items-center justify-center"
      >
        <Menu className="w-6 h-6" />
      </motion.button>

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
              {fullUser.avatar ? (
                <img src={fullUser.avatar} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                fullUser.name?.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{fullUser.name}</p>
              <p className="text-[10px] text-light-muted font-bold truncate uppercase tracking-tighter opacity-70">{fullUser.email}</p>
            </div>
          </motion.div>

          <nav className="flex-1 space-y-1">
            {tabs.map((tab) => (
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

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3">
              <span className="w-10 h-[2px] bg-primary rounded-full" />
              {getPageTitle()}
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight text-slate-900 dark:text-white">
              Welcome back, <span className="text-primary">{fullUser.name?.split(' ')[0]}!</span>
            </h1>
            <p className="text-sm text-light-muted font-medium max-w-md">
              Manage your applications, track progress, and find your dream university.
            </p>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-4">
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowNotifications((current) => !current)}
                className="w-12 h-12 bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-light-border dark:border-dark-border flex items-center justify-center relative text-light-muted hover:text-primary transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 ? (
                  <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 border-2 border-white dark:border-dark-card rounded-full shadow-lg" />
                ) : null}
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
                      <span className="text-[10px] font-black text-primary uppercase">{unreadCount} New</span>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto">
                      {notifications.map((notification) => (
                        <button
                          key={notification._id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left p-4 border-b border-light-border dark:border-dark-border last:border-0 hover:bg-light-bg dark:hover:bg-dark-border transition-colors ${!notification.isRead ? 'bg-primary/5' : ''}`}
                        >
                          <p className="text-xs font-bold mb-1">{notification.title}</p>
                          <p className="text-[10px] text-light-muted line-clamp-2">{notification.message}</p>
                          <p className="text-[9px] text-light-muted mt-2 font-bold uppercase">{new Date(notification.createdAt).toLocaleString()}</p>
                        </button>
                      ))}
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-light-muted text-xs italic">
                          No new notifications
                        </div>
                      ) : null}
                    </div>
                    <div className="p-3 text-center bg-light-bg dark:bg-dark-border/30">
                      <button type="button" onClick={handleMarkAllNotificationsRead} className="text-[10px] font-black uppercase text-primary hover:underline">
                        Mark all as read
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => handleShare({ name: 'My Dashboard', url: window.location.href })}
              className="btn-primary !py-3 !px-6 text-xs flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" /> Share Dashboard
            </button>
          </motion.div>
        </header>

        <Suspense fallback={<ProfileSectionLoader />}>
          <motion.div
            key={activeTab}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {activeTab === 'overview' && <DashboardOverview stats={dashboardCounts} recentlyViewed={recentlyViewed} fullUser={fullUser} trends={trends} />}

            {activeTab === 'applications' && (
              <ApplicationTracker
                applications={fullUser.applications || []}
                onUpdateStatus={handleUpdateAppStatus}
              />
            )}

            {activeTab === 'deadlines' && (
              <DeadlineTracker universities={fullUser.savedUniversities || []} />
            )}

            {activeTab === 'saved-colleges' && (
              <SavedColleges
                savedUnis={fullUser.savedUniversities || []}
                ratings={fullUser.ratings || {}}
                notes={fullUser.notes || {}}
                compareList={compareList}
                userPrefs={fullUser.profile}
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
                savedCourses={fullUser.savedCourses || []}
                allCourses={allCourses}
                onAdd={(id) => handleCourseAction(id, 'add')}
                onRemove={(id) => handleCourseAction(id, 'remove')}
              />
            )}

            {activeTab === 'preferences' && (
              <Preferences profile={fullUser.profile || {}} onSave={handleSavePref} />
            )}

            {activeTab === 'recommendations' && (
              <Recommendations
                recommendations={recommendations}
                onSave={(item) => handleBookmarkAction(item._id, 'add')}
                userPrefs={fullUser.profile}
              />
            )}

            {activeTab === 'map' && (
              <GeographicView
                universities={allUniversities}
                savedUniversities={fullUser.savedUniversities || []}
              />
            )}

            {activeTab === 'compare' && (
              <CompareView
                compareList={compareList}
                onRemove={(item) => toggleCompare(item)}
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
        </Suspense>
      </main>
    </div>
  );
}
