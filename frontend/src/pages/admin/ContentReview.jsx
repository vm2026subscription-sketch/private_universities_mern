import { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Check, X, ArrowRight, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

/** Turns 'stats.avgPackageLPA' into 'Avg package LPA' for the review table. */
const humanise = (path) =>
  String(path)
    .split('.')
    .pop()
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const show = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/**
 * The queue where a university's credibility-bearing edits wait for a human.
 *
 * Placement figures, NAAC grade, NIRF rank and regulatory approvals do not go
 * live when a university saves them — they land here first. Until now that queue
 * had an API and no screen, so submissions accumulated with no way to clear
 * them, and a university would have waited indefinitely for a review nobody
 * could perform.
 *
 * Approval is per-field on purpose. A reviewer who can confirm a NAAC grade but
 * not a placement percentage should be able to publish the one and leave the
 * other pending, rather than being forced to accept or reject the whole
 * submission.
 */
export default function ContentReview() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [selected, setSelected] = useState({});
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/university-portal/reviews');
      setReviews(data.reviews || []);
      setSelected({});
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load the review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (universityId, fieldPath) => {
    setSelected((prev) => {
      const current = new Set(prev[universityId] || []);
      if (current.has(fieldPath)) current.delete(fieldPath);
      else current.add(fieldPath);
      return { ...prev, [universityId]: [...current] };
    });
  };

  const approve = async (review, fields) => {
    setWorking(true);
    try {
      const { data } = await api.post(`/university-portal/reviews/${review.universityId}/approve`,
        fields ? { fields } : {});
      toast.success(data.message || 'Approved');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not approve');
    } finally {
      setWorking(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) return toast.error('A reason is required');
    setWorking(true);
    try {
      await api.post(`/university-portal/reviews/${rejecting.universityId}/reject`, {
        reason: reason.trim(),
      });
      toast.success('Changes rejected');
      setRejecting(null);
      setReason('');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not reject');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-light-text dark:text-dark-text">Content review</h1>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-1">
            Placement figures, accreditation and rankings submitted by universities.
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-light-border dark:border-dark-border text-light-muted hover:text-light-text transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-light-muted">Loading…</p>
      ) : reviews.length === 0 ? (
        <div className="p-10 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-center">
          <div className="w-11 h-11 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5 text-light-muted dark:text-dark-muted" />
          </div>
          <h2 className="font-semibold text-light-text dark:text-dark-text mt-4">Nothing awaiting review</h2>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-2 max-w-md mx-auto">
            When a university edits its placement figures, NAAC grade, NIRF rank or approvals, the
            change waits here before appearing publicly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const chosen = selected[review.universityId] || [];

            return (
              <div
                key={review.universityId}
                className="rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border overflow-hidden"
              >
                <div className="p-5 border-b border-light-border dark:border-dark-border flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {review.logoUrl ? (
                      <img src={review.logoUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-white border border-light-border p-1" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-light-muted" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-light-text dark:text-dark-text truncate">{review.name}</h3>
                      <p className="text-xs text-light-muted">
                        {review.location}
                        {review.submittedBy?.email ? ` · by ${review.submittedBy.email}` : ''}
                        {review.submittedAt ? ` · ${new Date(review.submittedAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setRejecting(review)}
                      disabled={working}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" /> Reject all
                    </button>
                    <button
                      onClick={() => approve(review, chosen.length ? chosen : null)}
                      disabled={working}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {chosen.length ? `Approve ${chosen.length} selected` : 'Approve all'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-light-muted border-b border-light-border dark:border-dark-border">
                        <th className="p-4 w-10"></th>
                        <th className="p-4">Field</th>
                        <th className="p-4">Currently live</th>
                        <th className="p-4">Proposed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {review.changes.map((change) => (
                        <tr key={change.field} className="border-b border-light-border dark:border-dark-border last:border-0">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={chosen.includes(change.field)}
                              onChange={() => toggle(review.universityId, change.field)}
                              className="rounded border-light-border"
                            />
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-light-text dark:text-dark-text">{humanise(change.field)}</p>
                            <p className="text-[11px] text-light-muted font-mono">{change.field}</p>
                          </td>
                          <td className="p-4 text-light-muted">{show(change.current)}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-2 font-medium text-light-text dark:text-dark-text">
                              <ArrowRight className="w-3.5 h-3.5 text-light-muted" />
                              {show(change.proposed)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection needs a reason — the university has to know what to correct. */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="max-w-md w-full p-6 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-light-text dark:text-dark-text">
                Reject changes from {rejecting.name}?
              </h3>
              <button onClick={() => { setRejecting(null); setReason(''); }} className="text-light-muted hover:text-light-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="text-xs font-semibold uppercase tracking-wide text-light-muted block mt-4 mb-1.5">
              Reason (sent to the university)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Placement report for the stated year was not provided"
              className="input-field resize-none"
              autoFocus
            />

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setRejecting(null); setReason(''); }}
                className="flex-1 py-2.5 rounded-lg border border-light-border dark:border-dark-border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                disabled={working || !reason.trim()}
                className="flex-1 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {working ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
