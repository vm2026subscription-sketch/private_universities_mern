import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  IndianRupee, 
  Users, 
  TrendingUp, 
  RefreshCw, 
  AlertCircle, 
  Calendar 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const RevenueDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalData, setTotalData] = useState({ totalRevenue: 0, totalSubscriptions: 0, currency: 'INR' });
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [totalRes, monthlyRes, yearlyRes] = await Promise.all([
        api.get('/admin/revenue/total'),
        api.get('/admin/revenue/monthly'),
        api.get('/admin/revenue/yearly')
      ]);

      if (totalRes.data?.success) {
        setTotalData(totalRes.data.data);
      }
      if (monthlyRes.data?.success) {
        setMonthlyData(monthlyRes.data.data);
      }
      if (yearlyRes.data?.success) {
        setYearlyData(yearlyRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching revenue data:', err);
      setError('Failed to fetch revenue data. Please try again.');
      toast.error('Failed to fetch revenue data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const avgRevenue = totalData.totalSubscriptions > 0 
    ? totalData.totalRevenue / totalData.totalSubscriptions 
    : 0;

  if (loading && !totalData.totalSubscriptions && !error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">Revenue Dashboard</h1>
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border shadow-sm h-32 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-sm h-96 animate-pulse"></div>
          <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-sm h-96 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-6 rounded-lg flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">Revenue Dashboard</h1>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center space-x-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {!totalData.totalSubscriptions && !loading ? (
        <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-12 text-center flex flex-col items-center justify-center">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
            <IndianRupee className="w-12 h-12 text-light-muted dark:text-dark-muted" />
          </div>
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">No revenue data yet</h3>
          <p className="text-light-muted dark:text-dark-muted max-w-md">
            Once you start getting subscribers, your revenue metrics will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border shadow-sm flex items-center">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mr-4">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-light-muted dark:text-dark-muted mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {formatCurrency(totalData.totalRevenue)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border shadow-sm flex items-center">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mr-4">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-light-muted dark:text-dark-muted mb-1">Total Subscriptions</p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {totalData.totalSubscriptions.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border shadow-sm flex items-center">
              <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full mr-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-light-muted dark:text-dark-muted mb-1">Avg Revenue / Sub</p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {formatCurrency(avgRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-sm overflow-hidden">
              <div className="p-5 border-b border-light-border dark:border-dark-border bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Monthly Revenue
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/80 text-light-muted dark:text-dark-muted border-b border-light-border dark:border-dark-border text-sm">
                      <th className="p-4 font-medium">Month</th>
                      <th className="p-4 font-medium">Revenue</th>
                      <th className="p-4 font-medium">Subscriptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.length > 0 ? (
                      monthlyData.map((item, idx) => (
                        <tr 
                          key={`${item.year}-${item.month}`} 
                          className="border-b border-light-border dark:border-dark-border hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="p-4 text-light-text dark:text-dark-text">
                            {MONTH_NAMES[item.month - 1]} {item.year}
                          </td>
                          <td className="p-4 font-medium text-light-text dark:text-dark-text">
                            {formatCurrency(item.totalRevenue)}
                          </td>
                          <td className="p-4 text-light-muted dark:text-dark-muted">
                            {item.subscriptionCount}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="p-8 text-center text-light-muted dark:text-dark-muted">
                          No monthly data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-sm overflow-hidden">
              <div className="p-5 border-b border-light-border dark:border-dark-border bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Yearly Revenue
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/80 text-light-muted dark:text-dark-muted border-b border-light-border dark:border-dark-border text-sm">
                      <th className="p-4 font-medium">Year</th>
                      <th className="p-4 font-medium">Revenue</th>
                      <th className="p-4 font-medium">Subscriptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyData.length > 0 ? (
                      yearlyData.map((item, idx) => (
                        <tr 
                          key={item.year} 
                          className="border-b border-light-border dark:border-dark-border hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="p-4 text-light-text dark:text-dark-text">
                            {item.year}
                          </td>
                          <td className="p-4 font-medium text-light-text dark:text-dark-text">
                            {formatCurrency(item.totalRevenue)}
                          </td>
                          <td className="p-4 text-light-muted dark:text-dark-muted">
                            {item.subscriptionCount}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="p-8 text-center text-light-muted dark:text-dark-muted">
                          No yearly data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueDashboard;
