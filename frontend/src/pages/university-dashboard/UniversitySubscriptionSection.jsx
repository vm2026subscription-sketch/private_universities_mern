import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Check, Shield, Clock, Zap,
  AlertCircle, CheckCircle2, Loader2,
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

const ACCENT = '#ff7a00';

const planCardBase =
  'bg-white dark:bg-dark-card rounded-2xl border border-light-border dark:border-dark-border ' +
  'shadow-card flex flex-col overflow-hidden ' +
  'transition-all duration-200 ease-in-out ' +
  'hover:-translate-y-1 hover:shadow-card-hover';

const planCardActive = 'ring-2 ring-[#ff7a00]/30 shadow-card-hover -translate-y-1';

const MONTHLY_FEATURES = [
  'Premium University Listing',
  'Basic Analytics Dashboard',
  'Lead Generation Features',
  'Standard Support',
];

const YEARLY_FEATURES = [
  'Everything in Monthly Plan',
  'Priority Support',
  'Advanced Analytics & Insights',
  'Featured Placements',
  'Unlimited Lead Access',
];

const UniversitySubscriptionSection = () => {
  const { uni, subscription, loading: uniLoading, refreshUni } = useOutletContext();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [paymentState, setPaymentState] = useState('idle'); // idle, processing, success
  const [billingView, setBillingView] = useState('yearly');

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

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2">
          {subscription?.isActive ? 'Renew or Extend Subscription' : 'Choose Your Plan'}
        </h1>
        <p className="text-base text-light-muted dark:text-dark-muted max-w-2xl mx-auto">
          Get premium visibility, detailed analytics, and direct access to prospective students with our university subscription plans.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-10">
        <div
          className="inline-flex p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-light-border dark:border-dark-border"
          role="group"
          aria-label="Billing period"
        >
          <button
            type="button"
            onClick={() => setBillingView('monthly')}
            className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              billingView === 'monthly'
                ? 'bg-white dark:bg-dark-card text-[#ff7a00] shadow-sm'
                : 'text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingView('yearly')}
            className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              billingView === 'yearly'
                ? 'bg-white dark:bg-dark-card text-[#ff7a00] shadow-sm'
                : 'text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto items-stretch">
        {/* Monthly Plan — STANDARD */}
        <div
          id="plan-monthly"
          className={`${planCardBase} ${billingView === 'monthly' ? planCardActive : ''}`}
        >
          <div className="p-8 flex flex-col flex-grow">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold tracking-widest text-light-muted dark:text-dark-muted uppercase">
                Standard
              </span>
              <Clock className="w-5 h-5 text-light-muted dark:text-dark-muted" aria-hidden="true" />
            </div>

            <div className="mb-2 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-light-text dark:text-dark-text">
                {priceLabel('monthly')}
              </span>
              <span className="text-light-muted dark:text-dark-muted text-sm">/month</span>
            </div>

            <p className="text-sm text-light-muted dark:text-dark-muted mb-8">
              Perfect for getting started and trying out premium features.
            </p>

            <ul className="space-y-3.5 flex-grow mb-8">
              {MONTHLY_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-[#ff7a00] mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-light-text dark:text-dark-text">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => handleSubscribe('monthly')}
              disabled={loadingPlan !== null}
              className={`w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center transition-colors duration-200 ${
                loadingPlan === 'monthly'
                  ? 'bg-[#ff7a00]/60 text-white cursor-not-allowed'
                  : 'bg-[#ff7a00] text-white hover:bg-[#e66e00]'
              }`}
            >
              {loadingPlan === 'monthly' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Subscribe Monthly'
              )}
            </button>
          </div>
        </div>

        {/* Yearly Plan — ANNUAL PARTNER */}
        <div
          id="plan-yearly"
          className={`${planCardBase} ${billingView === 'yearly' ? planCardActive : ''}`}
        >
          <div
            className="px-4 py-2.5 flex items-center justify-center"
            style={{ backgroundColor: ACCENT }}
          >
            <span className="text-[11px] sm:text-xs font-bold text-white tracking-wide uppercase text-center">
              Recommended • Best Value (~17% Savings)
            </span>
          </div>

          <div className="p-8 flex flex-col flex-grow">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold tracking-widest text-[#ff7a00] uppercase">
                Annual Partner
              </span>
              <Zap className="w-5 h-5 text-[#ff7a00]" aria-hidden="true" />
            </div>

            <div className="mb-2 flex items-baseline gap-2 flex-wrap">
              <span className="text-4xl font-extrabold text-light-text dark:text-dark-text">
                {priceLabel('yearly')}
              </span>
              <span className="text-light-muted dark:text-dark-muted text-sm">/year</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ff7a00]/10 text-[#ff7a00] border border-[#ff7a00]/20">
                Save ₹2,000/yr
              </span>
            </div>

            <p className="text-sm text-light-muted dark:text-dark-muted mb-8">
              Maximize your reach with complete access for a full year.
            </p>

            <ul className="space-y-3.5 flex-grow mb-8">
              {YEARLY_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-[#ff7a00] mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-light-text dark:text-dark-text">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => handleSubscribe('yearly')}
              disabled={loadingPlan !== null}
              className={`w-full py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center transition-colors duration-200 ${
                loadingPlan === 'yearly'
                  ? 'bg-[#ff7a00]/60 text-white cursor-not-allowed'
                  : 'bg-[#ff7a00] text-white hover:bg-[#e66e00]'
              }`}
            >
              {loadingPlan === 'yearly' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Subscribe Yearly'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center text-sm text-light-muted dark:text-dark-muted bg-gray-50 dark:bg-gray-800/50 py-3.5 px-5 rounded-lg max-w-2xl mx-auto border border-light-border dark:border-dark-border">
        <Shield className="w-4 h-4 mr-2.5 text-green-500 flex-shrink-0" />
        <p>Payments are processed securely by Razorpay. We never store your card details.</p>
      </div>
    </div>
  );
};

export default UniversitySubscriptionSection;
