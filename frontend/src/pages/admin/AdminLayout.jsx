import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Building2, BookOpen, FileText, Newspaper,
  Users, Image, MessageSquareQuote, FileEdit, HelpCircle,
  Mail, Bell, Send, Settings, Shield, Menu, X, ChevronLeft
} from 'lucide-react';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/admin' },
  { label: 'Universities', icon: Building2, path: '/admin/universities' },
  { label: 'Courses', icon: BookOpen, path: '/admin/courses' },
  { label: 'Exams', icon: FileText, path: '/admin/exams' },
  { label: 'News', icon: Newspaper, path: '/admin/news' },
  { label: 'Users', icon: Users, path: '/admin/users' },
  { divider: true, label: 'CMS' },
  { label: 'Banners', icon: Image, path: '/admin/banners' },
  { label: 'Testimonials', icon: MessageSquareQuote, path: '/admin/testimonials' },
  { label: 'Pages', icon: FileEdit, path: '/admin/pages' },
  { label: 'FAQs', icon: HelpCircle, path: '/admin/faqs' },
  { divider: true, label: 'Communication' },
  { label: 'Contact Forms', icon: Mail, path: '/admin/contacts' },
  { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
  { label: 'Newsletter', icon: Send, path: '/admin/newsletter' },
  { divider: true, label: 'System' },
  { label: 'Site Settings', icon: Settings, path: '/admin/settings' },
  { label: 'Audit Logs', icon: Shield, path: '/admin/audit-logs' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <nav className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
        <Link to="/admin" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          {sidebarOpen && <span className="font-bold text-lg">Admin Panel</span>}
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:block p-1 rounded-lg hover:bg-light-card dark:hover:bg-dark-card">
          <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map((item, i) => {
          if (item.divider) {
            return sidebarOpen ? (
              <div key={i} className="pt-4 pb-1 px-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-light-muted dark:text-dark-muted">{item.label}</span>
              </div>
            ) : <div key={i} className="my-2 h-px bg-light-border dark:bg-dark-border" />;
          }
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                ? 'bg-primary text-white shadow-sm'
                : 'text-light-text dark:text-dark-text hover:bg-light-card dark:hover:bg-dark-card'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
      <div className="p-3 border-t border-light-border dark:border-dark-border">
        <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-light-card dark:hover:bg-dark-card transition-colors text-light-muted dark:text-dark-muted">
          <ChevronLeft className="w-4 h-4" />
          {sidebarOpen && <span>Back to Site</span>}
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-light-bg dark:bg-dark-bg">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-light-border dark:border-dark-border bg-white dark:bg-dark-card transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-16'} sticky top-0 h-screen`}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-dark-card z-50 shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md border-b border-light-border dark:border-dark-border px-4 md:px-6 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-light-card dark:hover:bg-dark-card">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold capitalize">
            {navItems.find(n => !n.divider && isActive(n.path))?.label || 'Admin'}
          </h1>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
