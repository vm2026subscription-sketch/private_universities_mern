import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Eye, Mail, FileText, TrendingUp,
  Download, Users, Star, Calendar, BarChart3, CheckCircle2,
  Crown, Medal, ClipboardList, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const TIER_CONFIG = {
  platinum: { label: 'Platinum', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-400/30', icon: Crown },
  gold:     { label: 'Gold',     color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-400/30',  icon: Medal },
  silver:   { label: 'Silver',   color: 'text-slate-400',  bg: 'bg-slate-400/10',  border: 'border-slate-400/30',  icon: Medal },
  bronze:   { label: 'Bronze',   color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-400/30', icon: Medal },
  none:     { label: 'Organic',  color: 'text-light-muted',bg: 'bg-light-bg',      border: 'border-light-border',  icon: ClipboardList },
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-link', bg = 'bg-primary/10' }) {
  return (
    <div className="card p-5 flex items-center gap-4 shadow-sm">
      <div className={`p-3 rounded-2xl ${bg} ${color} shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-light-muted dark:text-dark-muted">{label}</p>
        <p className="text-2xl font-bold text-light-text dark:text-dark-text mt-0.5">{value}</p>
        {sub && <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBarChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-light-muted dark:text-dark-muted">
        No lead data for this period.
      </div>
    );
  }
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => (
        <div key={d._id} className="flex-1 flex flex-col items-center gap-1 group" title={`${d._id}: ${d.count} leads`}>
          <span className="text-[9px] text-light-muted dark:text-dark-muted opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
            {d.count}
          </span>
          <div
            className="w-full rounded-t-md bg-primary/70 hover:bg-primary transition-all"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: '4px' }}
          />
        </div>
      ))}
    </div>
  );
}

export default function PartnerDashboard() {
  const { universityId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/partner-analytics/${universityId}?days=${days}`);
      setData(res.data.data);
    } catch {
      toast.error('Failed to load partner analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [universityId, days]);

  const handleCSVExport = () => {
    const url = `/api/v1/admin/leads/export-csv?universityId=${universityId}`;
    const link = document.createElement('a');
    link.href = url;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-light-muted dark:text-dark-muted">Loading partner analytics...</div>
      </div>
    );
  }

  if (!data) return null;

  const { university, totalLeads, applyLeads, brochureLeads, recentLeads, dailyLeads, profileViews } = data;
  const tier = TIER_CONFIG[university.sponsorTier] || TIER_CONFIG.none;
  const cpl = totalLeads > 0 ? 'Active' : 'No leads yet';
  const expiryDate = university.sponsorExpiry
    ? new Date(university.sponsorExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'No expiry set';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/leads" className="p-2 rounded-xl hover:bg-light-card dark:hover:bg-dark-card transition-colors">
            <ArrowLeft className="w-5 h-5 text-light-muted dark:text-dark-muted" />
          </Link>
          <div className="flex items-center gap-3">
            {university.logoUrl ? (
              <img src={university.logoUrl} alt={university.name} className="w-12 h-12 rounded-xl object-contain border border-light-border dark:border-dark-border bg-white p-1" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-link" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-light-text dark:text-dark-text leading-tight">{university.name}</h2>
              <p className="text-sm text-light-muted dark:text-dark-muted">{university.city}, {university.state}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Tier badge */}
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${tier.bg} ${tier.color} ${tier.border}`}>
            <tier.icon className="w-4 h-4" aria-hidden="true" /> {tier.label} Partner
          </span>

          {/* Expiry */}
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-light-card dark:bg-dark-card text-xs text-light-muted dark:text-dark-muted border border-light-border dark:border-dark-border">
            <Calendar className="w-3.5 h-3.5" />
            Expires: {expiryDate}
          </span>
        </div>
      </div>

      {/* Date range selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-light-muted dark:text-dark-muted font-semibold">Period:</span>
        {[7, 14, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              days === d
                ? 'bg-primary text-white shadow-md'
                : 'bg-light-card dark:bg-dark-card text-light-muted dark:text-dark-muted hover:text-link border border-light-border dark:border-dark-border'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye}       label="Profile Views"    value={profileViews.toLocaleString()}  color="text-blue-500"   bg="bg-blue-500/10" />
        <StatCard icon={Users}     label="Total Leads"      value={totalLeads}                      color="text-link"    bg="bg-primary/10" />
        <StatCard icon={CheckCircle2} label="Apply Now"     value={applyLeads}  sub="applications"  color="text-green-500"  bg="bg-green-500/10" />
        <StatCard icon={FileText}  label="Brochure Reqs"   value={brochureLeads} sub="downloads"   color="text-amber-500"  bg="bg-amber-500/10" />
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Daily leads chart */}
        <div className="lg:col-span-2 card p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-light-text dark:text-dark-text flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-link" />
              Lead Trend — Last {days} Days
            </h3>
            <span className="text-xs text-light-muted dark:text-dark-muted">{dailyLeads.length} active days</span>
          </div>
          <MiniBarChart data={dailyLeads} />
          <div className="flex justify-between text-[10px] text-light-muted dark:text-dark-muted pt-1 border-t border-light-border dark:border-dark-border">
            {dailyLeads.length > 0 && (
              <>
                <span>{dailyLeads[0]._id}</span>
                <span>{dailyLeads[dailyLeads.length - 1]._id}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-light-text dark:text-dark-text flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={handleCSVExport}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-all text-sm font-semibold border border-green-500/20"
            >
              <Download className="w-4 h-4" />
              Export All Leads (CSV)
            </button>
            <Link
              to={`/universities/${university.slug}`}
              target="_blank"
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/10 text-link hover:bg-primary/20 transition-all text-sm font-semibold border border-primary/20"
            >
              <Star className="w-4 h-4" />
              View Public Profile
            </Link>
            <Link
              to="/admin/leads"
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-light-card dark:bg-dark-card text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text transition-all text-sm font-semibold border border-light-border dark:border-dark-border"
            >
              <Mail className="w-4 h-4" />
              All Leads Registry
            </Link>
          </div>

          {/* Tier summary */}
          <div className={`mt-4 p-4 rounded-xl border ${tier.border} ${tier.bg}`}>
            <p className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${tier.color}`}><tier.icon className="w-4 h-4" aria-hidden="true" /> {tier.label} Tier Benefits</p>
            <ul className="mt-2 space-y-1 text-xs text-light-muted dark:text-dark-muted [&>li]:flex [&>li]:items-center [&>li]:gap-1.5 [&>li>svg]:w-3 [&>li>svg]:h-3 [&>li>svg]:shrink-0">
              {university.sponsorTier === 'platinum' && <><li><Check aria-hidden="true" />Slot #1 in all listings</li><li><Check aria-hidden="true" />Hero banner slider placement</li><li><Check aria-hidden="true" />Homepage sponsored showcase</li><li><Check aria-hidden="true" />Sticky bottom & sidebar ads</li></>}
              {university.sponsorTier === 'gold'     && <><li><Check aria-hidden="true" />Top 3 state placement</li><li><Check aria-hidden="true" />Homepage sponsored section</li><li><Check aria-hidden="true" />Sidebar ad placement</li></>}
              {university.sponsorTier === 'silver'   && <><li><Check aria-hidden="true" />Medium ranking boost</li><li><Check aria-hidden="true" />Sidebar ad placement</li><li><Check aria-hidden="true" />Video/photo gallery</li></>}
              {university.sponsorTier === 'bronze'   && <><li><Check aria-hidden="true" />Basic visibility boost</li><li><Check aria-hidden="true" />Verified badge</li></>}
              {(!university.sponsorTier || university.sponsorTier === 'none') && <li>No sponsorship active</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div className="card p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-light-text dark:text-dark-text flex items-center gap-2">
            <Mail className="w-5 h-5 text-link" />
            Recent Student Leads
            <span className="ml-2 text-xs font-normal text-light-muted dark:text-dark-muted">
              (last {days} days — {recentLeads.length} shown)
            </span>
          </h3>
          <button
            onClick={handleCSVExport}
            className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400 hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        {recentLeads.length === 0 ? (
          <p className="text-sm text-light-muted dark:text-dark-muted">No leads captured in this period yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-border dark:border-dark-border">
                  {['Student', 'Contact', 'State', 'Course', 'Type', 'Date'].map(h => (
                    <th key={h} className="pb-3 text-left text-xs font-bold uppercase tracking-[0.15em] text-light-muted dark:text-dark-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {recentLeads.map(lead => (
                  <tr key={lead._id} className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/30 transition-colors">
                    <td className="py-3 pr-4 font-semibold text-light-text dark:text-dark-text">{lead.name}</td>
                    <td className="py-3 pr-4 text-light-muted dark:text-dark-muted">
                      <div>{lead.email}</div>
                      <div className="text-xs">{lead.phone}</div>
                    </td>
                    <td className="py-3 pr-4 text-light-muted dark:text-dark-muted">{lead.state}</td>
                    <td className="py-3 pr-4 text-light-muted dark:text-dark-muted">{lead.preferredCourse || '—'}</td>
                    <td className="py-3 pr-4">
                      {lead.leadType === 'apply' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Apply</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Brochure</span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-light-muted dark:text-dark-muted">
                      {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
