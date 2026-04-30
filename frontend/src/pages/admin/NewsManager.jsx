import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, CheckboxField, FormActions } from './components/FormFields';

const emptyForm = () => ({ title: '', summary: '', content: '', category: 'general', source: '', publishedAt: '', imageUrl: '', isFeatured: false, tagsText: '' });
const splitLines = v => String(v || '').split('\n').map(s => s.trim()).filter(Boolean);

export default function NewsManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/admin/content').then(r => setItems(r.data.data?.news || [])).catch(() => toast.error('Failed'));
  useEffect(() => { load(); }, []);
  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title, summary: form.summary || undefined, content: form.content || undefined,
        category: form.category || undefined, source: form.source || undefined,
        publishedAt: form.publishedAt || undefined, imageUrl: form.imageUrl || undefined,
        isFeatured: !!form.isFeatured, tags: splitLines(form.tagsText),
      };
      if (editId) { await api.put(`/admin/news/${editId}`, payload); toast.success('Updated'); }
      else { await api.post('/admin/news', payload); toast.success('Created'); }
      setForm(emptyForm()); setEditId(null); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const edit = (n) => {
    setForm({ ...n, publishedAt: n.publishedAt?.slice(0,10) || '', tagsText: (n.tags || []).join('\n') });
    setEditId(n._id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/admin/news/${id}`); toast.success('Deleted'); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">News ({items.length})</h2>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm()); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card p-6 space-y-4">
          <h3 className="font-semibold">{editId ? 'Edit' : 'New'} Article</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Title *"><TextInput value={form.title} onChange={e => upd('title', e.target.value)} required /></FormField>
            <FormField label="Category"><TextInput value={form.category} onChange={e => upd('category', e.target.value)} placeholder="general, admission, result..." /></FormField>
            <FormField label="Source"><TextInput value={form.source} onChange={e => upd('source', e.target.value)} /></FormField>
            <FormField label="Published Date"><TextInput type="date" value={form.publishedAt} onChange={e => upd('publishedAt', e.target.value)} /></FormField>
            <FormField label="Image URL (Cloudinary)"><TextInput value={form.imageUrl} onChange={e => upd('imageUrl', e.target.value)} /></FormField>
          </div>
          <FormField label="Summary"><TextArea value={form.summary} onChange={e => upd('summary', e.target.value)} className="min-h-[80px]" /></FormField>
          <FormField label="Content"><TextArea value={form.content} onChange={e => upd('content', e.target.value)} className="min-h-[150px]" /></FormField>
          <FormField label="Tags (one per line)"><TextArea value={form.tagsText} onChange={e => upd('tagsText', e.target.value)} className="min-h-[60px]" /></FormField>
          <CheckboxField label="Featured Article" checked={form.isFeatured} onChange={e => upd('isFeatured', e.target.checked)} />
          <FormActions onCancel={() => { setShowForm(false); setEditId(null); }} isEditing={!!editId} />
        </form>
      )}

      <DataTable data={items} columns={[
        { key: 'title', label: 'Title', render: n => <span className="font-medium line-clamp-1">{n.title}</span> },
        { key: 'category', label: 'Category', render: n => <span className="badge badge-blue">{n.category}</span> },
        { key: 'source', label: 'Source' },
        { key: 'isFeatured', label: 'Featured', render: n => n.isFeatured ? <span className="badge badge-green">Yes</span> : '—' },
        { key: 'publishedAt', label: 'Published', render: n => n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : '—' },
      ]} searchFields={['title', 'source', 'category']} searchPlaceholder="Search news..."
        actions={n => (<>
          <button onClick={() => edit(n)} className="p-1.5 rounded-lg hover:bg-light-card"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => del(n._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
        </>)}
      />
    </div>
  );
}
