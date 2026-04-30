import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, CheckboxField, FormActions } from './components/FormFields';

const empty = () => ({ question: '', answer: '', category: 'general', order: 0, isPublished: true });

export default function FAQManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState(null);
  const [show, setShow] = useState(false);

  const load = () => api.get('/admin/faqs').then(r => setItems(r.data.data || []));
  useEffect(() => { load(); }, []);
  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.put(`/admin/faqs/${editId}`, form);
      else await api.post('/admin/faqs', form);
      toast.success('Saved'); setForm(empty()); setEditId(null); setShow(false); load();
    } catch (err) { toast.error('Failed'); }
  };

  const edit = (f) => { setForm(f); setEditId(f._id); setShow(true); };
  const del = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/admin/faqs/${id}`); toast.success('Deleted'); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">FAQs</h2>
        <button onClick={() => { setShow(!show); setEditId(null); setForm(empty()); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add</button>
      </div>
      {show && (
        <form onSubmit={save} className="card p-6 space-y-4">
          <FormField label="Question"><TextInput value={form.question} onChange={e => upd('question', e.target.value)} required /></FormField>
          <FormField label="Answer"><TextArea value={form.answer} onChange={e => upd('answer', e.target.value)} required /></FormField>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Category"><TextInput value={form.category} onChange={e => upd('category', e.target.value)} /></FormField>
            <FormField label="Order"><TextInput type="number" value={form.order} onChange={e => upd('order', Number(e.target.value))} /></FormField>
          </div>
          <CheckboxField label="Published" checked={form.isPublished} onChange={e => upd('isPublished', e.target.checked)} />
          <FormActions onCancel={() => { setShow(false); setEditId(null); }} isEditing={!!editId} />
        </form>
      )}
      <DataTable data={items} columns={[
        { key: 'question', label: 'Question', render: f => <span className="font-medium line-clamp-1">{f.question}</span> },
        { key: 'category', label: 'Category', render: f => <span className="badge badge-blue">{f.category}</span> },
        { key: 'order', label: 'Order' },
        { key: 'isPublished', label: 'Status', render: f => f.isPublished ? <span className="badge badge-green">Published</span> : <span className="badge badge-orange">Draft</span> },
      ]} searchFields={['question', 'category']} actions={(f) => (<>
        <button onClick={() => edit(f)} className="p-1.5 rounded-lg hover:bg-light-card"><Pencil className="w-4 h-4" /></button>
        <button onClick={() => del(f._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
      </>)} />
    </div>
  );
}
