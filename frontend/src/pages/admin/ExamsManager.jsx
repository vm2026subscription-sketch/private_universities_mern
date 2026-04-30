import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, SelectInput, FormActions } from './components/FormFields';

const emptyForm = () => ({ name: '', shortName: '', conductingBody: '', examDate: '', registrationDeadline: '', eligibility: '', pattern: '', officialUrl: '', logoUrl: '', participatingUniversities: '', category: 'others' });
const num = v => v === '' ? undefined : Number(v);

export default function ExamsManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/admin/content').then(r => setItems(r.data.data?.exams || [])).catch(() => toast.error('Failed'));
  useEffect(() => { load(); }, []);
  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name, shortName: form.shortName || undefined, conductingBody: form.conductingBody || undefined,
        examDate: form.examDate || undefined, registrationDeadline: form.registrationDeadline || undefined,
        eligibility: form.eligibility || undefined, pattern: form.pattern || undefined,
        officialUrl: form.officialUrl || undefined, logoUrl: form.logoUrl || undefined,
        participatingUniversities: num(form.participatingUniversities), category: form.category,
      };
      if (editId) { await api.put(`/admin/exams/${editId}`, payload); toast.success('Updated'); }
      else { await api.post('/admin/exams', payload); toast.success('Created'); }
      setForm(emptyForm()); setEditId(null); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const edit = (ex) => {
    setForm({ ...ex, examDate: ex.examDate?.slice(0,10) || '', registrationDeadline: ex.registrationDeadline?.slice(0,10) || '', participatingUniversities: ex.participatingUniversities || '' });
    setEditId(ex._id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/admin/exams/${id}`); toast.success('Deleted'); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Exams ({items.length})</h2>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm()); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card p-6 space-y-4">
          <h3 className="font-semibold">{editId ? 'Edit' : 'New'} Exam</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Name *"><TextInput value={form.name} onChange={e => upd('name', e.target.value)} required /></FormField>
            <FormField label="Short Name"><TextInput value={form.shortName} onChange={e => upd('shortName', e.target.value)} placeholder="e.g. JEE, NEET" /></FormField>
            <FormField label="Conducting Body"><TextInput value={form.conductingBody} onChange={e => upd('conductingBody', e.target.value)} /></FormField>
            <FormField label="Category"><SelectInput value={form.category} onChange={e => upd('category', e.target.value)} options={[{value:'engineering',label:'Engineering'},{value:'medical',label:'Medical'},{value:'management',label:'Management'},{value:'law',label:'Law'},{value:'others',label:'Others'}]} /></FormField>
            <FormField label="Exam Date"><TextInput type="date" value={form.examDate} onChange={e => upd('examDate', e.target.value)} /></FormField>
            <FormField label="Registration Deadline"><TextInput type="date" value={form.registrationDeadline} onChange={e => upd('registrationDeadline', e.target.value)} /></FormField>
            <FormField label="Official URL"><TextInput value={form.officialUrl} onChange={e => upd('officialUrl', e.target.value)} /></FormField>
            <FormField label="Logo URL (Cloudinary)"><TextInput value={form.logoUrl} onChange={e => upd('logoUrl', e.target.value)} /></FormField>
            <FormField label="Participating Universities"><TextInput type="number" value={form.participatingUniversities} onChange={e => upd('participatingUniversities', e.target.value)} /></FormField>
          </div>
          <FormField label="Eligibility"><TextArea value={form.eligibility} onChange={e => upd('eligibility', e.target.value)} className="min-h-[80px]" /></FormField>
          <FormField label="Pattern"><TextArea value={form.pattern} onChange={e => upd('pattern', e.target.value)} className="min-h-[80px]" /></FormField>
          <FormActions onCancel={() => { setShowForm(false); setEditId(null); }} isEditing={!!editId} />
        </form>
      )}

      <DataTable data={items} columns={[
        { key: 'name', label: 'Exam', render: e => <span className="font-medium">{e.name}</span> },
        { key: 'shortName', label: 'Short', render: e => e.shortName ? <span className="badge badge-blue">{e.shortName}</span> : '—' },
        { key: 'conductingBody', label: 'Body' },
        { key: 'category', label: 'Category', render: e => <span className="capitalize">{e.category}</span> },
        { key: 'examDate', label: 'Date', render: e => e.examDate ? new Date(e.examDate).toLocaleDateString() : '—' },
      ]} searchFields={['name', 'shortName', 'conductingBody']} searchPlaceholder="Search exams..."
        actions={ex => (<>
          <button onClick={() => edit(ex)} className="p-1.5 rounded-lg hover:bg-light-card"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => del(ex._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
        </>)}
      />
    </div>
  );
}
