import { useState } from 'react';
import { BookOpen, Plus, Trash2, Search } from 'lucide-react';

export default function SavedCourses({ savedCourses, allCourses, onAdd, onRemove }) {
  const [search, setSearch] = useState('');
  const [showBrowse, setShowBrowse] = useState(false);

  const savedIds = new Set(savedCourses.map(c => c._id));
  const filtered = allCourses.filter(c =>
    !savedIds.has(c._id) &&
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Saved Courses ({savedCourses.length})
        </h2>
        <button onClick={() => setShowBrowse(v => !v)}
          className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> {showBrowse ? 'Hide Browser' : 'Add Courses'}
        </button>
      </div>

      {/* Saved list */}
      {savedCourses.length === 0 ? (
        <div className="card p-8 text-center text-light-muted">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-light-muted" />
          <p>No courses saved yet. Click "Add Courses" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {savedCourses.map(c => (
            <div key={c._id} className="card p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm line-clamp-1">{c.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {c.category && <span className="badge badge-blue text-[10px]">{c.category}</span>}
                  {c.duration && <span className="badge badge-orange text-[10px]">{c.duration}yr</span>}
                  {c.feesPerYear && <span className="badge badge-green text-[10px]">₹{c.feesPerYear.toLocaleString()}/yr</span>}
                </div>
              </div>
              <button onClick={() => onRemove(c._id)}
                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Browse all courses */}
      {showBrowse && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">Browse & Add Courses</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search courses…" className="input-field pl-9 text-sm" />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-light-muted text-center py-4">
              {allCourses.length === 0 ? 'No courses in database.' : 'All courses already saved or no match.'}
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filtered.slice(0, 50).map(c => (
                <div key={c._id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-light-card dark:bg-dark-border">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.category && <p className="text-xs text-light-muted">{c.category} · {c.duration ? `${c.duration}yr` : ''}</p>}
                  </div>
                  <button onClick={() => onAdd(c._id)}
                    className="btn-primary !py-1 !px-3 text-xs flex items-center gap-1 shrink-0">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
