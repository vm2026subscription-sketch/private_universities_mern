import { useEffect, useState } from 'react';
import { Trash2, Plus, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, SelectInput, CheckboxField, FormActions } from './components/FormFields';

const empty = () => ({ title: '', message: '', type: 'info', category: 'general', link: '', isBroadcast: true, userId: '' });

export default function NotificationsManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty());
  const [show, setShow] = useState(false);

  const load = () => api.get('/admin/notifications').then(r => setItems(r.data.data || []));
  useEffect(() => { load(); }, []);
  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/notifications', form);
      toast.success('Sent'); setForm(empty()); setShow(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const del = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/admin/notifications/${id}`); toast.success('Deleted'); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Notifications</h2>
        <button onClick={() => setShow(!show)} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Send</button>
      </div>
      {show && (
        <form onSubmit={save} className="card p-6 space-y-4">
          <h3 className="font-semibold">Send Notification</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Title"><TextInput value={form.title} onChange={e => upd('title', e.target.value)} required /></FormField>
            <FormField label="Type"><SelectInput value={form.type} onChange={e => upd('type', e.target.value)} options={[{value:'info',label:'Info'},{value:'success',label:'Success'},{value:'warning',label:'Warning'},{value:'error',label:'Error'}]} /></FormField>
            <FormField label="Category"><SelectInput value={form.category} onChange={e => upd('category', e.target.value)} options={[{value:'general',label:'General'},{value:'exam',label:'Exam'},{value:'admission',label:'Admission'},{value:'system',label:'System'},{value:'promotion',label:'Promotion'}]} /></FormField>
            <FormField label="Link (optional)"><TextInput value={form.link} onChange={e => upd('link', e.target.value)} /></FormField>
          </div>
          <FormField label="Message"><TextArea value={form.message} onChange={e => upd('message', e.target.value)} required /></FormField>
          <CheckboxField label="Broadcast to all users" checked={form.isBroadcast} onChange={e => upd('isBroadcast', e.target.checked)} />
          {!form.isBroadcast && <FormField label="User ID"><TextInput value={form.userId} onChange={e => upd('userId', e.target.value)} required /></FormField>}
          <FormActions onCancel={() => setShow(false)} submitLabel="Send Notification" />
        </form>
      )}
      <DataTable data={items} columns={[
        { key: 'title', label: 'Title', render: n => <span className="font-medium">{n.title}</span> },
        { key: 'type', label: 'Type', render: n => <span className={`badge ${n.type === 'error' ? 'badge-orange' : n.type === 'success' ? 'badge-green' : 'badge-blue'}`}>{n.type}</span> },
        { key: 'category', label: 'Category' },
        { key: 'isBroadcast', label: 'Target', render: n => n.isBroadcast ? 'All Users' : 'Specific User' },
        { key: 'createdAt', label: 'Sent', render: n => new Date(n.createdAt).toLocaleDateString() },
      ]} searchFields={['title', 'message']} actions={(n) => (
        <button onClick={() => del(n._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
      )} />
    </div>
  );
}
