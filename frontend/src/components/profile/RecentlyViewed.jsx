import { Clock, MapPin, ExternalLink, Trash2, LayoutDashboard, Bookmark, BookOpen, Activity, TrendingUp, TrendingDown, Users, Award, ChevronRight, Sparkles, Download, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function RecentlyViewed({ items = [], onClear }) {
  if (items.length === 0) return (
    <div className="card p-12 text-center">
      <Clock className="w-12 h-12 text-light-muted mx-auto mb-4 opacity-20" />
      <p className="text-light-muted">Your browsing history is empty. Start exploring universities!</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Browsing History</h2>
        <button 
          onClick={onClear}
          className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Clear History
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((u, i) => (
          <motion.div 
            key={i} 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="card p-6 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Clock className="w-20 h-20" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-dark-border flex items-center justify-center text-primary font-black text-2xl mb-4 group-hover:scale-110 transition-transform border border-primary/10">
              {u.name?.charAt(0)}
            </div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">{u.name}</h3>
            <p className="text-sm text-light-muted flex items-center gap-1 mb-6">
              <MapPin className="w-4 h-4 text-primary" /> {u.city}, {u.state}
            </p>
            <div className="flex gap-2">
              <Link to={`/universities/${u.slug}`} className="btn-primary !py-2.5 flex-1 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <ExternalLink className="w-3 h-3" /> Revisit Profile
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
