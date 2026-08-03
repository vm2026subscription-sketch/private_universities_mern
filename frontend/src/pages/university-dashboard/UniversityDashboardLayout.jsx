import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Image as ImageIcon, BookOpen,
  GraduationCap, Award, CreditCard, Menu, ChevronLeft, LogOut,
  Bell, ExternalLink, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/university/dashboard' },
  { label: 'Profile & Info', icon: Building2, path: '/university/dashboard/profile' },
  { label: 'Photo Gallery', icon: ImageIcon, path: '/university/dashboard/gallery' },
  { label: 'Courses Offered', icon: BookOpen, path: '/university/dashboard/courses' },
  { label: 'Placement Records', icon: GraduationCap, path: '/university/dashboard/placement' },
  { label: 'Scholarships', icon: Award, path: '/university/dashboard/scholarships' },
  { label: 'Subscription & Plan', icon: CreditCard, path: '/university/dashboard/subscription' },
];

export default function UniversityDashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const fetchUniversity = useCallback(async () => {
    try {
      const { data } = await api.get('/university-portal/my-university');
      if (data?.success && data?.data) {
        setUniversity(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch university details:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUniversity();
  }, [fetchUniversity]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/university/dashboard') return location.pathname === '/university/dashboard';
    return location.pathname?.startsWith(path);
  };

  const currentNav = navItems.find(item => isActive(item.path)) || { label: 'University Dashboard' };

  const SidebarContent = () => (
    <nav className="flex flex-col h-full bg-white dark:bg-dark-card border-r border-light-border dark:border-dark-border">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
        <Link to="/university/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-primary/20 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-light-text dark:text-dark-text truncate">
                {university?.name || user?.name || 'UniPortal'}
              </h2>
              <p className="text-[11px] text-light-muted dark:text-dark-muted font-medium truncate">University Console</p>
            </div>
          )}
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex p-1.5 rounded-lg text-light-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-card dark:hover:bg-dark-border transition-colors"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                active
                  ? 'bg-primary text-white shadow-lg shadow-primary/25 font-semibold'
                  : 'text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-card dark:hover:bg-dark-border'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-primary/70 dark:text-primary-light'}`} />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {active && sidebarOpen && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-light-border dark:border-dark-border space-y-2 bg-light-bg/40 dark:bg-dark-bg/40">
        {sidebarOpen && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs">
              {(university?.name || user?.name || 'U')[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-light-text dark:text-dark-text truncate">
                {university?.name || user?.name || 'Partner University'}
              </p>
              <p className="text-[10px] text-link font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> {university?.sponsorTier && university.sponsorTier !== 'none' ? `${university.sponsorTier.toUpperCase()} Partner` : 'Gold Partner'}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-light-bg dark:bg-dark-bg">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:block sticky top-0 h-screen transition-all duration-300 z-30 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-dark-card shadow-2xl z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-b border-light-border dark:border-dark-border px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl border border-light-border dark:border-dark-border hover:bg-light-card dark:hover:bg-dark-card"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold text-light-text dark:text-dark-text tracking-tight flex items-center gap-2">
                {currentNav.label}
              </h1>
              <p className="text-xs text-light-muted dark:text-dark-muted hidden sm:block">Manage your university presence, courses, and admissions</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/universities"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-light-card dark:bg-dark-border text-light-text dark:text-dark-text hover:bg-primary hover:text-white transition-all border border-light-border dark:border-dark-border"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Live Preview
            </Link>

            <button className="p-2.5 rounded-xl border border-light-border dark:border-dark-border hover:bg-light-card dark:hover:bg-dark-card relative text-light-muted dark:text-dark-muted">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>
          </div>
        </header>

        {/* Dynamic Section Render */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet context={{ uni: university, loading, refreshUni: fetchUniversity }} />
        </main>
      </div>
    </div>
  );
}
