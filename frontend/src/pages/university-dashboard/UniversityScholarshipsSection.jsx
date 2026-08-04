import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Award, Plus, Edit3, Trash2, X, ExternalLink, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const EMPTY_FORM = { name: '', amount: '', eligibility: '', deadline: '', link: '', description: '' };

/**
 * Scholarships offered by the university.
 *
 * Edits the fields the record actually has — name, amount, eligibility,
 * deadline, link, description. The earlier version invented a "type" (always
 * "Merit Based") and a "status" (always "Active") that were displayed as though
 * the university had chosen them, then wrote the type back into the description
 * field as "Merit Based scholarship". It also had no inputs for deadline or
 * link, so two fields students care about most — when to apply and where — could
 * not be filled in at all.
 *
 * The whole list is saved on every change because the record stores an array;
 * that is also why deleting works here, where the gallery needed its own
 * endpoint.
 */
export default function UniversityScholarshipsSection() {
  const context = useOutletContext();
  const uni = context?.uni;
  const refreshUni = context?.refreshUni;

  const [scholarships, setScholarships] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setScholarships(
      (uni?.scholarships || []).map((s) => ({
        name: s.name || '',
        amount: s.amount || '',
        eligibility: s.eligibility || '',
        // Stored as a Date; the input needs YYYY-MM-DD.
        deadline: s.deadline ? new Date(s.deadline).toISOString().slice(0, 10) : '',
        link: s.link || '',
        description: s.description || '',
      }))
    );
  }, [uni]);

  const persist = async (list) => {
    setSaving(true);
    try {
      const { data } = await api.put('/university-portal/my-university', {
        scholarships: list.map((s) => ({
          name: s.name,
          amount: s.amount || undefined,
          eligibility: s.eligibility || undefined,
          deadline: s.deadline || undefined,
          link: s.link || undefined,
          description: s.description || undefined,
        })),
      });

      if (data?.success) {
        setScholarships(list);
        if (data.rejected?.length) toast.error(`Not saved: ${data.rejected.join(', ')}`);
        else toast.success('Saved.');
        if (refreshUni) refreshUni();
        return true;
      }
      return false;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save scholarships');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditingIndex(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (index) => {
    setEditingIndex(index);
    setForm(scholarships[index]);
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Scholarship name is required');

    const list =
      editingIndex === null
        ? [...scholarships, form]
        : scholarships.map((s, i) => (i === editingIndex ? form : s));

    if (await persist(list)) {
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setEditingIndex(null);
    }
  };

  const handleDelete = async () => {
    if (await persist(scholarships.filter((_, i) => i !== deleteIndex))) {
      setDeleteIndex(null);
    }
  };

  const field = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-light-text dark:text-dark-text">Scholarships</h1>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-1">
            Financial aid students can apply for. Published immediately.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add scholarship
        </button>
      </div>

      {scholarships.length === 0 ? (
        <div className="p-12 rounded-xl bg-white dark:bg-dark-card border border-dashed border-light-border dark:border-dark-border text-center">
          <div className="w-11 h-11 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border flex items-center justify-center mx-auto">
            <Award className="w-5 h-5 text-light-muted dark:text-dark-muted" />
          </div>
          <h2 className="font-semibold text-light-text dark:text-dark-text mt-4">No scholarships listed</h2>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-2">
            Fee support is one of the first things students filter on.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scholarships.map((s, index) => (
            <div
              key={`${s.name}-${index}`}
              className="p-5 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-light-text dark:text-dark-text">{s.name}</h3>
                  {s.amount && <p className="text-sm text-primary font-medium mt-0.5">{s.amount}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(index)}
                    className="p-2 rounded-lg text-light-muted hover:text-light-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteIndex(index)}
                    className="p-2 rounded-lg text-light-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {s.eligibility && (
                <p className="text-sm text-light-muted dark:text-dark-muted mt-3 leading-relaxed">
                  {s.eligibility}
                </p>
              )}

              {(s.deadline || s.link) && (
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-light-border dark:border-dark-border">
                  {s.deadline && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-light-muted">
                      <Calendar className="w-3.5 h-3.5" />
                      Apply by {new Date(s.deadline).toLocaleDateString()}
                    </span>
                  )}
                  {s.link && (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Details
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="max-w-lg w-full p-6 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-light-text dark:text-dark-text">
                {editingIndex === null ? 'Add scholarship' : 'Edit scholarship'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-light-muted hover:text-light-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-light-muted block mb-1.5">
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) => field('name', e.target.value)}
                placeholder="e.g. Merit Scholarship"
                className="input-field"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-light-muted block mb-1.5">
                  Amount
                </label>
                <input
                  value={form.amount}
                  onChange={(e) => field('amount', e.target.value)}
                  placeholder="e.g. 50% tuition waiver"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-light-muted block mb-1.5">
                  Apply by
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => field('deadline', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-light-muted block mb-1.5">
                Eligibility
              </label>
              <textarea
                value={form.eligibility}
                onChange={(e) => field('eligibility', e.target.value)}
                placeholder="e.g. 90%+ in Class 12, family income under ₹8 LPA"
                rows={2}
                className="input-field resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-light-muted block mb-1.5">
                Details link
              </label>
              <input
                type="url"
                value={form.link}
                onChange={(e) => field('link', e.target.value)}
                placeholder="https://…"
                className="input-field"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-light-muted block mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => field('description', e.target.value)}
                rows={2}
                className="input-field resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-light-border dark:border-dark-border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : editingIndex === null ? 'Add' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="max-w-sm w-full p-6 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
            <h3 className="font-semibold text-light-text dark:text-dark-text">Remove scholarship?</h3>
            <p className="text-sm text-light-muted dark:text-dark-muted mt-2">
              “{scholarships[deleteIndex]?.name}” will disappear from your public page.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteIndex(null)}
                className="flex-1 py-2.5 rounded-lg border border-light-border dark:border-dark-border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {saving ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
