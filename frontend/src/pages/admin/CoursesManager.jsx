import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, SelectInput, FormActions } from './components/FormFields';

const emptyForm = () => ({
  universityId: '',
  stream: 'Engineering',
  category: 'UG',
  baseCourse: '',
  specializationName: '',
  duration: '',
  totalSeats: '',
  feesPerYear: '',
  eligibility: '',
  entranceExamsText: '',
});

const splitLines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
const toPayloadValue = (value) => {
  const normalized = String(value || '').trim();
  return normalized ? normalized : undefined;
};
const getDisplayMetricValue = (labelValue, numericValue) => labelValue || (numericValue ?? '');
const RANGE_FIELD_HELP = 'Single value or range both work. Example: 60, 60-120, 120000-180000';

const STREAM_OPTIONS = ['Engineering', 'Medical', 'Management', 'Law', 'Design', 'Science', 'Commerce', 'Arts', 'Education', 'Agriculture', 'Hospitality', 'IT', 'Other'];
const LEVEL_OPTIONS = ['UG', 'PG', 'Diploma', 'PhD'];

export default function CoursesManager() {
  const [items, setItems] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    setLoading(true);
    return api.get('/admin/content?resource=courses,universities')
      .then((response) => {
        setItems(response.data.data?.courses || []);
        setUniversities(response.data.data?.universities || []);
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Failed to load courses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const upd = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    if (!form.universityId) { toast.error('Please select a university'); return; }
    if (!form.baseCourse.trim()) { toast.error('Base Course is required'); return; }

    setSaving(true);
    try {
      const payload = {
        universityId: form.universityId,
        stream: form.stream,
        category: form.category,
        baseCourse: form.baseCourse.trim(),
        specializationName: form.specializationName || undefined,
        duration: toPayloadValue(form.duration),
        totalSeats: toPayloadValue(form.totalSeats),
        feesPerYear: toPayloadValue(form.feesPerYear),
        eligibility: form.eligibility || undefined,
        entranceExams: splitLines(form.entranceExamsText),
      };

      if (editId) {
        await api.put(`/admin/courses/${editId}`, payload);
        toast.success('Course updated');
      } else {
        await api.post('/admin/courses', payload);
        toast.success('Course created');
      }

      setForm(emptyForm());
      setEditId(null);
      setShowForm(false);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const edit = (course) => {
    setForm({
      universityId: course.universityId?._id || course.universityId || '',
      stream: course.stream || 'Engineering',
      category: course.category || 'UG',
      baseCourse: course.baseCourse || course.name || '',
      specializationName: course.specializationName || '',
      duration: course.duration || '',
      totalSeats: getDisplayMetricValue(course.totalSeatsLabel, course.totalSeats),
      feesPerYear: getDisplayMetricValue(course.feesPerYearLabel, course.feesPerYear),
      eligibility: course.eligibility || '',
      entranceExamsText: (course.entranceExams || []).join('\n'),
    });
    setEditId(course._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id) => {
    if (!window.confirm('Delete this course? This cannot be undone.')) return;
    setDeletingId(id);
    // Optimistic removal with rollback on failure.
    const snapshot = items;
    setItems((prev) => prev.filter((course) => course._id !== id));
    try {
      await api.delete(`/admin/courses/${id}`);
      toast.success('Course deleted');
      if (editId === id) {
        setEditId(null);
        setShowForm(false);
        setForm(emptyForm());
      }
    } catch (error) {
      setItems(snapshot); // rollback
      toast.error(error.response?.data?.message || 'Failed to delete course');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Courses ({items.length})</h2>
          <p className="text-sm text-light-muted mt-1">Primary workflow is now university-first. Use this screen only for cross-catalog maintenance.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm()); }} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-link flex items-start gap-3">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>Best practice: create courses inside the university form so hierarchy stays synced. This page is still available for direct edits when needed.</p>
      </div>

      {showForm && (
        <form onSubmit={save} className="card p-6 space-y-4">
          <h3 className="font-semibold">{editId ? 'Edit' : 'New'} Course</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="University *">
              <SelectInput
                value={form.universityId}
                onChange={(event) => upd('universityId', event.target.value)}
                required
                options={[{ value: '', label: 'Select University' }, ...universities.map((university) => ({ value: university._id, label: university.name }))]}
              />
            </FormField>
            <FormField label="Stream">
              <SelectInput value={form.stream} onChange={(event) => upd('stream', event.target.value)} options={STREAM_OPTIONS.map((stream) => ({ value: stream, label: stream }))} />
            </FormField>
            <FormField label="Course Level">
              <SelectInput value={form.category} onChange={(event) => upd('category', event.target.value)} options={LEVEL_OPTIONS.map((level) => ({ value: level, label: level }))} />
            </FormField>
            <FormField label="Base Course *">
              <TextInput value={form.baseCourse} onChange={(event) => upd('baseCourse', event.target.value)} required placeholder="e.g. LLB, B.Tech, MBA" />
            </FormField>
            <FormField label="Specialization">
              <TextInput value={form.specializationName} onChange={(event) => upd('specializationName', event.target.value)} placeholder="Optional" />
            </FormField>
            <FormField label="Duration (years)">
              <TextInput value={form.duration} onChange={(event) => upd('duration', event.target.value)} placeholder="e.g. 3" />
            </FormField>
            <FormField label="Total Seats">
              <div className="space-y-2">
                <TextInput value={form.totalSeats} onChange={(event) => upd('totalSeats', event.target.value)} placeholder="e.g. 60 or 60-120" />
                <p className="text-xs text-light-muted dark:text-dark-muted">{RANGE_FIELD_HELP}</p>
              </div>
            </FormField>
            <FormField label="Fees Per Year">
              <div className="space-y-2">
                <TextInput value={form.feesPerYear} onChange={(event) => upd('feesPerYear', event.target.value)} placeholder="e.g. 120000 or 120000-180000" />
                <p className="text-xs text-light-muted dark:text-dark-muted">{RANGE_FIELD_HELP}</p>
              </div>
            </FormField>
          </div>
          <FormField label="Eligibility">
            <TextInput value={form.eligibility} onChange={(event) => upd('eligibility', event.target.value)} placeholder="10+2 with 50% in PCM" />
          </FormField>
          <FormField label="Entrance Exams (one per line)">
            <TextArea value={form.entranceExamsText} onChange={(event) => upd('entranceExamsText', event.target.value)} className="min-h-[80px]" />
          </FormField>
          <FormActions onCancel={() => { setShowForm(false); setEditId(null); }} isEditing={!!editId} saving={saving} />
        </form>
      )}

      <DataTable
        data={items}
        loading={loading}
        columns={[
          { key: 'baseCourse', label: 'Base Course', render: (course) => <span className="font-medium">{course.baseCourse || course.name}</span> },
          { key: 'specializationName', label: 'Specialization', render: (course) => course.specializationName || '-' },
          { key: 'stream', label: 'Stream', render: (course) => <span className="badge badge-blue">{course.stream || 'Other'}</span> },
          { key: 'category', label: 'Level', render: (course) => <span className="badge badge-orange">{course.category || 'UG'}</span> },
          { key: 'universityId', label: 'University', render: (course) => course.universityId?.name || '-' },
          { key: 'duration', label: 'Duration', render: (course) => (course.duration ? `${course.duration} yr` : '-') },
          {
            key: 'feesPerYear',
            label: 'Fees/Year',
            render: (course) => course.feesPerYearLabel || (course.feesPerYear ? `INR ${course.feesPerYear.toLocaleString()}` : '-'),
          },
        ]}
        searchFields={['name', 'baseCourse', 'specializationName', 'stream', 'category', 'universityId.name']}
        searchPlaceholder="Search courses..."
        actions={(course) => (
          <>
            <button onClick={() => edit(course)} className="p-1.5 rounded-lg hover:bg-light-card" title="Edit course">
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => del(course._id)}
              disabled={deletingId === course._id}
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-50"
              title="Delete course"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      />
    </div>
  );
}