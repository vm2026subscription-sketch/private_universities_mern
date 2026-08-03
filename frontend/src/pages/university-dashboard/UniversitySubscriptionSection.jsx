import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CreditCard, Calendar, Sparkles, CheckCircle2, Shield,
  ArrowRight, Crown, Medal, Zap, AlertTriangle, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const PLANS = [
  {
    name: 'Silver Partner',
    tier: 'silver',
    price: '₹25,000',
    period: '/ 6 months',
    badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-400/30',
    features: [
      'Standard Portal Listing',
      'Up to 15 Courses Listing',
      'Basic Lead Management Dashboard',
      'Verified Institution Badge'
    ]
  },
  {
    name: 'Gold Partner (Popular)',
    tier: 'gold',
    price: '₹45,000',
    period: '/ 1 year',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400/30',
    recommended: true,
    features: [
      'Top 3 Search Placement in State',
      'Unlimited Course Catalog Listing',
      'Direct Student Lead Notifications (SMS/Email)',
      'Featured Homepage Spotlight',
      'Full Gallery & Virtual Tour Support',
      'Priority Phone Support'
    ]
  },
  {
    name: 'Platinum Tier',
    tier: 'platinum',
    price: '₹85,000',
    period: '/ 1 year',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-400/30',
    features: [
      'Slot #1 Sponsored Listing Nationwide',
      'Hero Banner Showcase Ads',
      'Sticky Bottom & Sidebar Promotion',
      'Dedicated Account Director',
      'Automated Lead Export (API/CSV)',
      'Custom Student Counseling Workshops'
    ]
  }
];

export default function UniversitySubscriptionSection() {
  const location = useLocation();
  const uni = location.state?.university;

  const tierName = uni?.sponsorTier && uni.sponsorTier !== 'none'
    ? `${uni.sponsorTier.toUpperCase()} Partner Plan`
    : 'Gold Partner Plan';

  const [currentSubscription] = useState({
    planName: tierName,
    tier: uni?.sponsorTier || 'gold',
    startDate: '15 Jan 2026',
    expiryDate: uni?.sponsorExpiry ? new Date(uni.sponsorExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '15 Jan 2027',
    daysRemaining: 165,
    status: 'Active',
    billingCycle: 'Annual'
  });

  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRenewClick = (plan) => {
    setSelectedPlan(plan);
    setRenewModalOpen(true);
  };

  const handleConfirmRenewal = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setRenewModalOpen(false);
      toast.success(`Successfully renewed ${selectedPlan.name}! Subscription extended by 1 year.`);
    }, 1200);
  };

  return (
    <div className="space-y-8">
      {/* Active Subscription Banner Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-light-border dark:border-dark-border pb-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Crown className="w-3.5 h-3.5" /> Current Subscription
            </span>
            <h2 className="text-2xl font-extrabold text-light-text dark:text-dark-text">
              {currentSubscription.planName}
            </h2>
            <p className="text-xs text-light-muted dark:text-dark-muted font-medium">
              Active since {currentSubscription.startDate} • Billed {currentSubscription.billingCycle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-4 rounded-2xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-center min-w-[140px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-light-muted">Expiry Date</span>
              <p className="font-extrabold text-sm text-light-text dark:text-dark-text mt-0.5">{currentSubscription.expiryDate}</p>
              <span className="text-[10px] font-bold text-emerald-500">({currentSubscription.daysRemaining} days left)</span>
            </div>

            <button
              onClick={() => handleRenewClick(PLANS[1])}
              className="px-6 py-3.5 rounded-xl bg-primary text-white font-extrabold text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-300" /> Renew / Upgrade Subscription
            </button>
          </div>
        </div>

        {/* Feature inclusions summary */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-light-muted dark:text-dark-muted">Included Benefits in your plan:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-light-text dark:text-dark-text bg-light-bg dark:bg-dark-bg p-3 rounded-xl border border-light-border dark:border-dark-border">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Top 3 Search Placement in State
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-light-text dark:text-dark-text bg-light-bg dark:bg-dark-bg p-3 rounded-xl border border-light-border dark:border-dark-border">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Unlimited Course Catalog Listing
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-light-text dark:text-dark-text bg-light-bg dark:bg-dark-bg p-3 rounded-xl border border-light-border dark:border-dark-border">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Direct Lead Notifications via Email & SMS
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-extrabold text-light-text dark:text-dark-text">Choose or Extend Partnership Plan</h3>
          <p className="text-xs text-light-muted dark:text-dark-muted">Select a plan tier tailored to your institution's admissions goals.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`p-6 rounded-3xl bg-white dark:bg-dark-card border transition-all flex flex-col justify-between relative ${
                plan.recommended
                  ? 'border-primary ring-2 ring-primary/20 shadow-xl'
                  : 'border-light-border dark:border-dark-border shadow-sm hover:border-primary/50'
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                  Most Popular Choice
                </span>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${plan.badgeColor}`}>
                    {plan.name}
                  </span>
                  <div className="pt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-light-text dark:text-dark-text">{plan.price}</span>
                    <span className="text-xs text-light-muted font-medium">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 pt-2 border-t border-light-border dark:border-dark-border text-xs text-light-muted dark:text-dark-muted">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-light-text dark:text-dark-text font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => handleRenewClick(plan)}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                    plan.recommended
                      ? 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
                      : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border hover:bg-primary hover:text-white'
                  }`}
                >
                  Select & Renew <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Renewal Confirmation Modal */}
      {renewModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-3">
              <h3 className="font-bold text-base text-light-text dark:text-dark-text flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Renew Partnership Plan
              </h3>
              <button onClick={() => setRenewModalOpen(false)} className="p-1 rounded-lg text-light-muted hover:text-light-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-light-muted">Selected Plan:</span>
                <span className="font-extrabold text-light-text dark:text-dark-text">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-light-muted">Total Renewal Amount:</span>
                <span className="font-extrabold text-emerald-600 text-base">{selectedPlan.price}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-light-muted">Validity Extension:</span>
                <span className="font-bold text-primary">1 Full Year (365 Days)</span>
              </div>
            </div>

            <div className="text-xs text-light-muted space-y-1">
              <p>• Renewal invoice will be automatically generated and emailed to your billing contact.</p>
              <p>• Priority search ranking will remain active without interruption.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
              <button
                onClick={() => setRenewModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold text-light-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRenewal}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? 'Processing Payment...' : 'Confirm & Renew Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
