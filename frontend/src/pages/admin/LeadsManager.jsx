import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Building2, TrendingUp, Eye, FileText, CheckCircle, Download, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';

export default function LeadsManager() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleCSVExport = () => {
    const link = document.createElement('a');
    link.href = '/api/v1/admin/leads/export-csv';
    link.click();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsRes, analyticsRes] = await Promise.all([
        api.get('/admin/leads'),
        api.get('/admin/saas-analytics')
      ]);
      setLeads(leadsRes.data.data || []);
      setAnalytics(analyticsRes.data.data || null);
    } catch (err) {
      toast.error('Failed to load leads and analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns = [
    { key: 'name', label: 'Student Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'state', label: 'State' },
    { key: 'preferredCourse', label: 'Preferred Course' },
    { 
      key: 'universityId', 
      label: 'Target University', 
      render: row => row.universityId ? (
        <span className="font-semibold text-link">{row.universityId.name}</span>
      ) : <span className="text-light-muted">N/A</span>
    },
    { 
      key: 'leadType', 
      label: 'Type', 
      render: row => row.leadType === 'apply' ? (
        <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Apply Now</span>
      ) : (
        <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Brochure</span>
      )
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: row => new Date(row.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  ];

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-light-muted dark:text-dark-muted">Loading Leads Panel...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 flex items-center gap-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-sm">
          <div className="p-3 bg-primary/10 text-link rounded-xl">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-light-muted dark:text-dark-muted font-medium">Total Captured Leads</span>
            <h3 className="text-2xl font-bold mt-1 text-light-text dark:text-dark-text">{analytics?.totalLeads || 0}</h3>
          </div>
        </div>

        <div className="card p-6 flex items-center gap-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-sm">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-light-muted dark:text-dark-muted font-medium">Sponsored Partners</span>
            <h3 className="text-2xl font-bold mt-1 text-light-text dark:text-dark-text">{analytics?.sponsoredCount || 0}</h3>
          </div>
        </div>

        <div className="card p-6 flex items-center gap-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-sm">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-light-muted dark:text-dark-muted font-medium">Conversion Focus</span>
            <h3 className="text-2xl font-bold mt-1 text-light-text dark:text-dark-text">Phase 1 MVP</h3>
          </div>
        </div>
      </div>

      {/* Analytics Sub-grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Leads By University */}
        <div className="card p-6 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-light-text dark:text-dark-text flex items-center gap-2">
            <FileText className="w-5 h-5 text-link" />
            Top Leads by University
          </h3>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {analytics?.leadsByUniversity && analytics.leadsByUniversity.length > 0 ? (
              analytics.leadsByUniversity.map((item, index) => (
                <div key={item._id} className="flex items-center justify-between p-3 rounded-xl bg-light-bg dark:bg-dark-bg/50 border border-light-border dark:border-dark-border/40">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-light-muted dark:text-dark-muted">#{index + 1}</span>
                    <div>
                      <p className="font-semibold text-sm text-light-text dark:text-dark-text leading-tight">{item.name}</p>
                      {item.isSponsored && (
                        <span className="text-[10px] uppercase font-bold text-amber-500">{item.sponsorTier} Partner</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-link text-sm">{item.leadCount} leads</span>
                    <button
                      onClick={() => navigate(`/admin/partner/${item._id}`)}
                      className="p-1.5 rounded-lg bg-primary/10 text-link hover:bg-primary/20 transition-colors"
                      title="View Partner Dashboard"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-light-muted dark:text-dark-muted">No leads collected yet.</p>
            )}
          </div>
        </div>

        {/* Top Profile Views */}
        <div className="card p-6 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-light-text dark:text-dark-text flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-500" />
            Top Profile Views (Analytics)
          </h3>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {analytics?.topViewedUniversities && analytics.topViewedUniversities.length > 0 ? (
              analytics.topViewedUniversities.map((item, index) => (
                <div key={item._id} className="flex items-center justify-between p-3 rounded-xl bg-light-bg dark:bg-dark-bg/50 border border-light-border dark:border-dark-border/40">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-light-muted dark:text-dark-muted">#{index + 1}</span>
                    <div>
                      <p className="font-semibold text-sm text-light-text dark:text-dark-text leading-tight">{item.name}</p>
                      {item.isSponsored && (
                        <span className="text-[10px] uppercase font-bold text-amber-500">{item.sponsorTier} Partner</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-500 text-sm">{item.views || 0} views</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-light-muted dark:text-dark-muted font-medium">No view data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Leads Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-bold">Leads Registry</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCSVExport}
              className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button 
              onClick={loadData}
              className="text-xs font-semibold text-link bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all"
            >
              Refresh List
            </button>
          </div>
        </div>
        <DataTable
          data={leads}
          columns={columns}
          searchFields={['name', 'email', 'phone', 'state', 'preferredCourse', 'universityId.name']}
          searchPlaceholder="Search leads by name, email, university..."
        />
      </div>
    </div>
  );
}
