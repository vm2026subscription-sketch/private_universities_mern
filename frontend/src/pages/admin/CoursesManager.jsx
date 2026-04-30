import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, SelectInput, FormActions } from './components/FormFields';

const emptyForm = () => ({ universityId: '', name: '', category: 'Engineering', duration: '', totalSeats: '', feesPerYear: '', eligibility: '', entranceExamsText: '' });
const num = v => v === '' ? undefined : Number(v);
const splitLines = v => String(v || '').split('\n').map(s => s.trim()).filter(Boolean);

const CATEGORIES = ['Engineering','Medical','Management','Law','Architecture','Design','Agriculture','Science','Commerce','Pharmacy','Nursing','Arts','Education','Hospitality','IT','Other'];

export default function CoursesManager() {
  const [items, setItems] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/admin/content').then(r => {
    setItems(r.data.data?.courses || []);
    setUniversities(r.data.data?.universities || []);
  }).catch(() => toast.error('Failed'));
  useEffect(() => { load(); }, []);
  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        universityId: form.universityId, name: form.name, category: form.category,
        duration: num(form.duration), totalSeats: num(form.totalSeats), feesPerYear: num(form.feesPerYear),
        eligibility: form.eligibility || undefined, entranceExams: splitLines(form.entranceExamsText),
      };
      if (editId) { await api.put(`/admin/courses/${editId}`, payload); toast.success('Updated'); }
      else { await api.post('/admin/courses', payload); toast.success('Created'); }
      setForm(emptyForm()); setEditId(null); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const edit = (c) => {
    setForm({
      universityId: c.universityId?._id || c.universityId || '', name: c.name || '',
      category: c.category || 'Engineering', duration: c.duration || '', totalSeats: c.totalSeats || '',
      feesPerYear: c.feesPerYear || '', eligibility: c.eligibility || '',
      entranceExamsText: (c.entranceExams || []).join('\n'),
    });
    setEditId(c._id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/admin/courses/${id}`); toast.success('Deleted'); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Courses ({items.length})</h2>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm()); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card p-6 space-y-4">
          <h3 className="font-semibold">{editId ? 'Edit' : 'New'} Course</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="University *">
              <SelectInput value={form.universityId} onChange={e => upd('universityId', e.target.value)} required
                options={[{value:'',label:'Select University'}, ...universities.map(u => ({value:u._id,label:u.name}))]} />
            </FormField>
            <FormField label="Course Name *"><TextInput value={form.name} onChange={e => upd('name', e.target.value)} required placeholder="e.g. B.Tech, MBA" /></FormField>
            <FormField label="Category"><SelectInput value={form.category} onChange={e => upd('category', e.target.value)} options={CATEGORIES.map(c => ({value:c,label:c}))} /></FormField>
            <FormField label="Duration (years)"><TextInput type="number" value={form.duration} onChange={e => upd('duration', e.target.value)} /></FormField>
            <FormField label="Total Seats"><TextInput type="number" value={form.totalSeats} onChange={e => upd('totalSeats', e.target.value)} /></FormField>
            <FormField label="Fees Per Year (₹)"><TextInput type="number" value={form.feesPerYear} onChange={e => upd('feesPerYear', e.target.value)} /></FormField>
          </div>
          <FormField label="Eligibility"><TextInput value={form.eligibility} onChange={e => upd('eligibility', e.target.value)} placeholder="10+2 with 50% in PCM" /></FormField>
          <FormField label="Entrance Exams (one per line)"><TextArea value={form.entranceExamsText} onChange={e => upd('entranceExamsText', e.target.value)} className="min-h-[80px]" /></FormField>
          <FormActions onCancel={() => { setShowForm(false); setEditId(null); }} isEditing={!!editId} />
        </form>
      )}

      <DataTable data={items} columns={[
        { key: 'name', label: 'Course', render: c => <span className="font-medium">{c.name}</span> },
        { key: 'universityId', label: 'University', render: c => c.universityId?.name || '—' },
        { key: 'category', label: 'Category', render: c => <span className="badge badge-blue">{c.category}</span> },
        { key: 'duration', label: 'Duration', render: c => c.duration ? `${c.duration} yr` : '—' },
        { key: 'feesPerYear', label: 'Fees/Year', render: c => c.feesPerYear ? `₹${c.feesPerYear.toLocaleString()}` : '—' },
        { key: 'totalSeats', label: 'Seats', render: c => c.totalSeats || '—' },
      ]} searchFields={['name', 'category', 'universityId.name']} searchPlaceholder="Search courses..."
        actions={c => (<>
          <button onClick={() => edit(c)} className="p-1.5 rounded-lg hover:bg-light-card"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => del(c._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
        </>)}
      />
    </div>
  );
}
