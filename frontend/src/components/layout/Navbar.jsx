import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Moon, Sun, Menu, X, User, Bookmark, Settings, LogOut, 
  ChevronDown, GraduationCap, Building2, Stethoscope, Scale, 
  Palette, Briefcase, MapPin, Trophy, BookOpen, Globe 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import logo from '../../assets/logo.png';


export default function Navbar() {
  const { dark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState(null);
  const location = useLocation();
  
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const megaMenuRef = useRef(null);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/universities', label: 'Universities' },
    { to: '/courses', label: 'Courses' },
    { to: '/exams', label: 'Exams' },
    { to: '/compare-universities', label: 'Comparison' },
    { to: '/foreign-universities', label: 'Abroad' },
  ];
  const visibleNavLinks = user?.role === 'admin' ? [...navLinks, { to: '/admin', label: 'Admin' }] : navLinks;

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          const [uniRes, courseRes] = await Promise.all([
            api.get(`/universities/search?q=${searchQuery}`),
            api.get(`/courses?name=${searchQuery}`)
          ]);
          
          const unis = (uniRes.data.data || []).map(u => ({ ...u, _type: 'university' }));
          const courses = (courseRes.data.data || []).map(c => ({ ...c, _type: 'course' }));
          
          setSearchResults([...unis, ...courses].slice(0, 8));
          setShowSearch(true);
        } catch { setSearchResults([]); }
      } else {
        setSearchResults([]);
        setShowSearch(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target)) setActiveMegaMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className="sticky top-0 z-[100] bg-white/95 dark:bg-dark-bg/95 backdrop-blur border-b border-light-border dark:border-dark-border" onMouseLeave={() => setActiveMegaMenu(null)}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Vidyarthi Mitra" className="h-7 md:h-8" />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {visibleNavLinks.map(l => {
              const isActive = location.pathname === l.to || (l.to !== '/' && location.pathname?.startsWith(l.to + '/'));
              return (
              <div 
                key={l.to} 
                className="relative h-16 flex items-center"
              >
                <Link 
                  to={l.to} 
                  className={`relative px-4 py-3 text-sm font-black tracking-tight transition-all flex items-center gap-1 group overflow-hidden ${
                    isActive ? 'text-accent' : 'text-slate-600 dark:text-slate-300 hover:text-accent'
                  }`}
                >
                  <span className="relative z-10">{l.label}</span>
                  
                  {/* Subtle background highlight on hover/active */}
                  <span className={`absolute inset-0 bg-accent/5 transition-transform duration-300 ease-out ${isActive ? 'translate-y-0' : 'translate-y-[100%] group-hover:translate-y-0'}`} />

                  {/* MIT ADT style multi-colored bar BELOW link */}
                  <div className={`absolute bottom-0 left-0 w-full flex h-[4px] transition-transform duration-300 ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}>
                    <div className="flex-1 bg-[#9c0b89]" />
                    <div className="flex-1 bg-[#ff6b00]" />
                    <div className="flex-1 bg-[#00a651]" />
                  </div>
                </Link>
              </div>
            )})}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted" />
              <input
                type="text" placeholder="Search Thakur, Amity, SAGE..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
                className="pl-10 pr-4 py-2 w-64 text-sm rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:ring-2 focus:ring-primary outline-none transition-all focus:w-80"
              />
              <AnimatePresence>
                {showSearch && searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-2xl overflow-hidden z-[110]"
                  >
                    {searchResults.map(r => (
                      <button key={r._id} onClick={() => { 
                          if (r._type === 'university') navigate(`/universities/${r.slug}`);
                          else if (r.universityId?.slug) navigate(`/universities/${r.universityId.slug}`);
                          setShowSearch(false); 
                          setSearchQuery(''); 
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-dark-border flex items-center gap-3 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                           {r._type === 'university' ? <Building2 className="w-4 h-4 text-primary" /> : <BookOpen className="w-4 h-4 text-indigo-500" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{r.name}</p>
                          <p className="text-[10px] text-light-muted uppercase font-black tracking-widest">
                            {r._type === 'university' ? `${r.city}, ${r.state}` : r.universityId?.name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={toggle} className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-card transition-colors">
              {dark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-card transition-all">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-sm font-black shadow-lg shadow-primary/20 border border-accent/30">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <ChevronDown className={`w-4 h-4 hidden md:block transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-2xl overflow-hidden z-[110]"
                    >
                      <div className="px-5 py-4 bg-slate-50 dark:bg-white/5 border-b border-light-border dark:border-dark-border">
                        <p className="text-sm font-black truncate">{user.name}</p>
                        <p className="text-[10px] text-light-muted font-bold uppercase tracking-widest truncate">{user.email}</p>
                      </div>
                      <div className="p-2">
                        <Link to="/profile?tab=overview" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-primary-50 hover:text-primary rounded-xl transition-all" onClick={() => setShowDropdown(false)}>
                          <User className="w-4 h-4" /> Profile Overview
                        </Link>
                        <Link to="/profile?tab=saved-colleges" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-primary-50 hover:text-primary rounded-xl transition-all" onClick={() => setShowDropdown(false)}>
                          <Bookmark className="w-4 h-4" /> My Shortlist
                        </Link>
                        <Link to="/profile?tab=settings" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-primary-50 hover:text-primary rounded-xl transition-all" onClick={() => setShowDropdown(false)}>
                          <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <div className="h-px bg-slate-100 dark:bg-white/5 my-2 mx-2" />
                        <button onClick={() => { logout(); setShowDropdown(false); navigate('/'); }} className="flex items-center gap-3 px-4 py-2.5 text-sm font-black w-full text-left text-error hover:bg-red-50 rounded-xl transition-all">
                          <LogOut className="w-4 h-4" /> Logout Account
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">Login</Link>
                <Link to="/signup" className="bg-primary text-white text-sm font-black px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all">Sign Up</Link>
              </div>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-slate-600 dark:text-slate-300">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>


        {mobileOpen && (
          <div className="lg:hidden py-6 border-t border-light-border dark:border-dark-border space-y-2">
            <div className="relative mb-6 px-4">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted" />
              <input type="text" placeholder="Search..." className="pl-12 pr-4 py-3 w-full text-sm rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card outline-none" />
            </div>
            {visibleNavLinks.map(l => (
              <div key={l.to}>
                <Link 
                  to={l.to} 
                  onClick={() => setMobileOpen(false)} 
                  className="flex items-center justify-between px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-card"
                >
                  {l.label}
                </Link>
              </div>
            ))}
            {!user && (
              <div className="flex gap-4 mt-8 px-6">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-3 text-sm font-black border-2 border-primary text-primary rounded-xl">Login</Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="flex-1 text-center bg-primary text-white text-sm font-black py-3 rounded-xl shadow-lg shadow-primary/20">Sign Up</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
