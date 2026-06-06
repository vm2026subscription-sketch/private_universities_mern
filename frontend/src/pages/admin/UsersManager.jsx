import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useRole } from '../../hooks/useRole';
import DataTable from './components/DataTable';

export default function UsersManager() {
  const { canDelete } = useRole();
  const [users, setUsers] = useState([]);
  const load = () => api.get('/admin/users').then(r => setUsers(r.data.data || [])).catch(() => toast.error('Failed'));
  useEffect(() => { load(); }, []);

  const updateUser = async (id, payload) => {
    try { await api.patch(`/admin/users/${id}`, payload); toast.success('Updated'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Users</h2>
      <DataTable data={users} columns={[
        { key: 'name', label: 'Name', render: u => <span className="font-medium">{u.name}</span> },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', render: u => (
          <select 
            value={u.role} 
            disabled={!canDelete}
            onChange={e => updateUser(u._id, { role: e.target.value })} 
            className="text-xs border rounded px-2 py-1 bg-transparent disabled:opacity-75 disabled:cursor-not-allowed"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
        )},
        { key: 'isEmailVerified', label: 'Verified', render: u => u.isEmailVerified ? <span className="badge badge-green">Yes</span> : <span className="badge badge-orange">No</span> },
        { key: 'createdAt', label: 'Joined', render: u => new Date(u.createdAt).toLocaleDateString() },
      ]}
      actions={u => (
        canDelete ? (
          <button type="button" onClick={() => deleteUser(u._id)} className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100">
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null
      )}
      searchFields={['name', 'email']} searchPlaceholder="Search users..." pageSize={15} />
    </div>
  );
}
