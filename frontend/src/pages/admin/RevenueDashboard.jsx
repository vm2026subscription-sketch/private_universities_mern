import { BarChart3 } from 'lucide-react';

/**
 * Placeholder until the payment module lands.
 *
 * This page reported ₹34,80,000 in total revenue, ₹2,90,000 MRR, 48 active paid
 * subscriptions, +24.5% growth and a table of Razorpay transactions — all
 * invented. No payment provider is connected and no subscription record exists,
 * so every figure was a literal in the source. An admin has no way to tell a
 * hardcoded number from a queried one, and revenue is precisely the figure that
 * gets repeated to investors and boards.
 *
 * An empty state is honest. A fabricated one is a false financial statement with
 * a chart next to it.
 */
export default function RevenueDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-light-text dark:text-dark-text">Revenue</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted mt-1">
          Subscription income across university accounts.
        </p>
      </div>

      <div className="p-10 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-center">
        <div className="w-11 h-11 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border flex items-center justify-center mx-auto">
          <BarChart3 className="w-5 h-5 text-light-muted dark:text-dark-muted" />
        </div>

        <h2 className="font-semibold text-light-text dark:text-dark-text mt-4">No revenue data yet</h2>

        <p className="text-sm text-light-muted dark:text-dark-muted mt-2 max-w-md mx-auto leading-relaxed">
          Payments are not connected yet. Once subscriptions go live, this page will show real
          figures — totals, monthly income, and active versus expired accounts.
        </p>
      </div>
    </div>
  );
}
