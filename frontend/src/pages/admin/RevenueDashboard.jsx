import { useState } from 'react';
import {
  TrendingUp, DollarSign, Download, ArrowUpRight, BarChart3,
  CreditCard, Calendar, Users, CheckCircle2, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const RECENT_TRANSACTIONS = [
  { id: 'TXN-8801', university: 'Glacier Valley Tech', plan: 'Gold Partner', amount: '₹45,000', date: '2026-08-02', status: 'Success', mode: 'Razorpay UPI' },
  { id: 'TXN-8802', university: 'Manipal Global University', plan: 'Platinum Tier', amount: '₹85,000', date: '2026-08-01', status: 'Success', mode: 'Net Banking' },
  { id: 'TXN-8803', university: 'Apex Technical University', plan: 'Gold Partner Renewal', amount: '₹45,000', date: '2026-07-28', status: 'Success', mode: 'Credit Card' },
  { id: 'TXN-8804', university: 'Oxford Engineering College', plan: 'Silver Partner', amount: '₹25,000', date: '2026-07-24', status: 'Success', mode: 'NEFT Transfer' },
  { id: 'TXN-8805', university: 'Royal Heritage University', plan: 'Platinum Tier', amount: '₹85,000', date: '2026-07-20', status: 'Success', mode: 'Razorpay UPI' },
];

export default function RevenueDashboard() {
  const [metrics] = useState({
    totalRevenue: '₹34,80,000',
    mrr: '₹2,90,000',
    activePaidSubs: 48,
    growthRate: '+24.5%',
    platinumCount: 14,
    goldCount: 22,
    silverCount: 12
  });

  const handleExportCSV = () => {
    toast.success('Downloading Revenue & Transaction Report (CSV)...');
  };

  return (
    <div className="space-y-8">
      {/* Header & Export Action */}
      <div className="p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-light-text dark:text-dark-text flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-500" /> Platform Revenue & Financial Overview
          </h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
            Real-time financial analytics, monthly recurring revenue (MRR), and subscription transactions.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Export Revenue CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted">Total Revenue (YTD)</p>
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">{metrics.totalRevenue}</h3>
            <p className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {metrics.growthRate} YoY
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted">Monthly Recurring (MRR)</p>
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">{metrics.mrr}</h3>
            <p className="text-xs text-blue-500 font-semibold mt-1">Average run rate</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted">Active Paid Partners</p>
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">{metrics.activePaidSubs}</h3>
            <p className="text-xs text-purple-500 font-semibold mt-1">Institutions subscribed</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted">Platinum Tier Share</p>
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">42%</h3>
            <p className="text-xs text-amber-500 font-semibold mt-1">{metrics.platinumCount} Platinum Partners</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tier Distribution Visual Bar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-4">
        <h3 className="font-bold text-base text-light-text dark:text-dark-text">Revenue Distribution by Partner Tier</h3>
        <div className="h-4 rounded-full bg-light-bg dark:bg-dark-bg overflow-hidden flex">
          <div className="bg-purple-600 h-full w-[45%]" title="Platinum (45%)" />
          <div className="bg-amber-500 h-full w-[38%]" title="Gold (38%)" />
          <div className="bg-slate-400 h-full w-[17%]" title="Silver (17%)" />
        </div>
        <div className="flex items-center justify-between text-xs font-bold text-light-muted pt-1">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-600 inline-block" /> Platinum Tier (45%)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Gold Partner (38%)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400 inline-block" /> Silver Partner (17%)</span>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border overflow-hidden shadow-sm space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-4">
          <h3 className="font-bold text-base text-light-text dark:text-dark-text flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Recent Payment Transactions
          </h3>
          <span className="text-xs text-light-muted">Showing latest 5 entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-light-bg/60 dark:bg-dark-bg/60 border-b border-light-border dark:border-dark-border text-light-muted font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Txn Ref</th>
                <th className="p-3">University</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border font-medium">
              {RECENT_TRANSACTIONS.map((t) => (
                <tr key={t.id} className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/30">
                  <td className="p-3 font-bold text-light-text dark:text-dark-text">{t.id}</td>
                  <td className="p-3 font-semibold">{t.university}</td>
                  <td className="p-3 text-light-muted">{t.plan}</td>
                  <td className="p-3 font-extrabold text-emerald-600">{t.amount}</td>
                  <td className="p-3 text-light-muted">{t.mode}</td>
                  <td className="p-3 text-light-muted">{t.date}</td>
                  <td className="p-3 text-right">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
