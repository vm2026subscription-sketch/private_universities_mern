import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import api from '../../utils/api';
import {
  Eye, Users, BookOpen, GraduationCap, Award, CreditCard,
  ArrowUpRight, CheckCircle2, AlertCircle, Sparkles, TrendingUp,
  FileCheck, ShieldCheck
} from 'lucide-react';

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
   * Every figure below previously had an invented fallback — profile views
   * derived from student count, "384 leads", a 92% completion score. They looked
   * like measurements, so a university would have quoted them upward. A dash is
   * unmistakably "we don't have this yet".
   */
  const dash = (value) => (value === null || value === undefined ? '—' : value);

  const stats = {
    name: data?.university?.name || uni?.name || 'Your University',
    profileViews: data?.profileViews ?? null,
    totalLeads: data?.leads?.total ?? null,
    applyLeads: data?.leads?.apply ?? 0,
    brochureLeads: data?.leads?.brochure ?? 0,
    activeCourses: data?.courses ?? null,
    placementRate: data?.placement?.placementPercentage ?? null,
    highestPackage: data?.placement?.highestPackageLPA,
    completionRate: data?.completeness?.percent ?? 0,
    missing: data?.completeness?.missing || [],
    completed: data?.completeness?.completed ?? 0,
    totalChecks: data?.completeness?.total ?? 0,
    pendingReview: data?.pendingReview || [],
  };

  return (
    <div className="space-y-8">
      {/* Banner Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-blue-700 to-indigo-800 text-white p-6 md:p-8 shadow-xl shadow-primary/10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Premium University Partner
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome to {stats.name} Dashboard!
          </h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Your university profile is live and actively attracting prospective students. Update your latest courses, placement stats, and gallery images to boost student applications.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/university/dashboard/profile"
              className="px-4 py-2.5 rounded-xl bg-white text-primary font-bold text-xs hover:bg-white/90 transition-all shadow-md flex items-center gap-2"
            >
              Complete Profile <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              to="/university/dashboard/subscription"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold text-xs transition-all border border-white/20 flex items-center gap-2"
            >
              View Plan Details
            </Link>
          </div>
        </div>

        {/* Decorative background vectors */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-20 top-0 w-48 h-48 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Profile Views</p>
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">
              {loading ? '…' : dash(stats.profileViews?.toLocaleString())}
            </h3>
            {/* No trend line: nothing records a per-month baseline yet, and an
                invented "+18%" is the kind of number that ends up in a board
                deck. */}
            <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Since listing</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Eye className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Student Leads</p>
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">
              {loading ? '…' : dash(stats.totalLeads)}
            </h3>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
              {stats.applyLeads} applications · {stats.brochureLeads} brochures
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Active Courses</p>
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">
              {loading ? '…' : dash(stats.activeCourses)}
            </h3>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Listed on your page</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Placement %</p>
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">
              {loading ? '…' : stats.placementRate === null ? 'Not set' : `${stats.placementRate}%`}
            </h3>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
              {stats.highestPackage ? `Highest: ₹${stats.highestPackage} LPA` : 'Add your placement data'}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Completeness & Quick Shortcuts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Strength Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-light-text dark:text-dark-text flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" /> Profile Completion Status
                </h3>
                <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5">Comprehensive profiles receive 4x more student inquiries</p>
              </div>
              <span className="text-lg font-extrabold text-primary">{stats.completionRate}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-light-bg dark:bg-dark-bg rounded-full h-3 overflow-hidden border border-light-border dark:border-dark-border p-0.5">
              <div
                className="bg-gradient-to-r from-primary to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>

            {/* Driven by what is actually filled in. The previous version listed
                three green ticks and one amber warning regardless of the
                university's real state, so it congratulated an empty profile. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {loading ? (
                <p className="text-xs text-light-muted">Checking your profile…</p>
              ) : stats.missing.length === 0 ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl sm:col-span-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Everything is filled in — {stats.completed} of {stats.totalChecks} sections complete
                </div>
              ) : (
                stats.missing.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" /> Add {item}
                  </div>
                ))
              )}
            </div>

            {stats.pendingReview.length > 0 && (
              <div className="flex items-start gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 p-3 rounded-xl">
                <FileCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {stats.pendingReview.length} change(s) awaiting our team's verification before they
                  appear publicly.
                </span>
              </div>
            )}
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Link
              to="/university/dashboard/profile"
              className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm hover:border-primary transition-all hover:-translate-y-1 group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
                <FileCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-light-text dark:text-dark-text">Edit About & Info</h4>
              <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Vision, mission, address & logo</p>
            </Link>

            <Link
              to="/university/dashboard/courses"
              className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm hover:border-primary transition-all hover:-translate-y-1 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-light-text dark:text-dark-text">Manage Courses</h4>
              <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Add, edit fees & seat intake</p>
            </Link>

            <Link
              to="/university/dashboard/gallery"
              className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm hover:border-primary transition-all hover:-translate-y-1 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-light-text dark:text-dark-text">Upload Gallery</h4>
              <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Showcase campus infrastructure</p>
            </Link>
          </div>
        </div>

        {/* Sidebar Status Card */}
        <div className="space-y-6">
          {/* Subscription Widget Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Subscription</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-light-bg dark:bg-dark-bg text-light-muted border border-light-border dark:border-dark-border">
                Coming soon
              </span>
            </div>

            {/* Subscriptions are not built yet. Showing "Gold Partner · Active ·
                142 days remaining · Top 3 Search Rank" described a product that
                does not exist and a plan nobody has paid for. */}
            <p className="text-xs text-light-muted dark:text-dark-muted leading-relaxed">
              Subscription plans are not live yet. Your profile stays fully editable in the meantime —
              we will email you before anything changes.
            </p>

            <Link
              to="/university/dashboard/subscription"
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              <CreditCard className="w-4 h-4" /> Manage Subscription & Renew
            </Link>
          </div>

          {/* Quick Notice Widget */}
          <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">Admissions 2026 Open</h4>
            <p className="text-xs text-light-muted dark:text-dark-muted leading-relaxed">
              Verify your entrance exam criteria and seat quotas before the upcoming admission round start.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
