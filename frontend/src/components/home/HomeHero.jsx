import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, GraduationCap, Building2, Users, ChevronRight } from "lucide-react";
import Button from "../ui/Button";

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Verified university data" },
  { icon: GraduationCap, label: "Admission guidance" },
  { icon: Building2, label: "700+ institutions" },
];

export default function HomeHero({ onSearch, searchTerm, onSearchTermChange, suggestions = [] }) {
  const navigate = useNavigate();
  const [localQuery, setLocalQuery] = useState(searchTerm || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = localQuery.trim();
    if (!q) return;
    if (onSearch) {
      onSearch(e);
    } else {
      navigate(`/universities?search=${encodeURIComponent(q)}`);
    }
  };

  const displaySuggestions = useMemo(() => suggestions.slice(0, 5), [suggestions]);

  return (
    <section className="relative overflow-hidden bg-slate-900 text-white">
      {/* Subtle grid pattern — no heavy gradients */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800/95" aria-hidden="true" />

      <div className="relative mx-auto max-w-container px-4 py-16 md:py-24 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Copy */}
          <div className="max-w-xl">
            <p className="text-caption font-semibold uppercase tracking-widest text-primary-light mb-4">
              India&apos;s trusted admission platform
            </p>
            <h1 className="text-display text-white mb-4">
              Find the right university for your future
            </h1>
            <p className="text-body text-slate-300 mb-8 max-w-lg">
              Explore private and deemed universities across India. Compare fees, rankings, placements, and apply with confidence.
            </p>

            {/* Trust indicators */}
            <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6 mb-8">
              {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-body-sm text-slate-300">
                  <Icon className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>

            {/* Search */}
            <form onSubmit={handleSubmit} className="relative" role="search">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-light-muted pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={onSearchTermChange ? searchTerm : localQuery}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (onSearchTermChange) onSearchTermChange(v);
                      else setLocalQuery(v);
                    }}
                    placeholder="Search universities, cities, courses..."
                    aria-label="Search universities"
                    className="w-full min-h-[48px] rounded-md border-0 bg-white pl-12 pr-4 text-body text-light-text shadow-elevation-2 placeholder:text-light-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <Button type="submit" size="lg" className="sm:min-w-[140px]">
                  Search
                </Button>
              </div>

              {displaySuggestions.length > 0 && (
                <ul
                  className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-md border border-light-border bg-white shadow-elevation-3"
                  role="listbox"
                >
                  {displaySuggestions.map((s) => (
                    <li key={s.label}>
                      <button
                        type="button"
                        role="option"
                        onClick={s.action}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <p className="text-body-sm font-semibold text-light-text">{s.label}</p>
                          {s.sublabel && (
                            <p className="text-caption text-light-muted">{s.sublabel}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-light-muted shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </form>
          </div>

          {/* Illustration — SVG, no external bitmaps */}
          <div className="hidden lg:flex items-center justify-center" aria-hidden="true">
            <svg
              viewBox="0 0 400 360"
              className="w-full max-w-md text-primary/90"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="40" y="200" width="320" height="120" rx="12" fill="currentColor" opacity="0.15" />
              <rect x="60" y="80" width="80" height="140" rx="8" fill="currentColor" opacity="0.25" />
              <rect x="160" y="40" width="80" height="180" rx="8" fill="currentColor" opacity="0.35" />
              <rect x="260" y="100" width="80" height="120" rx="8" fill="currentColor" opacity="0.2" />
              <circle cx="200" cy="30" r="24" fill="currentColor" opacity="0.5" />
              <path
                d="M200 54 L200 80 M188 68 L212 68"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.6"
              />
              <rect x="100" y="240" width="200" height="8" rx="4" fill="white" opacity="0.2" />
              <rect x="120" y="260" width="160" height="6" rx="3" fill="white" opacity="0.15" />
              <Users className="hidden" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
