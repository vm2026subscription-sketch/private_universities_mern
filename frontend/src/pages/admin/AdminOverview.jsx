import { useEffect, useState } from 'react';
import { Users, Building2, BookOpen, FileText, Newspaper, HelpCircle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

function StatCard({ icon: Icon, label, value, color = 'text-primary' }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-primary/10 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value ?? '—'}</p>
          <p className="text-xs text-light-muted dark:text-dark-muted">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(res => setData(res.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-light-muted">Loading dashboard...</div>;
  if (!data) return <div className="text-center py-20 text-light-muted">Failed to load dashboard data.</div>;

  const { stats, recentUsers, recentQuestions, recentNews } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.users} />
        <StatCard icon={Users} label="Verified Users" value={stats.verifiedUsers} />
        <StatCard icon={Building2} label="Universities" value={stats.universities} />
        <StatCard icon={BookOpen} label="Courses" value={stats.courses} />
        <StatCard icon={FileText} label="Exams" value={stats.exams} />
        <StatCard icon={Newspaper} label="News Articles" value={stats.news} />
        <StatCard icon={HelpCircle} label="Questions" value={stats.questions} />
        <StatCard icon={Users} label="Admins" value={stats.admins} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Recent Users</h3>
          <div className="space-y-3">
            {(recentUsers || []).map(u => (
              <div key={u._id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-light-muted">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${u.role === 'admin' ? 'badge-orange' : 'badge-blue'}`}>{u.role}</span>
                  {u.isEmailVerified && <span className="badge badge-green text-[10px]">verified</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-4">Recent News</h3>
          <div className="space-y-3">
            {(recentNews || []).map(n => (
              <div key={n._id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium line-clamp-1">{n.title}</p>
                  <p className="text-xs text-light-muted">{n.source} · {new Date(n.publishedAt).toLocaleDateString()}</p>
                </div>
                <span className="badge badge-blue">{n.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
