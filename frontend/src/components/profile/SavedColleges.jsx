import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Trash2, Star, MessageSquare, Share2, GitCompare, Download, FileText, ExternalLink, Heart } from 'lucide-react';

function StarRating({ value = 0, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          className="text-yellow-400 hover:scale-110 transition-transform">
          <Star className="w-4 h-4" fill={(hover||value)>=n?'currentColor':'none'} />
        </button>
      ))}
    </div>
  );
}

import { calculateFitScore } from '../../utils/fitScore';

export default function SavedColleges({ savedUnis, ratings, notes, compareList, onRemove, onRating, onNoteSave, onShare, onShareWA, onToggleCompare, onExportPDF, onExportExcel, userPrefs }) {
  const [activeNote, setActiveNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [sortBy, setSortBy] = useState('fitScore');
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('vm_favorites') || '[]'));

  const toggleFavorite = (id) => {
    const newFavs = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('vm_favorites', JSON.stringify(newFavs));
  };

  const openNote = (uni) => {
    setActiveNote(uni._id);
    setNoteText(notes[uni._id] || '');
  };

  if (savedUnis.length === 0) return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-dark-border flex items-center justify-center mx-auto mb-4">
        <GitCompare className="w-8 h-8 text-primary" />
      </div>
      <p className="text-light-muted mb-4">No saved colleges yet. Browse and bookmark your favourites!</p>
      <Link to="/universities" className="btn-primary text-sm">Browse Colleges</Link>
    </div>
  );

  const sortedUnis = [...savedUnis].sort((a, b) => {
    const aFav = favorites.includes(a._id);
    const bFav = favorites.includes(b._id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    if (sortBy === 'fitScore') return calculateFitScore(b, userPrefs) - calculateFitScore(a, userPrefs);
    if (sortBy === 'state') return a.state.localeCompare(b.state);
    if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '');
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">Saved Colleges <span className="badge badge-orange">{savedUnis.length}</span></h2>
        <div className="flex flex-wrap items-center gap-3">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-field !py-2 !w-auto text-sm">
            <option value="fitScore">Sort by Fit Score</option>
            <option value="name">Sort by Name</option>
            <option value="state">Sort by State</option>
            <option value="type">Sort by Type</option>
          </select>
          <div className="flex gap-2">
            <button onClick={onExportPDF} className="btn-outline !py-2 !px-3 text-sm flex items-center gap-1.5">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button onClick={onExportExcel} className="btn-outline !py-2 !px-3 text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>
      </div>

      {sortedUnis.map(u => {
        const isFav = favorites.includes(u._id);
        const fitScore = calculateFitScore(u, userPrefs);
        return (
        <div key={u._id} className={`card p-5 space-y-4 transition-all relative ${isFav ? 'border-primary/30 shadow-lg' : 'hover:shadow-lg'}`}>
          {/* Favorite Pin */}
          <button 
            onClick={() => toggleFavorite(u._id)}
            className={`absolute top-4 right-4 p-2 rounded-full z-10 transition-colors ${isFav ? 'bg-red-50 text-red-500' : 'bg-light-bg text-light-muted hover:bg-red-50 hover:text-red-400 dark:bg-dark-border'}`}
          >
            <Heart className="w-4 h-4" fill={isFav ? "currentColor" : "none"} />
          </button>
          
          {fitScore > 50 && (
             <div className="absolute top-0 right-16 bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-bl-xl border-b border-l border-primary/20">
                {fitScore}% MATCH
             </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Logo placeholder */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-primary font-bold text-lg shrink-0 ${isFav ? 'bg-primary/20' : 'bg-primary-50 dark:bg-dark-border'}`}>
              {u.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link to={`/universities/${u.slug}`} className="font-semibold hover:text-primary transition-colors line-clamp-1">
                    {u.name}
                  </Link>
                  <p className="text-sm text-light-muted flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{u.city}, {u.state}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <div className="flex items-center gap-1 bg-primary text-white px-3 py-1 rounded-full text-xs font-black shadow-lg shadow-primary/20">
                    {calculateFitScore(u, userPrefs)}% Match
                  </div>
                  <span className="badge badge-orange capitalize">{u.type}</span>
                  {u.naacGrade && <span className="badge badge-green">NAAC {u.naacGrade}</span>}
                  {u.nirfRank && <span className="badge badge-blue">NIRF #{u.nirfRank}</span>}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-light-muted">Your Rating:</span>
                <StarRating value={ratings[u._id] || 0} onChange={r => onRating(u._id, r)} />
                {ratings[u._id] && <span className="text-xs text-yellow-500 font-semibold">{ratings[u._id]}/5</span>}
              </div>

              {/* Note preview */}
              {notes[u._id] && activeNote !== u._id && (
                <p className="text-xs text-light-muted mt-2 italic border-l-2 border-primary pl-2 line-clamp-2">
                  {notes[u._id]}
                </p>
              )}

              {/* Note editor */}
              {activeNote === u._id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add a note about this college…"
                    rows={3}
                    className="input-field text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { onNoteSave(u._id, noteText); setActiveNote(null); }}
                      className="btn-primary !py-1.5 !px-4 text-sm">Save</button>
                    <button onClick={() => setActiveNote(null)}
                      className="btn-outline !py-1.5 !px-4 text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-light-border dark:border-dark-border">
            <Link to={`/universities/${u.slug}`}
              className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> View
            </Link>
            <button onClick={() => openNote(u)}
              className="btn-outline !py-1.5 !px-3 text-xs flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> {notes[u._id] ? 'Edit Note' : 'Add Note'}
            </button>
            <button
              onClick={() => onToggleCompare(u)}
              className={`btn-outline !py-1.5 !px-3 text-xs flex items-center gap-1 ${compareList.find(c=>c._id===u._id)?'bg-indigo-100 text-indigo-700 border-indigo-300':''}`}>
              <GitCompare className="w-3 h-3" /> {compareList.find(c=>c._id===u._id)?'Remove from Compare':'Compare'}
            </button>
            <button onClick={() => onShare(u)}
              className="btn-outline !py-1.5 !px-3 text-xs flex items-center gap-1">
              <Share2 className="w-3 h-3" /> Share
            </button>
            <button onClick={() => onShareWA(u)}
              className="btn-outline !py-1.5 !px-3 text-xs flex items-center gap-1 text-green-600 border-green-400 hover:bg-green-50">
              <Share2 className="w-3 h-3" /> WhatsApp
            </button>
            <button onClick={() => onRemove(u._id)}
              className="btn-outline !py-1.5 !px-3 text-xs flex items-center gap-1 text-red-500 border-red-300 hover:bg-red-50 ml-auto">
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      )})}
    </div>
  );
}
