import { CreditCard } from 'lucide-react';

/**
 * Placeholder until the payment module lands.
 *
 * This listed five universities on Silver/Gold/Platinum plans with amounts and
 * expiry dates, and offered working-looking controls to extend or change a tier.
 * None of it existed: there is no Subscription model, no payment provider, and
 * the tiers themselves were invented. Acting on a fabricated row would have felt
 * like administering real accounts while changing nothing.
 *
 * When Person B's module lands, this page queries it.
 */
export default function SubscriptionsManager() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-light-text dark:text-dark-text">Subscriptions</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted mt-1">
          University plans, renewals and expiry.
        </p>
      </div>

      <div className="p-10 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-center">
        <div className="w-11 h-11 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border flex items-center justify-center mx-auto">
          <CreditCard className="w-5 h-5 text-light-muted dark:text-dark-muted" />
        </div>

        <h2 className="font-semibold text-light-text dark:text-dark-text mt-4">No subscriptions yet</h2>

        <p className="text-sm text-light-muted dark:text-dark-muted mt-2 max-w-md mx-auto leading-relaxed">
          Plans are not live yet. Universities can use their dashboards in full in the meantime —
          nothing is gated and nothing is charged.
        </p>
      </div>
    </div>
  );
}
