import { useEffect, useState } from 'react';
import { Trash2, Mail, Archive, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';

export default function ContactManager() {
  const [items, setItems] = useState([]);
  const load = () => api.get('/admin/contacts').then(r => setItems(r.data.data || []));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/admin/contacts/${id}`, { status });
    toast.success('Updated'); load();
  };
  const del = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/admin/contacts/${id}`); toast.success('Deleted'); load(); };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Contact Submissions</h2>
      <DataTable data={items} columns={[
        { key: 'name', label: 'Name', render: c => <span className="font-medium">{c.name}</span> },
        { key: 'email', label: 'Email' },
        { key: 'subject', label: 'Subject', render: c => <span className="line-clamp-1">{c.subject}</span> },
        { key: 'status', label: 'Status', render: c => {
          const colors = { new: 'badge-blue', read: 'badge-orange', replied: 'badge-green', archived: '' };
          return <span className={`badge ${colors[c.status] || ''}`}>{c.status}</span>;
        }},
        { key: 'createdAt', label: 'Date', render: c => new Date(c.createdAt).toLocaleDateString() },
      ]} searchFields={['name', 'email', 'subject']} searchPlaceholder="Search contacts..."
        actions={(c) => (<>
          <button onClick={() => updateStatus(c._id, 'read')} title="Mark Read" className="p-1.5 rounded-lg hover:bg-light-card"><Eye className="w-4 h-4" /></button>
          <button onClick={() => updateStatus(c._id, 'replied')} title="Mark Replied" className="p-1.5 rounded-lg hover:bg-light-card"><Mail className="w-4 h-4" /></button>
          <button onClick={() => updateStatus(c._id, 'archived')} title="Archive" className="p-1.5 rounded-lg hover:bg-light-card"><Archive className="w-4 h-4" /></button>
          <button onClick={() => del(c._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
        </>)}
      />
    </div>
  );
}
