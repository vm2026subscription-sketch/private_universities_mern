import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  CreditCard, Check, Shield, Clock, Zap, 
  Crown, AlertCircle, CheckCircle2, Loader2, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const UniversitySubscriptionSection = () => {
  const { uni, subscription, loading: uniLoading, refreshUni } = useOutletContext();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [paymentState, setPaymentState] = useState('idle'); // idle, processing, success

  /**
   * Prices come from the server, which is also what prices the order.
   *
   * These cards used to carry their own hardcoded figures, so the page
   * advertised ₹4,999 while PLAN_PRICE_MONTHLY_INR said 1000 — a customer read
   * one number and would have been charged another. Falling back to null keeps
   * the card blank rather than guessing.
   */
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/payment/plans')
      .then(({ data }) => {
        if (cancelled || !data?.data?.plans) return;
        setPrices(Object.fromEntries(data.data.plans.map((p) => [p.plan, p.amountInRupees])));
      })
      .catch(() => { /* card shows a dash; ordering still works */ });
    return () => { cancelled = true; };
  }, []);

  const priceLabel = (plan) =>
    prices?.[plan] != null ? `₹${prices[plan].toLocaleString('en-IN')}` : '—';
  
  const handleSubscribe = async (plan) => {
    try {
      setLoadingPlan(plan);
      setPaymentState('idle');
      
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast.error('Failed to load payment gateway. Please check your connection.');
        setLoadingPlan(null);
        return;
      }
      
      // 1. Create order
      const orderRes = await api.post('/payment/create-order', { plan });
      
      if (!orderRes.data.success) {
        throw new Error(orderRes.data.message || 'Failed to create order');
      }
      
      const data = orderRes.data.data;
      
      // 2. Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Vidyarthi Mitra',
        description: `University Subscription - ${data.plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
        order_id: data.orderId,
        handler: async function (response) {
          try {
            setPaymentState('processing');
            const verifyRes = await api.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            
            if (verifyRes.data.success) {
              setPaymentState('success');
              toast.success('Payment verified successfully!');
              if (refreshUni) refreshUni();
            } else {
              setPaymentState('error');
              toast.error(verifyRes.data.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Verify error:', error);
            setPaymentState('error');
            toast.error(error.response?.data?.message || 'Error verifying payment');
          } finally {
            setLoadingPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            setLoadingPlan(null);
            toast.error('Payment cancelled');
          }
        },
        prefill: {
          name: uni?.name || user?.name || '',
          email: user?.email || '',
          contact: ''
        },
        theme: {
          color: '#F97316'
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setLoadingPlan(null);
        toast.error(response.error.description || 'Payment failed');
      });
      
      rzp.open();
      
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error(error.response?.data?.message || error.message || 'An error occurred');
      setLoadingPlan(null);
    }
  };

  if (uniLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (paymentState === 'processing') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-12 text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">
            Verifying your payment...
          </h2>
          <p className="text-light-muted dark:text-dark-muted">
            Please wait while we confirm your transaction. Do not refresh this page.
          </p>
        </div>
      </div>
    );
  }

  if (paymentState === 'success') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-12 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-4">
            Payment verified!
          </h2>
          <p className="text-light-muted dark:text-dark-muted mb-8 max-w-md mx-auto">
            Your subscription will activate shortly via our payment processor. 
            Once activated, you'll have full access to all premium university features.
          </p>
          <button 
            onClick={() => {
              setPaymentState('idle');
              if (refreshUni) refreshUni();
            }}
            className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            Return to Subscription Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Subscription Status Banner */}
      {subscription?.isActive && (
        <div className="mb-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-green-900 dark:text-green-200">Active Subscription</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100">
                  {subscription.plan}
                </span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Valid through: <strong>{new Date(subscription.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-800/40 px-3 py-1.5 rounded-lg border border-green-300 dark:border-green-700">
            Editing Features Unlocked
          </span>
        </div>
      )}

      {subscription && !subscription.isActive && (
        <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            {/* A university that never subscribed has no expiryDate, and
                new Date(null) is 1 January 1970 — so this banner used to tell a
                brand-new customer their plan "lapsed" fifty-six years ago. The
                two states read differently because they are different. */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-amber-900 dark:text-amber-200">
                  {subscription.expiryDate ? 'Subscription Expired' : 'No active subscription'}
                </span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                {subscription.expiryDate ? (
                  <>
                    Lapsed on:{' '}
                    <strong>
                      {new Date(subscription.expiryDate).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </strong>
                    . Renew below to resume editing.
                  </>
                ) : (
                  <>Choose a plan below to unlock editing.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-4">
          {subscription?.isActive ? 'Renew or Extend Subscription' : 'Choose Your Plan'}
        </h1>
        <p className="text-lg text-light-muted dark:text-dark-muted max-w-2xl mx-auto">
          Get premium visibility, detailed analytics, and direct access to prospective students with our university subscription plans.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Monthly Plan */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-light-border dark:border-dark-border overflow-hidden hover:shadow-md transition-shadow relative flex flex-col">
          <div className="p-8 flex-grow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">Monthly Plan</h3>
              <Clock className="text-light-muted dark:text-dark-muted w-6 h-6" />
            </div>
            
            <div className="mb-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-light-text dark:text-dark-text">{priceLabel('monthly')}</span>
              <span className="text-light-muted dark:text-dark-muted ml-2">/ month</span>
            </div>
            
            <p className="text-light-muted dark:text-dark-muted mb-8">
              Perfect for getting started and trying out premium features.
            </p>
            
            <ul className="space-y-4 mb-8">
              {['Premium University Listing', 'Basic Analytics Dashboard', 'Lead Generation Features', 'Standard Support'].map((feature, i) => (
                <li key={i} className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-light-text dark:text-dark-text">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="p-8 pt-0 mt-auto">
            <button
              onClick={() => handleSubscribe('monthly')}
              disabled={loadingPlan !== null}
              className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-colors
                ${loadingPlan === 'monthly' 
                  ? 'bg-orange-200 dark:bg-orange-900/50 text-orange-500 cursor-not-allowed' 
                  : 'bg-orange-100 dark:bg-orange-900/30 text-primary hover:bg-orange-200 dark:hover:bg-orange-900/50'
                }`}
            >
              {loadingPlan === 'monthly' ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
              ) : (
                'Subscribe Monthly'
              )}
            </button>
          </div>
        </div>

        {/* Yearly Plan */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-md border-2 border-primary overflow-hidden hover:shadow-lg transition-shadow relative flex flex-col">
          <div className="absolute top-0 inset-x-0 h-1 bg-primary"></div>
          
          <div className="absolute top-4 right-4 bg-orange-100 dark:bg-orange-900/40 text-primary text-xs font-bold px-3 py-1 rounded-full flex items-center">
            <Zap className="w-3 h-3 mr-1" /> Best Value (~17% savings)
          </div>

          <div className="p-8 flex-grow">
            <div className="flex justify-between items-center mb-4 mt-2">
              <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">Yearly Plan</h3>
              <Crown className="text-primary w-6 h-6" />
            </div>
            
            <div className="mb-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-light-text dark:text-dark-text">{priceLabel('yearly')}</span>
              <span className="text-light-muted dark:text-dark-muted ml-2">/ year</span>
            </div>
            
            <p className="text-light-muted dark:text-dark-muted mb-8">
              Maximize your reach with complete access for a full year.
            </p>
            
            <ul className="space-y-4 mb-8">
              {['Everything in Monthly Plan', 'Priority Support', 'Advanced Analytics & Insights', 'Featured Placements', 'Unlimited Lead Access'].map((feature, i) => (
                <li key={i} className="flex items-start">
                  <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-light-text dark:text-dark-text">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="p-8 pt-0 mt-auto">
            <button
              onClick={() => handleSubscribe('yearly')}
              disabled={loadingPlan !== null}
              className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-colors
                ${loadingPlan === 'yearly'
                  ? 'bg-orange-400 text-white cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-orange-600'
                }`}
            >
              {loadingPlan === 'yearly' ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
              ) : (
                'Subscribe Yearly'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-center text-sm text-light-muted dark:text-dark-muted bg-gray-50 dark:bg-gray-800/50 py-4 px-6 rounded-lg max-w-2xl mx-auto border border-light-border dark:border-dark-border">
        <Shield className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" />
        <p>Payments are processed securely by Razorpay. We never store your card details.</p>
      </div>
    </div>
  );
};

export default UniversitySubscriptionSection;
