import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2, Clock3, ExternalLink, Eye, FileCheck2, GraduationCap, Mail,
  MessageCircle, Phone, RefreshCw, Save, Trash2, UserRoundCheck, UsersRound,
} from 'lucide-react';
import api from '../../utils/api';
import { useRole } from '../../hooks/useRole';
import DataTable from './components/DataTable';
import Modal from '../../components/ui/Modal';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'counselling', label: 'Counselling' },
  { value: 'documents_pending', label: 'Documents pending' },
  { value: 'applied', label: 'Applied' },
  { value: 'admitted', label: 'Admitted' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_STYLES = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  contacted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  counselling: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  documents_pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  applied: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  admitted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const statusLabel = (status) => STATUS_OPTIONS.find((option) => option.value === status)?.label || status;

const formatDate = (value, withTime = false) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
};

function DetailItem({ label, value, href }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider font-bold text-light-muted dark:text-dark-muted mb-1">{label}</p>
      {href ? <a href={href} className="font-semibold text-link hover:underline break-all">{value || '—'}</a> : <p className="font-semibold break-words">{value || '—'}</p>}
    </div>
  );
}

export default function AdmissionApplicationsManager() {
  const { canDelete } = useRole();
  const [items, setItems] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [draftStatus, setDraftStatus] = useState('new');
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/admission-applications', {
        params: { status: statusFilter, limit: 200 },
      });
      let applications = data.data || [];
      const remainingPages = Math.max((data.pagination?.pages || 1) - 1, 0);
      if (remainingPages > 0) {
        const responses = await Promise.all(
          Array.from({ length: remainingPages }, (_, index) => api.get('/admin/admission-applications', {
            params: { status: statusFilter, limit: 200, page: index + 2 },
          }))
        );
        applications = applications.concat(responses.flatMap((response) => response.data.data || []));
      }
      setItems(applications);
      setStatusCounts(data.statusCounts || {});
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load admission requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openDetails = (application) => {
    setSelected(application);
    setDraftStatus(application.status);
    setDraftNotes(application.adminNotes || '');
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/admin/admission-applications/${selected._id}`, {
        status: draftStatus,
        adminNotes: draftNotes,
      });
      setSelected(data.data);
      setItems((current) => current.map((item) => item._id === data.data._id ? data.data : item));
      toast.success('Admission request updated.');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update the request.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (application) => {
    if (!window.confirm(`Delete ${application.applicationNumber}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/admission-applications/${application._id}`);
      setItems((current) => current.filter((item) => item._id !== application._id));
      if (selected?._id === application._id) setSelected(null);
      toast.success('Admission request deleted.');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete the request.');
    }
  };

  const total = useMemo(() => Object.values(statusCounts).reduce((sum, count) => sum + count, 0), [statusCounts]);
  const cards = [
    { label: 'All requests', value: total, icon: UsersRound, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
    { label: 'New', value: statusCounts.new || 0, icon: Clock3, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'In counselling', value: statusCounts.counselling || 0, icon: UserRoundCheck, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
    { label: 'Admitted', value: statusCounts.admitted || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Admission Through VM</h2>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-1">Review student preferences, manage counselling and track outcomes.</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-outline !px-4 !py-2 gap-2 justify-center">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-4 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-black">{card.value}</p>
              <p className="text-xs text-light-muted dark:text-dark-muted">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 md:p-5">
        {loading && items.length === 0 ? (
          <div className="py-16 text-center text-light-muted">Loading admission requests...</div>
        ) : (
          <DataTable
            data={items}
            columns={[
              {
                key: 'applicationNumber', label: 'Application', render: (item) => (
                  <div>
                    <button onClick={() => openDetails(item)} className="font-black text-link hover:underline">{item.applicationNumber}</button>
                    <p className="text-xs text-light-muted mt-0.5">{formatDate(item.createdAt, true)}</p>
                  </div>
                ),
              },
              {
                key: 'fullName', label: 'Student', render: (item) => (
                  <div>
                    <p className="font-bold">{item.fullName}</p>
                    <p className="text-xs text-light-muted">{item.phone}</p>
                  </div>
                ),
              },
              {
                key: 'preference.course', label: 'Preference', render: (item) => (
                  <div className="max-w-56">
                    <p className="font-semibold truncate">{item.preference?.course}</p>
                    <p className="text-xs text-light-muted truncate">{item.preference?.stream} · {item.preference?.preferredState}</p>
                  </div>
                ),
              },
              { key: 'selectedUniversities', label: 'Universities', render: (item) => <span className="font-bold">{item.selectedUniversities?.length || 0}</span> },
              {
                key: 'status', label: 'Status', render: (item) => (
                  <span className={`badge ${STATUS_STYLES[item.status] || ''}`}>{statusLabel(item.status)}</span>
                ),
              },
            ]}
            searchFields={['applicationNumber', 'fullName', 'email', 'phone', 'preference.course', 'preference.stream', 'preference.preferredState']}
            searchPlaceholder="Search name, phone or application number..."
            emptyMessage="No admission requests found"
            filters={(
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input-field !py-2 !w-auto min-w-44 text-sm">
                <option value="all">All statuses ({total})</option>
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} ({statusCounts[option.value] || 0})</option>)}
              </select>
            )}
            actions={(item) => (
              <>
                <button onClick={() => openDetails(item)} title="View and update" className="p-2 rounded-lg hover:bg-light-card dark:hover:bg-dark-border text-link"><Eye className="w-4 h-4" /></button>
                <a href={`tel:${item.phone}`} title="Call student" className="p-2 rounded-lg hover:bg-light-card dark:hover:bg-dark-border text-emerald-600"><Phone className="w-4 h-4" /></a>
                {canDelete && <button onClick={() => remove(item)} title="Delete" className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>}
              </>
            )}
          />
        )}
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `${selected.applicationNumber} · ${selected.fullName}` : ''} size="lg">
        {selected && (
          <div className="space-y-7">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 rounded-2xl bg-light-card dark:bg-dark-bg p-5">
              <DetailItem label="Student" value={selected.fullName} />
              <DetailItem label="Email" value={selected.email} href={`mailto:${selected.email}`} />
              <DetailItem label="Mobile" value={selected.phone} href={`tel:${selected.phone}`} />
              <DetailItem label="Current location" value={`${selected.currentCity}, ${selected.currentState}`} />
              <DetailItem label="Class 12" value={selected.class12Percentage != null ? `${selected.class12Percentage}%` : 'Not provided'} />
              <DetailItem label="Entrance exam" value={selected.entranceExam || 'Not provided'} />
              <DetailItem label="Score / rank" value={selected.entranceScore || 'Not provided'} />
              <DetailItem label="Submitted" value={formatDate(selected.createdAt, true)} />
            </div>

            <section>
              <h3 className="font-black text-lg flex items-center gap-2 mb-4"><GraduationCap className="w-5 h-5 text-primary" /> Admission preference</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <DetailItem label="Stream" value={selected.preference?.stream} />
                <DetailItem label="Course" value={selected.preference?.course} />
                <DetailItem label="Branch" value={selected.preference?.branch || 'Any'} />
                <DetailItem label="Preferred state" value={selected.preference?.preferredState} />
              </div>
            </section>

            <section>
              <h3 className="font-black text-lg flex items-center gap-2 mb-4"><FileCheck2 className="w-5 h-5 text-primary" /> Selected universities</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {selected.selectedUniversities?.map((university, index) => (
                  <div key={university.university || university.name} className="rounded-xl border border-light-border dark:border-dark-border p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold"><span className="text-link mr-1">{index + 1}.</span> {university.name}</p>
                      <p className="text-xs text-light-muted mt-1">{university.city}, {university.state}</p>
                    </div>
                    {university.slug && <a href={`/universities/${university.slug}`} target="_blank" rel="noreferrer" title="Open university" className="text-link"><ExternalLink className="w-4 h-4" /></a>}
                  </div>
                ))}
              </div>
            </section>

            {selected.message && (
              <section className="rounded-2xl border border-light-border dark:border-dark-border p-5">
                <p className="text-xs uppercase tracking-wider font-bold text-light-muted mb-2">Student note</p>
                <p className="text-sm whitespace-pre-wrap">{selected.message}</p>
              </section>
            )}

            <section className="rounded-2xl bg-primary/5 border border-primary/15 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <UserRoundCheck className="w-5 h-5 text-link" />
                <h3 className="font-black text-lg">Counselling management</h3>
              </div>
              <div className="grid md:grid-cols-[240px_1fr] gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-bold">Status</span>
                  <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)} className="input-field">
                    {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold">Internal notes</span>
                  <textarea value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} className="input-field min-h-28 resize-y" maxLength={3000} placeholder="Call outcome, follow-up date, documents required..." />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex gap-2">
                  <a href={`tel:${selected.phone}`} className="btn-outline !px-4 !py-2 gap-2"><Phone className="w-4 h-4" /> Call</a>
                  <a href={`https://wa.me/91${String(selected.phone).replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer" className="btn-outline !px-4 !py-2 gap-2"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
                  <a href={`mailto:${selected.email}`} className="btn-outline !px-4 !py-2 gap-2"><Mail className="w-4 h-4" /> Email</a>
                </div>
                <button onClick={save} disabled={saving} className="btn-primary !px-5 !py-2 gap-2 disabled:opacity-60">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save update'}
                </button>
              </div>
              {selected.handledBy?.name && <p className="text-xs text-light-muted">Last handled by {selected.handledBy.name}{selected.lastContactedAt ? ` · contacted ${formatDate(selected.lastContactedAt, true)}` : ''}</p>}
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}
