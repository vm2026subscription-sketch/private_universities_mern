import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
  Settings,
  X,
  Search,
  Sparkles,
  ShieldCheck,
  Zap,
  Filter
} from 'lucide-react';

const SubscriptionsManager = () => {
  const [activeSubs, setActiveSubs] = useState([]);
  const [expiredSubs, setExpiredSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'expired'
  const [searchQuery, setSearchQuery] = useState('');
  const [trialModal, setTrialModal] = useState({ isOpen: false, university: null });
  const [trialLoading, setTrialLoading] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const [activeRes, expiredRes] = await Promise.all([
        api.get('/admin/subscriptions/active'),
        api.get('/admin/subscriptions/expired')
      ]);

      if (activeRes.data.success && expiredRes.data.success) {
        setActiveSubs(activeRes.data.data || []);
        setExpiredSubs(expiredRes.data.data || []);
      } else {
        throw new Error('Failed to fetch subscriptions');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Something went wrong while fetching subscriptions.');
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleManageTrial = (university) => {
    if (!university) return;
    setTrialModal({ isOpen: true, university });
  };

  const submitTrialAction = async (action) => {
    try {
      setTrialLoading(true);
      const res = await api.post(`/admin/universities/${trialModal.university._id}/trial`, { action });
      if (res.data.success) {
        toast.success(res.data.message || 'Trial status updated successfully');
        setTrialModal({ isOpen: false, university: null });
        fetchSubscriptions();
      } else {
        toast.error(res.data.message || 'Failed to update trial');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Something went wrong while executing action');
    } finally {
      setTrialLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderExpiryStatus = (expiryDateStr, isActive) => {
    if (!expiryDateStr) return null;
    const expiry = new Date(expiryDateStr).getTime();
    const now = new Date().getTime();
    const diff = expiry - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (isActive) {
      return (
        <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          <Clock className="w-3 h-3 mr-1" />
          Expires in {days} days
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Expired {Math.abs(days)} days ago
        </span>
      );
    }
  };

  const rawList = activeTab === 'active' ? activeSubs : expiredSubs;
  const currentSubs = rawList.filter(sub => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const uniName = sub.universityId?.name?.toLowerCase() || '';
    const uniEmail = sub.universityId?.email?.toLowerCase() || '';
    const paymentId = sub.razorpayPaymentId?.toLowerCase() || '';
    const plan = sub.plan?.toLowerCase() || '';
    return uniName.includes(query) || uniEmail.includes(query) || paymentId.includes(query) || plan.includes(query);
  });

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto py-4">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 dark:bg-dark-border rounded-xl w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 dark:bg-dark-border rounded-xl w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="h-28 bg-gray-200 dark:bg-dark-border rounded-2xl animate-pulse"></div>
          <div className="h-28 bg-gray-200 dark:bg-dark-border rounded-2xl animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-dark-border rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-dark-card rounded-3xl border border-light-border dark:border-dark-border text-center max-w-lg mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-light-text dark:text-dark-text mb-2">Failed to load subscriptions</h3>
        <p className="text-sm text-light-muted dark:text-dark-muted mb-6">{error}</p>
        <button
          onClick={fetchSubscriptions}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-orange-600 hover:brightness-105 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-light-text dark:text-dark-text tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-primary" />
            Subscriptions Console
          </h1>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
            Monitor active subscriptions, manage trial extensions, and audit payment details.
          </p>
        </div>
        <button
          onClick={fetchSubscriptions}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-light-text dark:text-dark-text bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl hover:bg-light-bg dark:hover:bg-dark-border hover:border-primary/40 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shadow-sm"
        >
          <RefreshCw className="w-4 h-4 text-primary" />
          Refresh Subscriptions
        </button>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="p-6 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200 ease-out transform hover:-translate-y-0.5 relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">
              Active Subscriptions
            </p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {activeSubs.length}
            </p>
            <p className="text-[11px] text-light-muted dark:text-dark-muted">
              Universities currently accepting student enquiries
            </p>
          </div>
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200 ease-out transform hover:-translate-y-0.5 relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">
              Expired Subscriptions
            </p>
            <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">
              {expiredSubs.length}
            </p>
            <p className="text-[11px] text-light-muted dark:text-dark-muted">
              Lead capture forms locked until plan renewal
            </p>
          </div>
          <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl shrink-0">
            <XCircle className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-light-border dark:border-dark-border pb-2">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex items-center gap-2 ${
              activeTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text'
            }`}
          >
            <span>Active ({activeSubs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('expired')}
            className={`pb-3 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex items-center gap-2 ${
              activeTab === 'expired'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text'
            }`}
          >
            <span>Expired ({expiredSubs.length})</span>
          </button>
        </nav>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-light-muted dark:text-dark-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search university or payment ID..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs text-light-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Main Content List */}
      <div className="space-y-4">
        {currentSubs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-8 space-y-3 shadow-sm">
            <CreditCard className="mx-auto h-12 w-12 text-light-muted dark:text-dark-muted opacity-40" />
            <h3 className="text-base font-bold text-light-text dark:text-dark-text">No {activeTab} subscriptions found</h3>
            <p className="text-xs text-light-muted dark:text-dark-muted max-w-sm mx-auto">
              {searchQuery ? 'No subscriptions match your search filter criteria.' : `There are currently no ${activeTab} university subscriptions registered.`}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
              <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-left">
                <thead className="bg-light-bg/60 dark:bg-dark-bg/60">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
                      University
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
                      Duration & Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
                      Payment Reference
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border text-xs">
                  {currentSubs.map((sub) => (
                    <tr key={sub._id} className="hover:bg-light-bg/40 dark:hover:bg-dark-bg/40 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-light-bg dark:bg-dark-border rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-light-border dark:border-dark-border">
                            {sub.universityId?.logoUrl ? (
                              <img src={sub.universityId.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="w-5 h-5 text-light-muted dark:text-dark-muted" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-light-text dark:text-dark-text text-sm">
                              {sub.universityId?.name || 'Unknown University'}
                            </div>
                            <div className="text-[11px] text-light-muted dark:text-dark-muted">
                              {sub.universityId?.email || 'No email registered'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-[11px] font-bold rounded-full uppercase ${
                          sub.plan?.toLowerCase() === 'yearly' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' 
                            : sub.plan?.toLowerCase() === 'trial'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}>
                          {sub.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-light-text dark:text-dark-text">
                        ₹{sub.amount?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap space-y-1">
                        <div className="text-light-text dark:text-dark-text font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-light-muted dark:text-dark-muted" />
                          {formatDate(sub.startDate)} - {formatDate(sub.expiryDate)}
                        </div>
                        <div>
                          {renderExpiryStatus(sub.expiryDate, activeTab === 'active')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-light-muted dark:text-dark-muted">
                        {sub.razorpayPaymentId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleManageTrial(sub.universityId)}
                          className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all duration-200 font-bold flex items-center gap-1.5 ml-auto focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Manage Trial
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-4">
              {currentSubs.map((sub) => (
                <div key={sub._id} className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-light-bg dark:bg-dark-border rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-light-border dark:border-dark-border">
                        {sub.universityId?.logoUrl ? (
                          <img src={sub.universityId.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-5 h-5 text-light-muted dark:text-dark-muted" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-light-text dark:text-dark-text line-clamp-1">
                          {sub.universityId?.name || 'Unknown University'}
                        </h4>
                        <p className="text-xs text-light-muted dark:text-dark-muted line-clamp-1">
                          {sub.universityId?.email || 'No email registered'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full whitespace-nowrap ${
                      sub.plan?.toLowerCase() === 'yearly' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' 
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                    }`}>
                      {sub.plan}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs border-y border-light-border dark:border-dark-border py-3">
                    <div>
                      <p className="text-light-muted dark:text-dark-muted text-[10px] uppercase tracking-wider font-semibold">Amount</p>
                      <p className="font-bold text-light-text dark:text-dark-text mt-0.5">₹{sub.amount?.toLocaleString('en-IN') || 0}</p>
                    </div>
                    <div>
                      <p className="text-light-muted dark:text-dark-muted text-[10px] uppercase tracking-wider font-semibold">Payment ID</p>
                      <p className="font-mono text-light-text dark:text-dark-text text-[11px] truncate mt-0.5" title={sub.razorpayPaymentId}>
                        {sub.razorpayPaymentId || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div>
                      {renderExpiryStatus(sub.expiryDate, activeTab === 'active')}
                    </div>
                    <button
                      onClick={() => handleManageTrial(sub.universityId)}
                      className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all duration-200 font-bold text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Manage Trial
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trial Action Modal */}
      {trialModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-light-border dark:border-dark-border">
            <div className="px-6 py-4 border-b border-light-border dark:border-dark-border flex justify-between items-center bg-light-bg/50 dark:bg-dark-bg/50">
              <h3 className="text-base font-bold text-light-text dark:text-dark-text flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Manage Trial & Validity
              </h3>
              <button 
                onClick={() => setTrialModal({ isOpen: false, university: null })}
                className="p-1 rounded-lg text-light-muted hover:text-light-text dark:hover:text-dark-text transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-light-bg dark:bg-dark-bg/80 p-4 rounded-2xl border border-light-border dark:border-dark-border">
                <p className="text-xs font-semibold text-light-muted dark:text-dark-muted uppercase tracking-wider">Target University</p>
                <p className="text-sm font-bold text-light-text dark:text-dark-text mt-0.5">{trialModal.university?.name}</p>
              </div>

              <p className="text-xs text-light-muted dark:text-dark-muted">
                Select an extension or expiration override. This immediately updates subscription validity in the backend and unlocks/locks enquiry lead forms.
              </p>
              
              <div className="space-y-2.5">
                <button
                  onClick={() => submitTrialAction('extend_7')}
                  disabled={trialLoading}
                  className="w-full text-left px-4 py-3 rounded-xl border border-light-border dark:border-dark-border hover:border-primary hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all duration-200 text-xs text-light-text dark:text-dark-text font-bold disabled:opacity-50 flex items-center justify-between focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <span>Extend Trial by 7 Days</span>
                  {trialLoading ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : <Clock className="w-4 h-4 text-primary" />}
                </button>

                <button
                  onClick={() => submitTrialAction('extend_15')}
                  disabled={trialLoading}
                  className="w-full text-left px-4 py-3 rounded-xl border border-light-border dark:border-dark-border hover:border-primary hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all duration-200 text-xs text-light-text dark:text-dark-text font-bold disabled:opacity-50 flex items-center justify-between focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <span>Extend Trial by 15 Days</span>
                  {trialLoading ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : <Clock className="w-4 h-4 text-primary" />}
                </button>

                <button
                  onClick={() => submitTrialAction('extend_30')}
                  disabled={trialLoading}
                  className="w-full text-left px-4 py-3 rounded-xl border border-light-border dark:border-dark-border hover:border-primary hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all duration-200 text-xs text-light-text dark:text-dark-text font-bold disabled:opacity-50 flex items-center justify-between focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <span>Extend Trial by 30 Days</span>
                  {trialLoading ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : <Clock className="w-4 h-4 text-primary" />}
                </button>

                <button
                  onClick={() => submitTrialAction('lifetime')}
                  disabled={trialLoading}
                  className="w-full text-left px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all duration-200 text-xs text-emerald-700 dark:text-emerald-300 font-bold disabled:opacity-50 flex items-center justify-between focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  <span>Grant Lifetime Access (Until 2099)</span>
                  {trialLoading ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> : <Sparkles className="w-4 h-4 text-emerald-500" />}
                </button>

                <div className="pt-2">
                  <button
                    onClick={() => submitTrialAction('remove')}
                    disabled={trialLoading}
                    className="w-full text-left px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 text-xs text-red-700 dark:text-red-400 font-bold disabled:opacity-50 flex items-center justify-between focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                  >
                    <span>Remove Trial / Expire Immediately</span>
                    {trialLoading ? <RefreshCw className="w-4 h-4 animate-spin text-red-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsManager;
