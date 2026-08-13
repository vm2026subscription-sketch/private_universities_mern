import { useState, useEffect } from 'react';
import {
  Building2, CheckCircle2, XCircle, Eye, Search, Filter,
  Clock, ShieldAlert, Mail, Phone, MapPin, FileText, Check, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function PendingUniversityRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedReq, setSelectedReq] = useState(null);

  // Reject Modal State
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  /**
   * The API returns claims under `claims`, with its own field names and
   * lowercase statuses. This normalises them into the shape the table below
   * renders, so the two can evolve without every cell needing to know both.
   */
  const normalizeClaim = (claim) => ({
    id: claim.id,
    name: claim.universityName || 'Not listed yet',
    city: claim.city || '',
    state: claim.state || '',
    contactPerson: claim.contactPerson,
    designation: claim.designation,
    email: claim.officialEmail,
    phone: claim.phone,
    website: claim.website,
    appliedDate: claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : '—',
    // 'pending' → 'Pending'. The table compares against capitalised labels.
    status: claim.status ? claim.status[0].toUpperCase() + claim.status.slice(1) : 'Pending',
    documentsUrl: claim.authorizationLetterUrl || '',
    emailSignal: claim.emailSignal,
    emailDomain: claim.emailDomain,
    // Whether the applicant's email domain matches the university they claim.
    // This replaces the mock's "tier" — an applicant does not choose a tier, and
    // the signal is what a reviewer actually needs to see at a glance.
    needsExtraScrutiny: claim.needsExtraScrutiny,
    isEmailVerified: claim.applicant?.isEmailVerified,
  });

  const fetchClaims = async () => {
    setLoading(true);
    try {
      let page = 1;
      let allClaims = [];
      let pages = 1;

      do {
        const { data } = await api.get(`/university-portal/claims?status=all&limit=100&page=${page}`);
        if (!data?.success) break;
        allClaims = allClaims.concat(data.claims || []);
        pages = data.pages || 1;
        page += 1;
      } while (page <= pages);

      setRequests(allClaims.map(normalizeClaim));
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast.error(error.response?.data?.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleApprove = async (id) => {
    try {
      const { data } = await api.post(`/university-portal/claims/${id}/approve`);
      if (data?.success) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
        toast.success(data.message || `Request ${id} approved! University added to portal listings.`);
        if (selectedReq?.id === id) setSelectedReq(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Approval failed');
    }
  };

  const handleOpenReject = (id) => {
    setRejectModalId(id);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please specify a rejection reason for the applicant');
      return;
    }
    try {
      const { data } = await api.post(`/university-portal/claims/${rejectModalId}/reject`, { reason: rejectReason.trim() });
      if (data?.success) {
        setRequests(prev => prev.map(r => r.id === rejectModalId ? { ...r, status: 'Rejected', rejectionReason: rejectReason } : r));
        toast.error(`Request ${rejectModalId} rejected.`);
        setRejectModalId(null);
        if (selectedReq?.id === rejectModalId) setSelectedReq(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Rejection failed');
    }
  };

  const filteredRequests = requests.filter(r => {
    // Guarded: a claim for an unlisted university has no city, and an
    // unguarded .toLowerCase() on it threw before a single row could render.
    const term = search.toLowerCase();
    const matchesSearch =
      (r.name || '').toLowerCase().includes(term) ||
      (r.city || '').toLowerCase().includes(term) ||
      (r.contactPerson || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-light-text dark:text-dark-text flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" /> Pending University Applications
          </h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
            Review and approve incoming university verification & onboarding requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {requests.filter(r => r.status === 'Pending').length} Pending Requests
          </span>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-light-muted absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by university name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['All', 'Pending', 'Approved', 'Rejected'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white dark:bg-dark-card text-light-muted dark:text-dark-muted border border-light-border dark:border-dark-border hover:text-light-text'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-light-bg/60 dark:bg-dark-bg/60 border-b border-light-border dark:border-dark-border text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">University & Location</th>
                <th className="p-4">Contact Officer</th>
                <th className="p-4">Email Signal</th>
                <th className="p-4">Applied Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Approve / Reject Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border font-medium text-light-text dark:text-dark-text">
              {loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-light-muted dark:text-dark-muted">
                    Loading requests...
                  </td>
                </tr>
              )}
              {!loading && filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-light-muted dark:text-dark-muted">
                    No requests match your search or filter.
                  </td>
                </tr>
              )}
              {!loading && filteredRequests.map((r) => (
                <tr key={r.id} className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/30 transition-colors">
                  <td className="p-4 pl-6">
                    <p className="font-bold text-sm text-light-text dark:text-dark-text">{r.name}</p>
                    <p className="text-light-muted dark:text-dark-muted text-[11px] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-primary" /> {r.city}, {r.state}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-light-text dark:text-dark-text">{r.contactPerson}</p>
                    <p className="text-light-muted text-[11px]">{r.designation}</p>
                    <p className="text-light-muted text-[11px]">{r.email}</p>
                  </td>
                  <td className="p-4">
                    {/* Green only for an address on the university's own domain.
                        Everything else is amber — including .edu.in addresses
                        that belong to a different institution. */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        r.emailSignal === 'official'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                      title={r.emailDomain || ''}
                    >
                      {r.emailSignal || 'unknown'}
                    </span>
                    {r.needsExtraScrutiny && (
                      <p className="text-[10px] text-amber-600 mt-1 font-semibold">Verify by phone</p>
                    )}
                  </td>
                  <td className="p-4 text-light-muted">
                    {r.appliedDate}
                  </td>
                  <td className="p-4">
                    {r.status === 'Pending' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Pending Review
                      </span>
                    )}
                    {r.status === 'Approved' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Approved
                      </span>
                    )}
                    {r.status === 'Rejected' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                        Rejected
                      </span>
                    )}
                  </td>
                  <td className="p-4 pr-6 text-right space-x-2">
                    <button
                      onClick={() => setSelectedReq(r)}
                      className="p-2 rounded-xl border border-light-border dark:border-dark-border hover:bg-light-card"
                      title="View Full Application"
                    >
                      <Eye className="w-4 h-4 text-light-muted" />
                    </button>
                    {r.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 inline-flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleOpenReject(r.id)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 font-bold text-xs hover:bg-red-500 hover:text-white transition-all inline-flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Drawer / Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-xl w-full p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-3">
              <h3 className="font-bold text-base text-light-text dark:text-dark-text">
                Application Details - {selectedReq.id}
              </h3>
              <button onClick={() => setSelectedReq(null)} className="p-1 rounded-lg text-light-muted hover:text-light-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-light-muted uppercase text-[10px]">Institution Name:</span>
                <p className="font-extrabold text-sm text-light-text dark:text-dark-text">{selectedReq.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-bold text-light-muted uppercase text-[10px]">Location:</span>
                  <p className="font-semibold">
                    {[selectedReq.city, selectedReq.state].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-light-muted uppercase text-[10px]">Designation:</span>
                  <p className="font-semibold">{selectedReq.designation || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-bold text-light-muted uppercase text-[10px]">Contact Person:</span>
                  <p className="font-semibold">{selectedReq.contactPerson}</p>
                </div>
                <div>
                  <span className="font-bold text-light-muted uppercase text-[10px]">Email & Phone:</span>
                  <p className="font-semibold">{selectedReq.email}</p>
                  <p className="text-light-muted">{selectedReq.phone}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold text-light-muted"
              >
                Close
              </button>
              {selectedReq.status === 'Pending' && (
                <button
                  onClick={() => handleApprove(selectedReq.id)}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600"
                >
                  Approve Application
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-light-text dark:text-dark-text">Reject Application?</h3>
            <p className="text-xs text-light-muted">
              Please specify the reason for rejecting request <strong>{rejectModalId}</strong>. This feedback will be sent to the university.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Invalid UGC/AICTE accreditation documents provided..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectModalId(null)}
                className="px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold text-light-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
