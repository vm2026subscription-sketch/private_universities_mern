import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Moon,
  Sun,
  Menu,
  X,
  User,
  Bookmark,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  BookOpen,
  Shield,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import logo from "../../assets/logo.png";
import AccessibilityWidget from "./AccessibilityWidget";
import { buttonVariants } from "../ui/Button";
import { cn } from "../../utils/cn";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/universities", label: "Universities" },
  { to: "/courses", label: "Courses" },
  { to: "/exams", label: "Exams" },
  { to: "/compare-universities", label: "Compare" },
  { to: "/foreign-universities", label: "Abroad" },
];

export default function Navbar() {
  const { dark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const navLinks = isAdmin
    ? [...NAV_LINKS, { to: "/admin", label: "Admin" }]
    : NAV_LINKS;

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path + "/"));

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          const [uniRes, courseRes] = await Promise.all([
            api.get(`/universities/search?q=${searchQuery}`),
            api.get(`/courses?name=${searchQuery}`),
          ]);
          const unis = (uniRes.data.data || []).map((u) => ({ ...u, _type: "university" }));
          const courses = (courseRes.data.data || []).map((c) => ({ ...c, _type: "course" }));
          setSearchResults([...unis, ...courses].slice(0, 8));
          setShowSearch(true);
        } catch {
          setSearchResults([]);
        }
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
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSearchSelect = (r) => {
    if (r._type === "university") navigate(`/universities/${r.slug}`);
    else if (r.universityId?.slug) navigate(`/universities/${r.universityId.slug}`);
    setShowSearch(false);
    setSearchQuery("");
  };

  const SearchInput = ({ className, id }) => (
    <div className={cn("relative", className)} ref={searchRef}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-muted pointer-events-none" aria-hidden="true" />
      <input
        id={id}
        type="search"
        placeholder="Search universities, courses..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
        aria-label="Search"
        aria-expanded={showSearch && searchResults.length > 0}
        aria-controls="nav-search-results"
        className="w-full min-h-[40px] rounded-md border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card pl-10 pr-4 text-body-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 md:w-56 lg:w-64"
      />
      {showSearch && searchResults.length > 0 && (
        <ul
          id="nav-search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 z-[110] mt-2 max-h-80 overflow-auto rounded-md border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card shadow-elevation-3"
        >
          {searchResults.map((r) => (
            <li key={r._id} role="option">
              <button
                type="button"
                onClick={() => handleSearchSelect(r)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-dark-border transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                  {r._type === "university" ? (
                    <Building2 className="h-4 w-4 text-primary" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold">{r.name}</p>
                  <p className="text-caption text-light-muted uppercase">
                    {r._type === "university" ? `${r.city}, ${r.state}` : r.universityId?.name}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-[100] border-b border-light-border dark:border-dark-border bg-light-card/95 dark:bg-dark-bg/95 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-container items-center justify-between gap-4 px-4" aria-label="Main navigation">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Vidyarthi Mitra home">
          <img src={logo} alt="" className="h-7 md:h-8" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "relative px-3 py-2 text-body-sm font-semibold rounded-md transition-colors",
                isActive(l.to)
                  ? "text-primary bg-primary/10"
                  : "text-light-muted hover:text-light-text hover:bg-slate-100 dark:hover:bg-dark-card dark:hover:text-dark-text"
              )}
              aria-current={isActive(l.to) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SearchInput className="hidden md:block" id="nav-search-desktop" />

          <button
            type="button"
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-md text-light-muted hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
          </button>

          <AccessibilityWidget inline />

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
                aria-expanded={showDropdown}
                aria-haspopup="true"
                aria-label="Account menu"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <ChevronDown className={cn("hidden h-4 w-4 md:block transition-transform", showDropdown && "rotate-180")} />
              </button>
              {showDropdown && (
                <div
                  className="absolute right-0 top-full z-[110] mt-2 w-56 overflow-hidden rounded-md border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card shadow-elevation-3"
                  role="menu"
                >
                  <div className="border-b border-light-border dark:border-dark-border px-4 py-3">
                    <p className="truncate text-body-sm font-semibold">{user.name}</p>
                    <p className="truncate text-caption text-light-muted">{user.email}</p>
                  </div>
                  <div className="p-2">
                    {[
                      { to: "/profile?tab=overview", icon: User, label: "Profile" },
                      { to: "/profile?tab=saved-colleges", icon: Bookmark, label: "My Shortlist" },
                      { to: "/profile?tab=settings", icon: Settings, label: "Settings" },
                    ].map(({ to, icon: Icon, label }) => (
                      <Link
                        key={to}
                        to={to}
                        role="menuitem"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-medium text-light-muted hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        <Icon className="h-4 w-4" /> {label}
                      </Link>
                    ))}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        role="menuitem"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        <Shield className="h-4 w-4" /> Admin Panel
                      </Link>
                    )}
                    <div className="my-2 border-t border-light-border dark:border-dark-border" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { logout(); setShowDropdown(false); navigate("/"); }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-semibold text-error hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Log in
              </Link>
              <Link to="/signup" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
                Sign up
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-md lg:hidden text-light-text dark:text-dark-text"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-light-border dark:border-dark-border lg:hidden">
          <div className="mx-auto max-w-container space-y-1 px-4 py-4">
            <SearchInput className="mb-4" id="nav-search-mobile" />
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "block rounded-md px-4 py-3 text-body-sm font-semibold transition-colors",
                  isActive(l.to)
                    ? "bg-primary/10 text-primary"
                    : "text-light-text dark:text-dark-text hover:bg-slate-100 dark:hover:bg-dark-card"
                )}
                aria-current={isActive(l.to) ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
            {!user && (
              <div className="flex gap-3 pt-4">
                <Link to="/login" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}>
                  Log in
                </Link>
                <Link to="/signup" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "flex-1")}>
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
