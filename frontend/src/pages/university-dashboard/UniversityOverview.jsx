import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Eye, Users, BookOpen, GraduationCap, Award, CreditCard,
  ArrowUpRight, CheckCircle2, AlertCircle, Sparkles, TrendingUp,
  FileCheck, ShieldCheck
} from 'lucide-react';

export default function UniversityOverview() {
  const location = useLocation();
  const uni = location.state?.university;

  const [stats] = useState({
    name: uni?.name || 'Apex Technical University',
    profileViews: uni?.stats?.totalStudents ? Number(uni.stats.totalStudents) * 3 : 14280,
    totalLeads: uni?.stats?.totalStudents ? Math.round(Number(uni.stats.totalStudents) / 10) : 384,
    activeCourses: uni?.courses?.length || 28,
    placementRate: uni?.stats?.placementPercentage || 94.5,
    highestPackage: uni?.stats?.highestPackageLPA ? `₹${uni.stats.highestPackageLPA} LPA` : '₹48 LPA',
    averagePackage: uni?.stats?.avgPackageLPA ? `₹${uni.stats.avgPackageLPA} LPA` : '₹8.8 LPA',
    completionRate: uni ? 92 : 85,
    subscriptionPlan: uni?.sponsorTier && uni.sponsorTier !== 'none' ? `${uni.sponsorTier.toUpperCase()} Partner` : 'Gold Partner',
    daysRemaining: 142
  });

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
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">{stats.profileViews.toLocaleString()}</h3>
            <p className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +18% this month
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Eye className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Student Leads</p>
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">{stats.totalLeads}</h3>
            <p className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12 new today
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Active Courses</p>
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">{stats.activeCourses}</h3>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Across 6 departments</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Placement %</p>
            <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text mt-1">{stats.placementRate}%</h3>
            <p className="text-xs text-amber-500 font-semibold mt-1">Highest: {stats.highestPackage}</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Campus Photos & Gallery Uploaded
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Courses & Fees Details Updated
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Placement Records Added
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" /> Add Active Scholarships (Pending)
              </div>
            </div>
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
              <span className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Active Subscription</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {stats.subscriptionPlan}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-light-muted dark:text-dark-muted">Plan Status:</span>
                <span className="font-bold text-emerald-500">Active</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-light-muted dark:text-dark-muted">Days Remaining:</span>
                <span className="font-bold text-light-text dark:text-dark-text">{stats.daysRemaining} days</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-light-muted dark:text-dark-muted">Listing Priority:</span>
                <span className="font-bold text-primary">Top 3 Search Rank</span>
              </div>
            </div>

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
