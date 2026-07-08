import { useState, memo } from 'react';

const getGradient = (name) => {
  const colors = [
    'from-blue-500 to-slate-600',
    'from-emerald-400 to-teal-600',
    'from-slate-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-orange-500 to-purple-700',
    'from-slate-500 to-blue-600'
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getInitials = (name) => {
  if (!name) return 'U';
  // Strip out common words to get meaningful initials
  const clean = name
    .replace(/(Deemed to be University|University|Institute of Technology|Institute|Central|State)/gi, '')
    .trim();
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Rendered once per university card across the listing, home, comparison,
// rank-predictor and detail pages. Memoized so re-renders of a parent list
// (e.g. typing in a search box) don't re-render every logo when its props
// (logoUrl/name/className — all primitives) are unchanged.
function UniversityLogo({ logoUrl, name, className = "w-full h-full object-contain" }) {
  const [error, setError] = useState(false);

  // If logo is absent, broken, or matches a known fallback placeholder URL
  const isInvalid = !logoUrl || logoUrl.includes('placeholder') || error;

  if (isInvalid) {
    const gradient = getGradient(name);
    const initials = getInitials(name);

    return (
      <div
        className={`w-full h-full rounded-xl select-none bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold tracking-wide`}
        aria-label={name || 'University logo placeholder'}
      >
        <span className="text-lg md:text-xl">{initials}</span>
      </div>
    );
  }

  return (
    <img 
      src={logoUrl} 
      alt={name} 
      className={className} 
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
    />
  );
}

export default memo(UniversityLogo);
