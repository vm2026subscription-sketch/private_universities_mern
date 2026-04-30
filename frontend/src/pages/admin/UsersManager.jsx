import { useEffect, useState, useMemo } from 'react';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const load = () => api.get('/admin/users').then(r => setUsers(r.data.data || [])).catch(() => toast.error('Failed'));
  useEffect(() => { load(); }, []);

  const updateUser = async (id, payload) => {
    try { await api.patch(`/admin/users/${id}`, payload); toast.success('Updated'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Users</h2>
      <DataTable data={users} columns={[
        { key: 'name', label: 'Name', render: u => <span className="font-medium">{u.name}</span> },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', render: u => (
          <select value={u.role} onChange={e => updateUser(u._id, { role: e.target.value })} className="text-xs border rounded px-2 py-1 bg-transparent">
            <option value="user">User</option><option value="admin">Admin</option>
          </select>
        )},
        { key: 'isEmailVerified', label: 'Verified', render: u => u.isEmailVerified ? <span className="badge badge-green">Yes</span> : <span className="badge badge-orange">No</span> },
        { key: 'createdAt', label: 'Joined', render: u => new Date(u.createdAt).toLocaleDateString() },
      ]} searchFields={['name', 'email']} searchPlaceholder="Search users..." pageSize={15} />
    </div>
  );
}
