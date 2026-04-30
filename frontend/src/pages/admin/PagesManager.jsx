import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, SelectInput, CheckboxField, FormActions } from './components/FormFields';

const emptyForm = () => ({ title: '', content: '', metaTitle: '', metaDescription: '', isPublished: false, template: 'default', featuredImage: '', order: 0 });

export default function PagesManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/admin/pages').then(r => setItems(r.data.data || [])).catch(() => toast.error('Failed to load'));
  useEffect(() => { load(); }, []);
  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/admin/pages/${editId}`, form); toast.success('Updated'); }
      else { await api.post('/admin/pages', form); toast.success('Created'); }
      setForm(emptyForm()); setEditId(null); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const edit = (p) => { setForm({ ...p, order: p.order || 0 }); setEditId(p._id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const del = async (id) => { if (!confirm('Delete this page?')) return; await api.delete(`/admin/pages/${id}`); toast.success('Deleted'); load(); };

  const columns = [
    { key: 'title', label: 'Title', render: p => <span className="font-medium">{p.title}</span> },
    { key: 'slug', label: 'Slug', render: p => <code className="text-xs bg-light-card dark:bg-dark-card px-1.5 py-0.5 rounded">/{p.slug}</code> },
    { key: 'template', label: 'Template' },
    { key: 'isPublished', label: 'Status', render: p => p.isPublished ? <span className="badge badge-green">Published</span> : <span className="badge badge-orange">Draft</span> },
    { key: 'updatedAt', label: 'Updated', render: p => new Date(p.updatedAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Pages</h2>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm()); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Page</button>
      </div>
      {showForm && (
        <form onSubmit={save} className="card p-6 space-y-4">
          <h3 className="font-semibold">{editId ? 'Edit' : 'New'} Page</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Title"><TextInput value={form.title} onChange={e => upd('title', e.target.value)} required /></FormField>
            <FormField label="Template">
              <SelectInput value={form.template} onChange={e => upd('template', e.target.value)} options={[{value:'default',label:'Default'},{value:'full-width',label:'Full Width'},{value:'sidebar',label:'With Sidebar'}]} />
            </FormField>
            <FormField label="Meta Title"><TextInput value={form.metaTitle} onChange={e => upd('metaTitle', e.target.value)} /></FormField>
            <FormField label="Meta Description"><TextInput value={form.metaDescription} onChange={e => upd('metaDescription', e.target.value)} /></FormField>
            <FormField label="Featured Image URL"><TextInput value={form.featuredImage} onChange={e => upd('featuredImage', e.target.value)} /></FormField>
            <FormField label="Order"><TextInput type="number" value={form.order} onChange={e => upd('order', Number(e.target.value))} /></FormField>
          </div>
          <FormField label="Content (HTML/Markdown)"><TextArea value={form.content} onChange={e => upd('content', e.target.value)} className="min-h-[250px] font-mono text-sm" /></FormField>
          <CheckboxField label="Published" checked={form.isPublished} onChange={e => upd('isPublished', e.target.checked)} />
          <FormActions onCancel={() => { setShowForm(false); setEditId(null); setForm(emptyForm()); }} isEditing={!!editId} />
        </form>
      )}
      <DataTable data={items} columns={columns} searchFields={['title', 'slug']} searchPlaceholder="Search pages..."
        actions={(p) => (<>
          <button onClick={() => edit(p)} className="p-1.5 rounded-lg hover:bg-light-card dark:hover:bg-dark-card"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => del(p._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
        </>)}
      />
    </div>
  );
}
