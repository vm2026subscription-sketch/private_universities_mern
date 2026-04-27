import { GitCompare, X, MapPin, Award, Building, Users, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CompareView({ compareList, onRemove }) {
  if (compareList.length === 0) return (
    <div className="card p-12 text-center">
      <GitCompare className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
      <h3 className="font-bold text-lg mb-2">Comparison List is Empty</h3>
      <p className="text-light-muted text-sm mb-4">Select up to 3 colleges from your "Saved Colleges" tab to compare them side-by-side.</p>
    </div>
  );

  const features = [
    { label: 'Location', formatter: (u) => `${u.city}, ${u.state}`, type: 'text' },
    { label: 'Type', formatter: (u) => <span className="badge badge-orange capitalize">{u.type}</span>, type: 'text' },
    { 
      label: 'NAAC Grade', 
      formatter: (u) => u.naacGrade ? <span className="badge badge-green">{u.naacGrade}</span> : 'N/A', 
      type: 'text' 
    },
    { 
      label: 'NIRF Rank', 
      formatter: (u) => u.nirfRank ? <span className="badge badge-blue">#{u.nirfRank}</span> : 'N/A', 
      type: 'number', 
      getValue: u => u.nirfRank || 9999, 
      highIsBetter: false 
    },
    { 
      label: 'Avg Package', 
      formatter: (u) => u.stats?.avgPackageLPA ? `₹${u.stats.avgPackageLPA} LPA` : 'N/A', 
      type: 'number', 
      getValue: u => u.stats?.avgPackageLPA || 0, 
      highIsBetter: true 
    },
    { 
      label: 'Campus Size', 
      formatter: (u) => u.stats?.campusSizeAcres ? `${u.stats.campusSizeAcres} Acres` : 'N/A', 
      type: 'number', 
      getValue: u => u.stats?.campusSizeAcres || 0, 
      highIsBetter: true 
    },
    { 
      label: 'Placement', 
      formatter: (u) => u.stats?.placementPercentage ? `${u.stats.placementPercentage}%` : 'N/A', 
      type: 'number', 
      getValue: u => u.stats?.placementPercentage || 0, 
      highIsBetter: true 
    },
  ];

  return (
    <div className="space-y-6 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[600px]">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-indigo-500" /> Comparison View
        </h2>
        <span className="text-sm text-light-muted">{compareList.length}/3 Colleges</span>
      </div>

      <div className="min-w-[600px] overflow-visible pb-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Labels Column */}
          <div className="pt-32 space-y-12">
            {features.map((f, i) => (
              <div key={i} className="h-10 flex items-center text-sm font-semibold text-light-muted border-b border-light-border dark:border-dark-border">
                {f.label}
              </div>
            ))}
          </div>

          {/* Colleges Columns */}
          {compareList.map(u => (
            <div key={u._id} className="space-y-12 relative group">
              <button 
                onClick={() => onRemove(u)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* College Header */}
              <div className="card p-4 h-28 flex flex-col justify-between hover:border-indigo-500 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-dark-border flex items-center justify-center text-indigo-600 font-bold shrink-0">
                    {u.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold line-clamp-2">{u.name}</p>
                  </div>
                </div>
                <Link to={`/universities/${u.slug}`} className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1">
                  View Profile <ExternalLink className="w-2 h-2" />
                </Link>
              </div>

              {/* Feature Values */}
              {features.map((f, i) => {
                let isBest = false;
                if (f.type === 'number' && compareList.length > 1) {
                  const values = compareList.map(f.getValue);
                  const validValues = values.filter(v => v !== 0 && v !== 9999);
                  if (validValues.length > 1) {
                    const bestVal = f.highIsBetter ? Math.max(...validValues) : Math.min(...validValues);
                    isBest = f.getValue(u) === bestVal && f.getValue(u) !== 0 && f.getValue(u) !== 9999;
                  }
                }

                return (
                  <div key={i} className={`h-10 flex items-center px-2 -mx-2 rounded-lg text-sm border-b border-light-border dark:border-dark-border font-medium transition-colors ${isBest ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : ''}`}>
                    {f.formatter(u)}
                    {isBest && <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Empty Slots */}
          {[...Array(3 - compareList.length)].map((_, i) => (
            <div key={i} className="pt-0">
               <div className="card border-dashed p-4 h-28 flex flex-col items-center justify-center text-center opacity-50">
                 <GitCompare className="w-6 h-6 text-light-muted mb-2" />
                 <p className="text-[10px] text-light-muted">Empty Slot</p>
               </div>
               {features.map((_, j) => (
                <div key={j} className="h-10 border-b border-light-border dark:border-dark-border"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
