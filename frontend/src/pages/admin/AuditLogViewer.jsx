import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import api from '../../utils/api';
import DataTable from './components/DataTable';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.get('/admin/audit-logs?limit=100').then(r => {
      setLogs(r.data.data || []);
      setTotal(r.data.total || 0);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Audit Logs</h2>
        <span className="text-sm text-light-muted">({total} total actions)</span>
      </div>
      <DataTable data={logs} columns={[
        { key: 'userId', label: 'User', render: l => l.userId?.name || 'System' },
        { key: 'action', label: 'Action', render: l => <span className={`badge ${l.action === 'delete' ? 'badge-orange' : l.action === 'create' ? 'badge-green' : 'badge-blue'}`}>{l.action}</span> },
        { key: 'resource', label: 'Resource' },
        { key: 'description', label: 'Description', render: l => <span className="text-sm line-clamp-1">{l.description || '—'}</span> },
        { key: 'createdAt', label: 'Time', render: l => new Date(l.createdAt).toLocaleString() },
      ]} searchFields={['description', 'resource', 'action']} searchPlaceholder="Search audit logs..." pageSize={20} />
    </div>
  );
}
