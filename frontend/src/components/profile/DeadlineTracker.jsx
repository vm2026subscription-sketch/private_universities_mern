import React from 'react';
import { Calendar, Clock, AlertCircle, ChevronRight, MapPin, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function DeadlineTracker({ universities = [] }) {
  const universitiesWithDeadlines = universities
    .filter(u => u.admissions?.applicationEndDate)
    .sort((a, b) => new Date(a.admissions.applicationEndDate) - new Date(b.admissions.applicationEndDate));

  const isExpired = (date) => new Date(date) < new Date();
  const isUrgent = (date) => {
    const diffTime = new Date(date) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">Admission Deadlines</h2>
        <div className="flex gap-2">
           <div className="flex items-center gap-1 text-[10px] font-black text-orange-500 uppercase bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md">
              <AlertCircle className="w-3 h-3" /> Urgent
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {universitiesWithDeadlines.map((uni, i) => {
          const deadline = new Date(uni.admissions.applicationEndDate);
          const expired = isExpired(deadline);
          const urgent = isUrgent(deadline);

          return (
            <motion.div 
              key={uni._id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`card p-6 border-l-4 ${expired ? 'border-red-500' : urgent ? 'border-orange-500' : 'border-blue-500'} group`}
            >
              <div className="flex items-start justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-light-bg dark:bg-dark-border flex items-center justify-center text-primary font-bold shadow-sm">
                       {uni.name?.charAt(0)}
                    </div>
                    <div>
                       <h3 className="font-bold text-sm line-clamp-1">{uni.name}</h3>
                       <p className="text-[10px] text-light-muted flex items-center gap-1 font-bold">
                         <MapPin className="w-3 h-3" /> {uni.city}
                       </p>
                    </div>
                 </div>
                 <Link to={`/universities/${uni.slug}`} className="p-2 hover:bg-light-bg dark:hover:bg-dark-border rounded-full transition-colors text-light-muted hover:text-primary">
                    <ExternalLink className="w-4 h-4" />
                 </Link>
              </div>

              <div className={`p-4 rounded-2xl ${expired ? 'bg-red-50 dark:bg-red-900/10' : urgent ? 'bg-orange-50 dark:bg-orange-900/10' : 'bg-blue-50 dark:bg-blue-900/10'} mb-4`}>
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-light-muted">Application Ends</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${expired ? 'text-red-600' : urgent ? 'text-orange-600' : 'text-blue-600'}`}>
                       {expired ? 'Expired' : urgent ? 'Closing Soon' : 'Active'}
                    </span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${expired ? 'text-red-500' : urgent ? 'text-orange-500' : 'text-blue-500'}`} />
                    <span className="text-lg font-black">{deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                 </div>
              </div>

              <div className="flex items-center justify-between">
                 <div className="text-[10px] font-bold text-light-muted">
                    {expired ? 'Deadline passed' : `${Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))} days left`}
                 </div>
                 {!expired && (
                    <button className="text-xs font-black text-primary flex items-center gap-1 hover:underline">
                       Apply Now <ChevronRight className="w-3 h-3" />
                    </button>
                 )}
              </div>
            </motion.div>
          );
        })}

        {universitiesWithDeadlines.length === 0 && (
          <div className="col-span-full card p-20 text-center border-dashed">
            <Calendar className="w-12 h-12 text-light-muted mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">No Upcoming Deadlines</h3>
            <p className="text-sm text-light-muted max-w-sm mx-auto">
              We couldn't find any specific deadlines for your saved colleges. Check back later or explore more universities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
