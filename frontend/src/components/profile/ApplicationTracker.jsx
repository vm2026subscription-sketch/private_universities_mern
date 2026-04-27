import React, { useState } from 'react';
import { Briefcase, Clock, CheckCircle, XCircle, ChevronRight, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function ApplicationTracker({ applications = [], onUpdateStatus }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'applied': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted': return CheckCircle;
      case 'rejected': return XCircle;
      case 'applied': return Briefcase;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">Application Tracker</h2>
        <div className="badge badge-orange">{applications.length} Active Apps</div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {applications.map((app, i) => {
          const StatusIcon = getStatusIcon(app.status);
          const uni = app.universityId || {};

          return (
            <motion.div 
              key={app._id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="card p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-primary/30"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-dark-border flex items-center justify-center text-primary font-black text-2xl shrink-0 group-hover:scale-110 transition-transform">
                {uni.name?.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-lg truncate">{uni.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(app.status)}`}>
                    {app.status}
                  </span>
                </div>
                <p className="text-sm text-light-muted flex items-center gap-1 mb-4">
                  <MapPin className="w-3 h-3" /> {uni.city}, {uni.state}
                </p>
                <div className="flex flex-wrap gap-4">
                   <div className="flex items-center gap-1.5 text-xs font-bold text-light-muted">
                      <Calendar className="w-3 h-3" />
                      Applied: {new Date(app.appliedDate).toLocaleDateString()}
                   </div>
                   {uni.admissions?.applicationEndDate && (
                     <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500">
                        <Clock className="w-3 h-3" />
                        Deadline: {new Date(uni.admissions.applicationEndDate).toLocaleDateString()}
                     </div>
                   )}
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <select 
                  value={app.status}
                  onChange={(e) => onUpdateStatus(app._id, e.target.value)}
                  className="input-field !py-2 !px-3 text-xs font-bold !w-auto"
                >
                  <option value="pending">Pending</option>
                  <option value="applied">Applied</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
                <Link to={`/universities/${uni.slug}`} className="btn-primary !p-3 rounded-xl flex items-center justify-center">
                   <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          );
        })}

        {applications.length === 0 && (
          <div className="card p-20 text-center border-dashed">
            <Briefcase className="w-12 h-12 text-light-muted mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">No Applications Tracked</h3>
            <p className="text-sm text-light-muted max-w-sm mx-auto">
              Start applying to universities and track your progress here. You can mark colleges as "Applied", "Accepted", or "Rejected".
            </p>
            <Link to="/universities" className="btn-primary mt-6 inline-block">Explore Universities</Link>
          </div>
        )}
      </div>
    </div>
  );
}
