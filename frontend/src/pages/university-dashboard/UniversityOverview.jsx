import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Eye, Users, BookOpen, GraduationCap, ArrowRight,
  CheckCircle2, AlertCircle, FileCheck, Images, Award,
} from 'lucide-react';
import api from '../../utils/api';

/**
 * Dashboard overview.
 *
 * Restrained on purpose. The previous version led with a three-colour gradient
 * banner, a "Premium University Partner" badge and four differently tinted stat
 * tiles, which made every element compete for attention and left the numbers —
 * the only reason to open this page — no louder than the decoration. Structure
 * and type carry the hierarchy here; colour is reserved for the two places it
 * means something: progress, and something needing action.
 */
export default function UniversityOverview() {
  const context = useOutletContext();
  const uni = context?.uni;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: payload } = await api.get('/university-portal/my-university/overview');
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /**
   * Placeholders are dashes, never numbers.
   *
   * Every figure here previously had an invented fallback — views derived from
   * student count, "384 leads", a 92% completion score. They looked like
   * measurements, so a university would have quoted them upward. A dash is
   * unmistakably "we don't have this yet".
   */
  const dash = (value) => (value === null || value === undefined ? '—' : value);

  const name = data?.university?.name || uni?.name || 'Your University';
  const completeness = data?.completeness;
  const missing = completeness?.missing || [];
  const pendingReview = data?.pendingReview || [];

  const cards = [
    {
      label: 'Profile views',
      value: loading ? '…' : dash(data?.profileViews?.toLocaleString()),
      // No trend line: nothing records a per-month baseline, and an invented
      // "+18% this month" is the kind of number that ends up in a board deck.
      hint: 'Since listing',
      icon: Eye,
    },
    {
      label: 'Student leads',
      value: loading ? '…' : dash(data?.leads?.total),
      hint: `${data?.leads?.apply ?? 0} applications · ${data?.leads?.brochure ?? 0} brochures`,
      icon: Users,
    },
    {
      label: 'Courses',
      value: loading ? '…' : dash(data?.courses),
      hint: 'Listed on your page',
      icon: BookOpen,
    },
    {
      label: 'Placement rate',
      value: loading
        ? '…'
        : data?.placement?.placementPercentage === null || data?.placement?.placementPercentage === undefined
        ? 'Not set'
        : `${data.placement.placementPercentage}%`,
      hint: data?.placement?.highestPackageLPA
        ? `Highest ₹${data.placement.highestPackageLPA} LPA`
        : 'Add your placement data',
      icon: GraduationCap,
    },
  ];

  const shortcuts = [
    { to: 'profile', icon: FileCheck, title: 'Profile & info', desc: 'About, vision, contact details' },
    { to: 'courses', icon: BookOpen, title: 'Courses', desc: 'Fees, seats and eligibility' },
    { to: 'gallery', icon: Images, title: 'Photo gallery', desc: 'Campus, labs and hostels' },
    { to: 'placement', icon: Award, title: 'Placements', desc: 'Packages and recruiters' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-light-text dark:text-dark-text">{name}</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted mt-1">
          Keep your profile current — students see these details on your public page.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, hint, icon: Icon }) => (
          <div
            key={label}
            className="p-5 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-light-muted dark:text-dark-muted">
                {label}
              </p>
              {/* One neutral treatment for all four. Four different tints made
                  the icons read as categories that do not exist. */}
              <Icon className="w-4 h-4 text-light-muted dark:text-dark-muted shrink-0" />
            </div>
            <p className="text-2xl font-bold text-light-text dark:text-dark-text mt-3 tabular-nums">
              {value}
            </p>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-1">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completeness */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-semibold text-light-text dark:text-dark-text">Profile completion</h2>
              <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5">
                {completeness ? `${completeness.completed} of ${completeness.total} sections filled` : ' '}
              </p>
            </div>
            <span className="text-2xl font-bold text-light-text dark:text-dark-text tabular-nums">
              {loading ? '…' : `${completeness?.percent ?? 0}%`}
            </span>
          </div>

          <div className="w-full bg-light-bg dark:bg-dark-bg rounded-full h-1.5 overflow-hidden mt-4">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${completeness?.percent ?? 0}%` }}
            />
          </div>

          {/* Driven by what is actually filled in. This previously showed three
              green ticks and one amber warning regardless of state, so it
              congratulated an empty profile on its gallery and placements. */}
          <div className="mt-5">
            {loading ? (
              <p className="text-sm text-light-muted">Checking your profile…</p>
            ) : missing.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Everything is filled in.
              </p>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-light-muted dark:text-dark-muted mb-3">
                  Still missing
                </p>
                <div className="flex flex-wrap gap-2">
                  {missing.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {pendingReview.length > 0 && (
            <div className="mt-5 pt-4 border-t border-light-border dark:border-dark-border">
              <p className="flex items-start gap-2 text-sm text-light-muted dark:text-dark-muted">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  {pendingReview.length} change{pendingReview.length > 1 ? 's are' : ' is'} awaiting
                  verification before appearing publicly.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="p-6 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
          <h2 className="font-semibold text-light-text dark:text-dark-text">Subscription</h2>

          {/* Subscriptions are not built yet. Showing "Gold Partner · Active ·
              142 days remaining · Top 3 Search Rank" described a product that
              does not exist and a plan nobody has paid for. */}
          <p className="text-sm text-light-muted dark:text-dark-muted mt-2 leading-relaxed">
            Plans are not live yet. Your profile stays fully editable in the meantime — we will email
            you before anything changes.
          </p>
        </div>
      </div>

      {/* Shortcuts */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-light-muted dark:text-dark-muted mb-3">
          Manage
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {shortcuts.map(({ to, icon: Icon, title, desc }) => (
            <Link
              key={to}
              to={`/university/dashboard/${to}`}
              className="group p-5 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border hover:border-primary transition-colors"
            >
              <Icon className="w-5 h-5 text-light-muted dark:text-dark-muted group-hover:text-primary transition-colors" />
              <h3 className="font-semibold text-sm text-light-text dark:text-dark-text mt-3">{title}</h3>
              <p className="text-xs text-light-muted dark:text-dark-muted mt-1">{desc}</p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
