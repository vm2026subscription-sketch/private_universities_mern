import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  GraduationCap, TrendingUp, Award, Building2, Plus, Trash2,
  Save, CheckCircle2, DollarSign, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_RECRUITERS = [
  { id: 1, name: 'Google', category: 'Tech Giant' },
  { id: 2, name: 'Microsoft', category: 'Product Tech' },
  { id: 3, name: 'Amazon', category: 'Cloud & E-Commerce' },
  { id: 4, name: 'TCS Digital', category: 'IT Services' },
  { id: 5, name: 'Deloitte', category: 'Consulting' },
  { id: 6, name: 'Goldman Sachs', category: 'Finance & Banking' },
];

export default function UniversityPlacementSection() {
  const location = useLocation();
  const uni = location.state?.university;

  const [placementStats, setPlacementStats] = useState({
    highestPackage: uni?.stats?.highestPackageLPA || '48.5',
    averagePackage: uni?.stats?.avgPackageLPA || '8.8',
    medianPackage: '7.2',
    placementPercentage: uni?.stats?.placementPercentage || '94.5',
    totalOffers: '640+',
    topRecruiterCount: '120+'
  });

  const [recruiters, setRecruiters] = useState(INITIAL_RECRUITERS);
  const [newRecruiterName, setNewRecruiterName] = useState('');
  const [newRecruiterCat, setNewRecruiterCat] = useState('Tech Giant');
  const [saving, setSaving] = useState(false);

  const handleStatsChange = (field, val) => {
    setPlacementStats(prev => ({ ...prev, [field]: val }));
  };

  const handleAddRecruiter = (e) => {
    e.preventDefault();
    if (!newRecruiterName.trim()) return;
    const newEntry = {
      id: Date.now(),
      name: newRecruiterName.trim(),
      category: newRecruiterCat
    };
    setRecruiters(prev => [...prev, newEntry]);
    setNewRecruiterName('');
    toast.success(`${newEntry.name} added to recruiters list`);
  };

  const handleRemoveRecruiter = (id) => {
    setRecruiters(prev => prev.filter(r => r.id !== id));
    toast.success('Recruiter removed');
  };

  const handleSaveStats = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Placement statistics updated successfully!');
    }, 700);
  };

  return (
    <div className="space-y-8">
      {/* Overview Stats Edit Form */}
      <form onSubmit={handleSaveStats} className="p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-light-border dark:border-dark-border pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-light-text dark:text-dark-text flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" /> Placement & Package Records
            </h2>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
              Update annual placement metrics to highlight campus placement performance.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Placement Metrics'}
          </button>
        </div>

        {/* Highlighted Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Highest Package</span>
            <div className="flex items-center gap-1">
              <span className="text-xl font-extrabold text-light-text dark:text-dark-text">₹</span>
              <input
                type="text"
                value={placementStats.highestPackage}
                onChange={(e) => handleStatsChange('highestPackage', e.target.value)}
                className="w-24 px-2 py-1 rounded-lg border border-emerald-500/30 bg-white dark:bg-dark-card font-extrabold text-lg text-emerald-600"
              />
              <span className="text-xs font-bold text-light-muted">LPA</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">Average Package</span>
            <div className="flex items-center gap-1">
              <span className="text-xl font-extrabold text-light-text dark:text-dark-text">₹</span>
              <input
                type="text"
                value={placementStats.averagePackage}
                onChange={(e) => handleStatsChange('averagePackage', e.target.value)}
                className="w-24 px-2 py-1 rounded-lg border border-blue-500/30 bg-white dark:bg-dark-card font-extrabold text-lg text-blue-600"
              />
              <span className="text-xs font-bold text-light-muted">LPA</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Placement % Rate</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={placementStats.placementPercentage}
                onChange={(e) => handleStatsChange('placementPercentage', e.target.value)}
                className="w-24 px-2 py-1 rounded-lg border border-amber-500/30 bg-white dark:bg-dark-card font-extrabold text-lg text-amber-600"
              />
              <span className="text-xs font-bold text-light-muted">% Placed</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">Total Job Offers</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={placementStats.totalOffers}
                onChange={(e) => handleStatsChange('totalOffers', e.target.value)}
                className="w-24 px-2 py-1 rounded-lg border border-purple-500/30 bg-white dark:bg-dark-card font-extrabold text-lg text-purple-600"
              />
              <span className="text-xs font-bold text-light-muted">Offers</span>
            </div>
          </div>
        </div>
      </form>

      {/* Top Recruiters Management Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-light-border dark:border-dark-border pb-4">
          <div>
            <h3 className="font-bold text-base text-light-text dark:text-dark-text flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" /> Top Recruiting Companies ({recruiters.length})
            </h3>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5">
              Highlight key companies visiting campus during annual placements.
            </p>
          </div>
        </div>

        {/* Add Recruiter Bar */}
        <form onSubmit={handleAddRecruiter} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="Company Name (e.g. Microsoft)"
            value={newRecruiterName}
            onChange={(e) => setNewRecruiterName(e.target.value)}
            className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <select
            value={newRecruiterCat}
            onChange={(e) => setNewRecruiterCat(e.target.value)}
            className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium"
          >
            <option value="Tech Giant">Tech Giant</option>
            <option value="Product Tech">Product Tech</option>
            <option value="Consulting">Consulting</option>
            <option value="Finance & Banking">Finance & Banking</option>
            <option value="Core Engineering">Core Engineering</option>
          </select>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Recruiter
          </button>
        </form>

        {/* Recruiter Chips Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {recruiters.map((r) => (
            <div
              key={r.id}
              className="p-3 rounded-2xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border flex items-center justify-between gap-2 group hover:border-primary transition-all"
            >
              <div className="min-w-0">
                <p className="font-bold text-xs text-light-text dark:text-dark-text truncate">{r.name}</p>
                <span className="text-[10px] text-light-muted dark:text-dark-muted block truncate">{r.category}</span>
              </div>
              <button
                onClick={() => handleRemoveRecruiter(r.id)}
                className="p-1 rounded-lg text-light-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
