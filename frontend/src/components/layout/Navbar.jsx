import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, Menu, X, User, Bookmark, Settings, LogOut, ChevronDown } from 'lucide-react';
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
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/universities', label: 'Universities' },
    { to: '/courses', label: 'Courses' },
    { to: '/exams', label: 'Exams' },
    { to: '/compare-universities', label: 'Comparison' },
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
          
          setSearchResults([...unis, ...courses].slice(0, 8)); // limit to top 8 combined
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
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-dark-bg/95 backdrop-blur border-b border-light-border dark:border-dark-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Vidyarthi Mitra" className="h-8" />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {visibleNavLinks.map(l => (
              <Link key={l.to} to={l.to} className="px-3 py-2 text-sm font-medium text-light-muted dark:text-dark-muted hover:text-primary transition-colors rounded-lg hover:bg-primary-50 dark:hover:bg-dark-card">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted" />
              <input
                type="text" placeholder="Search universities..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 text-sm rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:ring-2 focus:ring-primary outline-none"
              />
              {showSearch && searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-lg overflow-hidden z-50">
                  {searchResults.map(r => (
                    <button key={r._id} onClick={() => { 
                        if (r._type === 'university') navigate(`/universities/${r.slug}`);
                        else if (r.universityId?.slug) navigate(`/universities/${r.universityId.slug}`);
                        setShowSearch(false); 
                        setSearchQuery(''); 
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-light-card dark:hover:bg-dark-border flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                           <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${r._type === 'university' ? 'bg-primary/10 text-primary' : 'bg-indigo-500/10 text-indigo-500'}`}>
                             {r._type}
                           </span>
                           <p className="text-sm font-medium line-clamp-1">{r.name}</p>
                        </div>
                        {r._type === 'university' ? (
                          <p className="text-xs text-light-muted">{r.city}, {r.state}</p>
                        ) : (
                          <p className="text-xs text-light-muted">{r.universityId?.name}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggle} className="p-2 rounded-xl hover:bg-light-card dark:hover:bg-dark-card transition-colors">
              {dark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 p-2 rounded-xl hover:bg-light-card dark:hover:bg-dark-card">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <ChevronDown className="w-4 h-4 hidden md:block" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-light-border dark:border-dark-border">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-light-muted">{user.email}</p>
                    </div>
                    <Link to="/profile?tab=overview" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-light-card dark:hover:bg-dark-border" onClick={() => setShowDropdown(false)}>
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <Link to="/profile?tab=saved-colleges" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-light-card dark:hover:bg-dark-border" onClick={() => setShowDropdown(false)}>
                      <Bookmark className="w-4 h-4" /> Saved
                    </Link>
                    <Link to="/profile?tab=settings" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-light-card dark:hover:bg-dark-border" onClick={() => setShowDropdown(false)}>
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <button onClick={() => { logout(); setShowDropdown(false); navigate('/'); }} className="flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left text-error hover:bg-light-card dark:hover:bg-dark-border">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm font-medium hover:text-primary transition-colors">Login</Link>
                <Link to="/signup" className="btn-primary text-sm !py-2 !px-4">Sign Up</Link>
              </div>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden py-4 border-t border-light-border dark:border-dark-border">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted" />
              <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 w-full text-sm rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card outline-none" />
            </div>
            {visibleNavLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium hover:bg-light-card dark:hover:bg-dark-card rounded-lg">
                {l.label}
              </Link>
            ))}
            {!user && (
              <div className="flex gap-2 mt-4 px-4">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-2 text-sm font-medium border border-primary text-primary rounded-xl">Login</Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="flex-1 text-center btn-primary text-sm !py-2">Sign Up</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
