import { useEffect, useState } from 'react';
import { Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';

export default function NewsletterManager() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0 });

  const load = () => api.get('/admin/newsletter/subscribers').then(r => {
    setItems(r.data.data || []);
    setStats({ total: r.data.total || 0, active: r.data.active || 0 });
  });
  useEffect(() => { load(); }, []);

  const del = async (id) => { if (!confirm('Remove?')) return; await api.delete(`/admin/newsletter/subscribers/${id}`); toast.success('Removed'); load(); };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Newsletter Subscribers</h2>
      <div className="flex gap-4">
        <div className="card p-4 flex items-center gap-3"><Users className="w-5 h-5 text-primary" /><div><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-light-muted">Total</p></div></div>
        <div className="card p-4 flex items-center gap-3"><Users className="w-5 h-5 text-green-500" /><div><p className="text-xl font-bold">{stats.active}</p><p className="text-xs text-light-muted">Active</p></div></div>
      </div>
      <DataTable data={items} columns={[
        { key: 'email', label: 'Email', render: s => <span className="font-medium">{s.email}</span> },
        { key: 'isSubscribed', label: 'Status', render: s => s.isSubscribed ? <span className="badge badge-green">Active</span> : <span className="badge badge-orange">Unsubscribed</span> },
        { key: 'source', label: 'Source' },
        { key: 'subscribedAt', label: 'Subscribed', render: s => new Date(s.subscribedAt).toLocaleDateString() },
      ]} searchFields={['email']} searchPlaceholder="Search subscribers..."
        actions={(s) => (
          <button onClick={() => del(s._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
        )}
      />
    </div>
  );
}
