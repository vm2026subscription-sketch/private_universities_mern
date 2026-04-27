import { Link } from 'react-router-dom';
import { MapPin, Bookmark, Lightbulb, ExternalLink, Sparkles } from 'lucide-react';
import { calculateFitScore } from '../../utils/fitScore';

export default function Recommendations({ recommendations, onSave, userPrefs }) {
  if (!userPrefs?.preferredStates?.length && !userPrefs?.collegeType) {
    return (
      <div className="card p-12 text-center">
        <Lightbulb className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
        <h3 className="font-bold text-lg mb-2">Set Your Preferences First</h3>
        <p className="text-light-muted text-sm">Go to the Preferences tab and fill in your preferred state and college type to get smart recommendations.</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Lightbulb className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
        <p className="text-light-muted">No new recommendations — you've already saved all matching colleges!</p>
      </div>
    );
  }

  // Sort recommendations by fit score
  const sortedRecs = [...recommendations].sort((a, b) => {
    return calculateFitScore(b, userPrefs) - calculateFitScore(a, userPrefs);
  });

  const getReason = (uni) => {
    const reasons = [];
    if (userPrefs.preferredStates?.includes(uni.state)) reasons.push('Location Match');
    if (userPrefs.collegeType && userPrefs.collegeType !== 'both' && uni.type === userPrefs.collegeType) reasons.push('Type Match');
    if (userPrefs.budgetMax && uni.courses?.[0]?.feesPerYear <= userPrefs.budgetMax) reasons.push('Within Budget');
    return reasons.join(' • ') || 'Based on your profile';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-5 h-5 text-yellow-400" />
        <h2 className="text-xl font-bold">Recommended for you</h2>
        <span className="badge badge-orange">{recommendations.length} found</span>
      </div>
      <p className="text-sm text-light-muted">Handpicked selections based on your preferences, courses, and location.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedRecs.map(u => {
          const score = calculateFitScore(u, userPrefs);
          return (
          <div key={u._id} className="card p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 relative overflow-hidden">
            {score > 60 && (
              <div className="absolute top-0 right-0 bg-yellow-400/10 text-yellow-600 text-[10px] font-black px-3 py-1 rounded-bl-xl border-b border-l border-yellow-400/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3"/> TOP MATCH
              </div>
            )}
            <div className="flex items-start gap-3 mb-3 mt-2">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-dark-border flex items-center justify-center text-primary font-bold shrink-0">
                {u.name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm line-clamp-2">{u.name}</p>
                <p className="text-xs text-light-muted flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{u.city}, {u.state}
                </p>
              </div>
            </div>
            
            <div className="bg-light-bg dark:bg-dark-border/30 rounded-lg p-2 mb-3">
              <p className="text-[10px] font-medium text-light-muted flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-yellow-500" /> {getReason(u)}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="badge badge-orange capitalize text-[10px]">{u.type}</span>
              {u.naacGrade && <span className="badge badge-green text-[10px]">NAAC {u.naacGrade}</span>}
              {u.nirfRank && <span className="badge badge-blue text-[10px]">NIRF #{u.nirfRank}</span>}
              {u.stats?.avgPackageLPA && <span className="badge bg-purple-50 text-purple-700 text-[10px]">₹{u.stats.avgPackageLPA} LPA</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => onSave(u)}
                className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1 flex-1 justify-center">
                <Bookmark className="w-3 h-3" /> Save
              </button>
              <Link to={`/universities/${u.slug}`}
                className="btn-outline !py-1.5 !px-3 text-xs flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )})}
      </div>

    </div>
  );
}
