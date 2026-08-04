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
  Calendar
} from 'lucide-react';

const SubscriptionsManager = () => {
  const [activeSubs, setActiveSubs] = useState([]);
  const [expiredSubs, setExpiredSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

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
        <span className="inline-flex items-center text-sm text-green-600 dark:text-green-400">
          <Clock className="w-3 h-3 mr-1" />
          Expires in {days} days
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center text-sm text-red-600 dark:text-red-400">
          <XCircle className="w-3 h-3 mr-1" />
          Expired {Math.abs(days)} days ago
        </span>
      );
    }
  };

  const currentSubs = activeTab === 'active' ? activeSubs : expiredSubs;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 dark:bg-dark-border rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 dark:bg-dark-border rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="h-24 bg-gray-200 dark:bg-dark-border rounded-lg animate-pulse"></div>
          <div className="h-24 bg-gray-200 dark:bg-dark-border rounded-lg animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-dark-border rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">Failed to load subscriptions</h3>
        <p className="text-light-muted dark:text-dark-muted mb-6 text-center">{error}</p>
        <button
          onClick={fetchSubscriptions}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-light-text dark:text-dark-text flex items-center">
          <CreditCard className="w-6 h-6 mr-2 text-primary" />
          Subscriptions
        </h1>
        <button
          onClick={fetchSubscriptions}
          className="flex items-center px-4 py-2 text-sm font-medium text-light-text dark:text-dark-text bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-md hover:bg-gray-50 dark:hover:bg-dark-border transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-light-muted dark:text-dark-muted mb-1">Active Subscriptions</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{activeSubs.length}</p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-light-muted dark:text-dark-muted mb-1">Expired Subscriptions</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{expiredSubs.length}</p>
          </div>
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
            <XCircle className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="border-b border-light-border dark:border-dark-border">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Active ({activeSubs.length})
          </button>
          <button
            onClick={() => setActiveTab('expired')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'expired'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Expired ({expiredSubs.length})
          </button>
        </nav>
      </div>

      <div className="space-y-4">
        {currentSubs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg">
            <CreditCard className="mx-auto h-12 w-12 text-light-muted dark:text-dark-muted opacity-50 mb-4" />
            <h3 className="text-lg font-medium text-light-text dark:text-dark-text">No {activeTab} subscriptions</h3>
            <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">
              There are currently no {activeTab} university subscriptions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-light-border dark:divide-dark-border bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg overflow-hidden hidden md:table">
              <thead className="bg-gray-50 dark:bg-dark-bg">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-light-muted dark:text-dark-muted uppercase tracking-wider">
                    University
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-light-muted dark:text-dark-muted uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-light-muted dark:text-dark-muted uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-light-muted dark:text-dark-muted uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-light-muted dark:text-dark-muted uppercase tracking-wider">
                    Payment ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {currentSubs.map((sub) => (
                  <tr key={sub._id} className="hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 dark:bg-dark-border rounded-md flex items-center justify-center overflow-hidden">
                          {sub.universityId?.logoUrl ? (
                            <img src={sub.universityId.logoUrl} alt="" className="h-10 w-10 object-cover" />
                          ) : (
                            <Building2 className="h-6 w-6 text-light-muted dark:text-dark-muted" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-light-text dark:text-dark-text">
                            {sub.universityId?.name || 'Unknown University'}
                          </div>
                          <div className="text-sm text-light-muted dark:text-dark-muted">
                            {sub.universityId?.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sub.plan?.toLowerCase() === 'yearly' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                      }`}>
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text dark:text-dark-text font-medium">
                      ₹{sub.amount?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-light-text dark:text-dark-text">
                        <Calendar className="w-3 h-3 inline mr-1 text-light-muted dark:text-dark-muted" />
                        {formatDate(sub.startDate)} - {formatDate(sub.expiryDate)}
                      </div>
                      <div className="mt-1">
                        {renderExpiryStatus(sub.expiryDate, activeTab === 'active')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-light-muted dark:text-dark-muted font-mono">
                      {sub.razorpayPaymentId || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {currentSubs.map((sub) => (
                <div key={sub._id} className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 dark:bg-dark-border rounded-md flex items-center justify-center overflow-hidden">
                        {sub.universityId?.logoUrl ? (
                          <img src={sub.universityId.logoUrl} alt="" className="h-10 w-10 object-cover" />
                        ) : (
                          <Building2 className="h-6 w-6 text-light-muted dark:text-dark-muted" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-light-text dark:text-dark-text line-clamp-1">
                          {sub.universityId?.name || 'Unknown University'}
                        </h4>
                        <p className="text-xs text-light-muted dark:text-dark-muted line-clamp-1">
                          {sub.universityId?.email || 'No email'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                      sub.plan?.toLowerCase() === 'yearly' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                    }`}>
                      {sub.plan}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-light-muted dark:text-dark-muted mb-1">Amount</p>
                      <p className="text-sm font-medium text-light-text dark:text-dark-text">₹{sub.amount?.toLocaleString('en-IN') || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-light-muted dark:text-dark-muted mb-1">Payment ID</p>
                      <p className="text-xs font-mono text-light-text dark:text-dark-text truncate" title={sub.razorpayPaymentId}>
                        {sub.razorpayPaymentId || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-light-border dark:border-dark-border">
                    <div className="flex justify-between items-center text-xs text-light-muted dark:text-dark-muted mb-1">
                      <span>{formatDate(sub.startDate)}</span>
                      <span>{formatDate(sub.expiryDate)}</span>
                    </div>
                    <div className="mt-2 text-right">
                      {renderExpiryStatus(sub.expiryDate, activeTab === 'active')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionsManager;
