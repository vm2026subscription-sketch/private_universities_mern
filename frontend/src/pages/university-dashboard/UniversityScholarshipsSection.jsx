import { useState } from 'react';
import {
  Award, Plus, Edit3, Trash2, CheckCircle2, AlertCircle,
  Sparkles, DollarSign, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_SCHOLARSHIPS = [
  { id: 1, title: 'Merit Academic Excellence Award', type: 'Merit Based', amount: 'Up to 100% Tuition Fee Waiver', criteria: '90%+ in 10+2 or top 1000 JEE Main rank', status: 'Active' },
  { id: 2, title: 'National Sports Star Scholarship', type: 'Sports & Arts', amount: '50% Fee Waiver', criteria: 'State or National level sports representation', status: 'Active' },
  { id: 3, title: 'Need-Based Financial Assistance', type: 'Financial Need', amount: 'Up to ₹1,00,000 / year', criteria: 'Annual family income below ₹4.5 LPA', status: 'Active' },
  { id: 4, title: 'Women in STEM Leadership Grant', type: 'Special Category', amount: '35% Fee Concession', criteria: 'Female candidates enrolling in CSE / AI branches', status: 'Active' },
];

export default function UniversityScholarshipsSection() {
  const [scholarships, setScholarships] = useState(INITIAL_SCHOLARSHIPS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    title: '', type: 'Merit Based', amount: '', criteria: '', status: 'Active'
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ title: '', type: 'Merit Based', amount: '', criteria: '', status: 'Active' });
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({ title: item.title, type: item.type, amount: item.amount, criteria: item.criteria, status: item.status });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) {
      toast.error('Please enter scholarship title and reward amount');
      return;
    }

    if (editingItem) {
      setScholarships(prev => prev.map(s => s.id === editingItem.id ? { ...s, ...formData } : s));
      toast.success('Scholarship updated successfully!');
    } else {
      const newItem = { id: Date.now(), ...formData };
      setScholarships(prev => [newItem, ...prev]);
      toast.success('New scholarship scheme published!');
    }
    setModalOpen(false);
  };

  const handleDelete = (id) => {
    setScholarships(prev => prev.filter(s => s.id !== id));
    setDeleteId(null);
    toast.success('Scholarship removed');
  };

  return (
    <div className="space-y-8">
      {/* Header & Add Button */}
      <div className="p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-light-text dark:text-dark-text flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" /> Scholarships & Financial Grants
          </h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
            Offer merit and need-based tuition fee concessions to attract high-ranking students.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Scholarship Scheme
        </button>
      </div>

      {/* Scholarship Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scholarships.map((s) => (
          <div
            key={s.id}
            className="p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm hover:border-primary transition-all space-y-4 relative flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {s.type}
                </span>
                <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  {s.status}
                </span>
              </div>
              <h3 className="font-extrabold text-base text-light-text dark:text-dark-text">{s.title}</h3>
              <p className="text-sm font-bold text-primary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" /> {s.amount}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs space-y-1">
              <span className="font-bold text-light-muted uppercase tracking-wider text-[10px]">Eligibility Criteria:</span>
              <p className="text-light-text dark:text-dark-text font-medium">{s.criteria}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-light-border dark:border-dark-border">
              <button
                onClick={() => handleOpenEdit(s)}
                className="px-3 py-1.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-semibold hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => setDeleteId(s.id)}
                className="px-3 py-1.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-semibold text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Scholarship Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-lg w-full p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-3">
              <h3 className="font-bold text-base text-light-text dark:text-dark-text">
                {editingItem ? 'Edit Scholarship Scheme' : 'Add New Scholarship'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-light-muted hover:text-light-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                  Scholarship Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Merit Academic Excellence Award"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                    Category Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium"
                  >
                    <option value="Merit Based">Merit Based</option>
                    <option value="Sports & Arts">Sports & Arts</option>
                    <option value="Financial Need">Financial Need</option>
                    <option value="Special Category">Special Category</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                    Reward / Concession
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50% Tuition Waiver"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                  Eligibility Criteria & Rules
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe minimum marks, rank or income threshold required..."
                  value={formData.criteria}
                  onChange={(e) => setFormData(prev => ({ ...prev, criteria: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold text-light-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 shadow-md shadow-primary/20"
                >
                  Save Scholarship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-light-text dark:text-dark-text">Remove Scholarship?</h3>
            <p className="text-xs text-light-muted dark:text-dark-muted">
              Are you sure you want to remove this scholarship offering?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold text-light-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
