import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, CheckboxField, FormActions } from './components/FormFields';

const emptyForm = () => ({ name: '', role: '', university: '', content: '', rating: 5, imageUrl: '', isApproved: false, isFeatured: false });

export default function TestimonialsManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/admin/testimonials').then(r => setItems(r.data.data || [])).catch(() => toast.error('Failed to load'));
  useEffect(() => { load(); }, []);
  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/admin/testimonials/${editId}`, form); toast.success('Updated'); }
      else { await api.post('/admin/testimonials', form); toast.success('Created'); }
      setForm(emptyForm()); setEditId(null); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const edit = (t) => { setForm(t); setEditId(t._id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const del = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/admin/testimonials/${id}`); toast.success('Deleted'); load(); };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'university', label: 'University' },
    { key: 'rating', label: 'Rating', render: t => <span className="flex items-center gap-1">{t.rating}<Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /></span> },
    { key: 'isApproved', label: 'Status', render: t => t.isApproved ? <span className="badge badge-green">Approved</span> : <span className="badge badge-orange">Pending</span> },
    { key: 'isFeatured', label: 'Featured', render: t => t.isFeatured ? <span className="badge badge-blue">Yes</span> : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Testimonials</h2>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm()); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add</button>
      </div>
      {showForm && (
        <form onSubmit={save} className="card p-6 space-y-4">
          <h3 className="font-semibold">{editId ? 'Edit' : 'New'} Testimonial</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Name"><TextInput value={form.name} onChange={e => upd('name', e.target.value)} required /></FormField>
            <FormField label="Role/Title"><TextInput value={form.role} onChange={e => upd('role', e.target.value)} /></FormField>
            <FormField label="University"><TextInput value={form.university} onChange={e => upd('university', e.target.value)} /></FormField>
            <FormField label="Rating (1-5)"><TextInput type="number" min="1" max="5" value={form.rating} onChange={e => upd('rating', Number(e.target.value))} /></FormField>
            <FormField label="Image URL"><TextInput value={form.imageUrl} onChange={e => upd('imageUrl', e.target.value)} /></FormField>
          </div>
          <FormField label="Content"><TextArea value={form.content} onChange={e => upd('content', e.target.value)} required /></FormField>
          <div className="flex gap-6">
            <CheckboxField label="Approved" checked={form.isApproved} onChange={e => upd('isApproved', e.target.checked)} />
            <CheckboxField label="Featured" checked={form.isFeatured} onChange={e => upd('isFeatured', e.target.checked)} />
          </div>
          <FormActions onCancel={() => { setShowForm(false); setEditId(null); setForm(emptyForm()); }} isEditing={!!editId} />
        </form>
      )}
      <DataTable data={items} columns={columns} searchFields={['name', 'university', 'content']} searchPlaceholder="Search testimonials..."
        actions={(t) => (<>
          <button onClick={() => edit(t)} className="p-1.5 rounded-lg hover:bg-light-card dark:hover:bg-dark-card"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => del(t._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
        </>)}
      />
    </div>
  );
}
