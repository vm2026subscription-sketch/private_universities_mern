import { useState } from 'react';
import {
  CreditCard, Search, Filter, Calendar, Crown, Medal,
  AlertTriangle, CheckCircle2, RefreshCw, Sparkles, X, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_SUBSCRIPTIONS = [
  {
    id: 'SUB-901',
    universityName: 'Apex Technical University',
    tier: 'gold',
    tierName: 'Gold Partner',
    amount: '₹45,000 / yr',
    startDate: '2026-01-15',
    expiryDate: '2027-01-15',
    daysRemaining: 165,
    status: 'Active'
  },
  {
    id: 'SUB-902',
    universityName: 'Oxford Engineering College',
    tier: 'platinum',
    tierName: 'Platinum Tier',
    amount: '₹85,000 / yr',
    startDate: '2025-08-10',
    expiryDate: '2026-08-10',
    daysRemaining: 7,
    status: 'Expiring Soon'
  },
  {
    id: 'SUB-903',
    universityName: 'St. Xavier Institute of Management',
    tier: 'silver',
    tierName: 'Silver Partner',
    amount: '₹25,000 / 6mo',
    startDate: '2026-02-01',
    expiryDate: '2026-08-01',
    daysRemaining: 0,
    status: 'Expired'
  },
  {
    id: 'SUB-904',
    universityName: 'Manipal Global University',
    tier: 'platinum',
    tierName: 'Platinum Tier',
    amount: '₹85,000 / yr',
    startDate: '2026-04-05',
    expiryDate: '2027-04-05',
    daysRemaining: 245,
    status: 'Active'
  }
];

export default function SubscriptionsManager() {
  const [subscriptions, setSubscriptions] = useState(INITIAL_SUBSCRIPTIONS);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Edit/Extend Modal
  const [editingSub, setEditingSub] = useState(null);
  const [newTier, setNewTier] = useState('gold');
  const [extendMonths, setExtendMonths] = useState(12);

  const handleOpenExtend = (sub) => {
    setEditingSub(sub);
    setNewTier(sub.tier);
    setExtendMonths(12);
  };

  const handleSaveExtension = () => {
    if (!editingSub) return;
    setSubscriptions(prev => prev.map(s => {
      if (s.id === editingSub.id) {
        return {
          ...s,
          tier: newTier,
          tierName: newTier === 'platinum' ? 'Platinum Tier' : newTier === 'gold' ? 'Gold Partner' : 'Silver Partner',
          status: 'Active',
          daysRemaining: s.daysRemaining + (extendMonths * 30)
        };
      }
      return s;
    }));
    toast.success(`Updated subscription for ${editingSub.universityName}!`);
    setEditingSub(null);
  };

  const filteredSubs = subscriptions.filter(s => {
    const matchesSearch = s.universityName.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === 'All' || s.tier === tierFilter;
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    return matchesSearch && matchesTier && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-light-text dark:text-dark-text flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> University Subscriptions Registry
          </h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
            Monitor partner institution plans, renewal dates, and tier upgrades.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            {subscriptions.filter(s => s.status === 'Active').length} Active Paid Partners
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-light-muted absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by university name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {['All', 'platinum', 'gold', 'silver'].map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                tierFilter === t
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white dark:bg-dark-card text-light-muted dark:text-dark-muted border border-light-border dark:border-dark-border hover:text-light-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions List Table */}
      <div className="rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-light-bg/60 dark:bg-dark-bg/60 border-b border-light-border dark:border-dark-border text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">University Name</th>
                <th className="p-4">Subscription Plan</th>
                <th className="p-4">Billing Rate</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border font-medium text-light-text dark:text-dark-text">
              {filteredSubs.map((s) => (
                <tr key={s.id} className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/30 transition-colors">
                  <td className="p-4 pl-6 font-bold text-sm text-light-text dark:text-dark-text">
                    {s.universityName}
                    <span className="block text-[11px] font-normal text-light-muted">Ref: {s.id}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                      s.tier === 'platinum' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                      s.tier === 'gold' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                      'bg-slate-500/10 text-slate-600 border-slate-500/20'
                    }`}>
                      {s.tierName}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                    {s.amount}
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-light-text dark:text-dark-text">{s.expiryDate}</p>
                    <span className="text-[10px] text-light-muted">({s.daysRemaining} days remaining)</span>
                  </td>
                  <td className="p-4">
                    {s.status === 'Active' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Active
                      </span>
                    )}
                    {s.status === 'Expiring Soon' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Expiring Soon
                      </span>
                    )}
                    {s.status === 'Expired' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                        Expired
                      </span>
                    )}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      onClick={() => handleOpenExtend(s)}
                      className="px-3.5 py-1.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold hover:bg-primary hover:text-white transition-all inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Extend / Upgrade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extension Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-3">
              <h3 className="font-bold text-base text-light-text dark:text-dark-text">
                Manage Plan - {editingSub.universityName}
              </h3>
              <button onClick={() => setEditingSub(null)} className="p-1 rounded-lg text-light-muted hover:text-light-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-light-muted mb-1">
                  Select Subscription Tier
                </label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value)}
                  className="w-full p-3 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-bold"
                >
                  <option value="silver">Silver Partner (₹25,000 / 6mo)</option>
                  <option value="gold">Gold Partner (₹45,000 / yr)</option>
                  <option value="platinum">Platinum Tier (₹85,000 / yr)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-light-muted mb-1">
                  Validity Extension Duration
                </label>
                <select
                  value={extendMonths}
                  onChange={(e) => setExtendMonths(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-bold"
                >
                  <option value={6}>+6 Months Extension</option>
                  <option value={12}>+12 Months (1 Year Extension)</option>
                  <option value={24}>+24 Months (2 Years Extension)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
              <button
                onClick={() => setEditingSub(null)}
                className="px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold text-light-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExtension}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90"
              >
                Save Extension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
