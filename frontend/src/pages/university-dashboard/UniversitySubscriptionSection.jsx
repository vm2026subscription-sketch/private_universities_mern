import { CreditCard, Mail } from 'lucide-react';

/**
 * Placeholder until the payment module lands.
 *
 * This page previously advertised three tiers — ₹25,000, a "Gold Partner
 * (Popular)" at ₹45,000, and ₹85,000 — with feature lists and working-looking
 * buttons. None of it was real: no subscription exists in the data model, no
 * payment provider is wired, and the figures did not match the intended pricing
 * either. A university reading this would have taken those numbers into a budget
 * conversation, and the promised features ("Top 3 Search Placement", "Hero
 * Banner Showcase Ads") into an expectation.
 *
 * Saying plainly that plans are not live costs nothing. Inventing a price list
 * costs trust the first time someone asks about it.
 */
export default function UniversitySubscriptionSection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-light-text dark:text-dark-text">Subscription</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted mt-1">
          Billing for university accounts.
        </p>
      </div>

      <div className="p-8 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-center max-w-xl">
        <div className="w-11 h-11 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border flex items-center justify-center mx-auto">
          <CreditCard className="w-5 h-5 text-light-muted dark:text-dark-muted" />
        </div>

        <h2 className="font-semibold text-light-text dark:text-dark-text mt-4">
          Plans are not live yet
        </h2>

        <p className="text-sm text-light-muted dark:text-dark-muted mt-2 leading-relaxed">
          Your dashboard is fully usable in the meantime — edit your profile, courses, gallery and
          placements as normal. Nothing is charged, and we will email you well before that changes.
        </p>

        <div className="mt-6 pt-5 border-t border-light-border dark:border-dark-border">
          <p className="text-xs text-light-muted dark:text-dark-muted flex items-center justify-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            Questions about pricing? Write to us and we will get back to you.
          </p>
        </div>
      </div>
    </div>
  );
}
