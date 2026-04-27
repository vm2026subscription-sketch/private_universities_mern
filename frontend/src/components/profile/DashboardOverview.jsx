import { LayoutDashboard, Bookmark, BookOpen, Clock, Activity, TrendingUp, TrendingDown, Users, Award, ChevronRight, MapPin, Sparkles, Download, MessageSquare, Target, CheckCircle2, Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function DashboardOverview({ stats = {}, recentlyViewed = [], fullUser = {}, trends = {} }) {
  // Dynamic Score Calculation
  const calculateScore = () => {
    let score = 0;
    if (fullUser?.name) score += 10;
    if (fullUser?.avatar) score += 10;
    if (fullUser?.profile?.city) score += 10;
    if (fullUser?.profile?.targetExam) score += 10;
    if (fullUser?.profile?.stream) score += 10;
    if (fullUser?.savedUniversities?.length > 0) score += 25;
    if (fullUser?.savedCourses?.length > 0) score += 25;
    return score;
  };

  const readinessScore = calculateScore();

  const cards = [
    { label: 'Saved Colleges', value: stats?.savedCollegesCount || 0, icon: Bookmark, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Selected Courses', value: stats?.savedCoursesCount || 0, icon: BookOpen, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { label: 'Recently Viewed', value: stats?.recentCount || 0, icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Profile Strength', value: '85%', icon: Activity, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  ];

  const activityData = [
    { day: 'Mon', views: 12, saves: 2 },
    { day: 'Tue', views: 18, saves: 4 },
    { day: 'Wed', views: 15, saves: 1 },
    { day: 'Thu', views: 25, saves: 5 },
    { day: 'Fri', views: 20, saves: 3 },
    { day: 'Sat', views: 8, saves: 0 },
    { day: 'Sun', views: 10, saves: 1 },
  ];

  const activity = activityData.map(a => ({ day: a.day, count: a.views }));
  const maxActivity = Math.max(...activity.map(a => a.count)) || 1;

  const stateDistribution = fullUser?.savedUniversities?.reduce((acc, curr) => {
    acc[curr.state] = (acc[curr.state] || 0) + 1;
    return acc;
  }, {});
  
  const pieData = Object.entries(stateDistribution || {}).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ['#ff6b00', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Dashboard Overview</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div 
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5 }}
            className={`card p-5 flex items-center gap-4 border-2 ${card.border} group relative overflow-hidden`}
          >
            <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-black">{card.value}</p>
              <p className="text-[10px] text-light-muted uppercase tracking-widest font-bold">{card.label}</p>
            </div>
            <div className="absolute top-0 right-0 p-2 opacity-5">
               <card.icon className="w-12 h-12" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart (CSS Bar Chart) */}
        <div className="card p-6 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Activity Stats</h3>
              <p className="text-xs text-light-muted">Your engagement with universities over the last 7 days</p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 h-48 px-2">
            {activity.map((a, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3">
                <div 
                  className="w-full bg-primary/20 hover:bg-primary transition-all duration-300 rounded-t-xl relative group"
                  style={{ height: `${(a.count / maxActivity) * 100}%` }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-dark-bg text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                    {a.count} views
                  </div>
                </div>
                <span className="text-[10px] text-light-muted font-bold uppercase">{a.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Goal Progress */}
        <div className="card p-6 shadow-sm border-2 border-primary/5 bg-primary/5">
           <h3 className="font-bold mb-4 flex items-center gap-2 text-lg"><Target className="w-5 h-5 text-primary" /> Active Goals</h3>
           <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex justify-between text-xs font-bold uppercase mb-2">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-primary"/> Explore 10 Colleges</span>
                  <span className="text-primary">{recentlyViewed.length}/10</span>
                </div>
                <div className="h-2 w-full bg-light-bg dark:bg-dark-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(255,107,0,0.4)]" style={{ width: `${Math.min(100, (recentlyViewed.length/10)*100)}%` }}></div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <div className="flex justify-between text-xs font-bold uppercase mb-2">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-blue-500"/> Profile Completion</span>
                  <span className="text-blue-500">65%</span>
                </div>
                <div className="h-2 w-full bg-light-bg dark:bg-dark-border rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[65%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.4)]"></div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
                 <Lightbulb className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                 <div>
                   <p className="text-[10px] font-black text-yellow-700 uppercase mb-1">Recommendation</p>
                   <p className="text-[11px] font-bold text-yellow-900 dark:text-yellow-100 leading-tight">Complete your budget preferences to unlock personalized fee estimates.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Analytics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: User Activity */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card p-6"
        >
          <h3 className="font-bold mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-500" /> Weekly Activity</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <RechartsTooltip cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="views" name="Profiles Viewed" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="saves" name="Colleges Saved" fill="#ff6b00" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pie Chart: State Distribution */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="card p-6"
        >
          <h3 className="font-bold mb-6 flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-500" /> Saved by State</h3>
          {pieData.length > 0 ? (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-3xl font-black">{fullUser?.savedUniversities?.length || 0}</span>
                 <span className="text-[10px] font-bold text-light-muted uppercase">Saved</span>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-light-muted border-2 border-dashed rounded-xl">
               <Bookmark className="w-8 h-8 mb-2 opacity-50" />
               <p className="text-sm">Save colleges to see distribution.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Mini Recent List */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">Recently Viewed</h3>
          <Link to="/profile?tab=history" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            View All History <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(recentlyViewed || []).slice(0, 3).map((u, i) => (
            <Link key={i} to={`/universities/${u.slug}`} className="card p-4 flex items-center gap-4 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-dark-border flex items-center justify-center text-primary font-black text-xl shrink-0">
                {u.name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate group-hover:text-primary">{u.name}</p>
                <p className="text-[10px] text-light-muted flex items-center gap-1"><MapPin className="w-3 h-3" />{u.city}, {u.state}</p>
              </div>
            </Link>
          ))}
          {(!recentlyViewed || recentlyViewed.length === 0) && (
            <div className="col-span-full card p-10 text-center border-dashed">
              <Clock className="w-8 h-8 text-light-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm text-light-muted italic">No recently viewed colleges. Start exploring universities to see them here!</p>
            </div>
          )}
        </div>
      </div>
      {/* Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lg:col-span-1 card p-6 border-2 border-indigo-500/10 bg-indigo-500/5"
        >
          <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500" /> Popular Courses</h3>
          <div className="flex flex-wrap gap-2">
            {(trends.trendingCourses || []).map((course, i) => (
              <span key={i} className="px-3 py-1 bg-white dark:bg-dark-card rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                {course._id}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lg:col-span-2 card p-6 border-2 border-primary/10"
        >
          <h3 className="font-bold mb-6 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Popular Universities</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(trends.popularUniversities || []).map((uni, i) => (
              <Link key={i} to={`/universities/${uni.slug}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white dark:hover:bg-dark-card transition-all group border border-transparent hover:border-primary/10">
                 <div className="w-10 h-10 rounded-lg bg-light-bg dark:bg-dark-border flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                   {uni.name?.charAt(0)}
                 </div>
                 <div className="min-w-0">
                    <p className="text-xs font-bold truncate group-hover:text-primary">{uni.name}</p>
                    <p className="text-[10px] text-light-muted flex items-center gap-1"><MapPin className="w-3 h-3" /> {uni.city}</p>
                 </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
