import { GitCompare, X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUniversityDisplayType } from '../../utils/universityType';

const formatMetric = (numericValue, labelValue, suffix = '') => {
  if (labelValue) return suffix ? `${labelValue} ${suffix}` : labelValue;
  if (!numericValue && numericValue !== 0) return 'N/A';
  return suffix ? `${numericValue} ${suffix}` : String(numericValue);
};

export default function CompareView({ compareList, onRemove }) {
  if (compareList.length === 0) {
    return (
      <div className="card p-12 text-center">
        <GitCompare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="font-bold text-lg mb-2">Comparison List is Empty</h3>
        <p className="text-light-muted text-sm mb-4">Select up to 3 colleges from your "Saved Colleges" tab to compare them side-by-side.</p>
      </div>
    );
  }

  const features = [
    { label: 'Location', formatter: (university) => `${university.city}, ${university.state}`, type: 'text' },
    { label: 'Type', formatter: (university) => <span className="badge badge-orange">{getUniversityDisplayType(university)}</span>, type: 'text' },
    {
      label: 'NAAC Grade',
      formatter: (university) => university.naacGrade ? <span className="badge badge-green">{university.naacGrade}</span> : 'N/A',
      type: 'text',
    },
    {
      label: 'NIRF Rank',
      formatter: (university) => university.nirfRank ? <span className="badge badge-blue">#{university.nirfRank}</span> : 'N/A',
      type: 'number',
      getValue: (university) => university.nirfRank || 9999,
      highIsBetter: false,
    },
    {
      label: 'Avg Package',
      formatter: (university) => university.stats?.avgPackageLPALabel ? `Rs. ${university.stats.avgPackageLPALabel} LPA` : university.stats?.avgPackageLPA ? `Rs. ${university.stats.avgPackageLPA} LPA` : 'N/A',
      type: 'number',
      getValue: (university) => university.stats?.avgPackageLPA || 0,
      highIsBetter: true,
    },
    {
      label: 'Campus Size',
      formatter: (university) => formatMetric(university.stats?.campusSizeAcres, university.stats?.campusSizeLabel, 'Acres'),
      type: 'number',
      getValue: (university) => university.stats?.campusSizeAcres || 0,
      highIsBetter: true,
    },
    {
      label: 'Placement',
      formatter: (university) => formatMetric(university.stats?.placementPercentage, university.stats?.placementPercentageLabel, '%'),
      type: 'number',
      getValue: (university) => university.stats?.placementPercentage || 0,
      highIsBetter: true,
    },
  ];

  return (
    <div className="space-y-6 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[600px]">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-slate-500" /> Comparison View
        </h2>
        <span className="text-sm text-light-muted">{compareList.length}/3 Colleges</span>
      </div>

      <div className="min-w-[600px] overflow-visible pb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="pt-32 space-y-12">
            {features.map((feature, index) => (
              <div key={index} className="h-10 flex items-center text-sm font-semibold text-light-muted border-b border-light-border dark:border-dark-border">
                {feature.label}
              </div>
            ))}
          </div>

          {compareList.map((university) => (
            <div key={university._id} className="space-y-12 relative group">
              <button
                onClick={() => onRemove(university)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="card p-4 h-28 flex flex-col justify-between hover:border-slate-500 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-dark-border flex items-center justify-center text-slate-600 font-bold shrink-0">
                    {university.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold line-clamp-2">{university.name}</p>
                  </div>
                </div>
                <Link to={`/universities/${university.slug}`} className="text-[10px] text-slate-500 hover:underline flex items-center gap-1">
                  View Profile <ExternalLink className="w-2 h-2" />
                </Link>
              </div>

              {features.map((feature, index) => {
                let isBest = false;

                if (feature.type === 'number' && compareList.length > 1) {
                  const values = compareList.map(feature.getValue);
                  const validValues = values.filter((value) => value !== 0 && value !== 9999);

                  if (validValues.length > 1) {
                    const bestValue = feature.highIsBetter ? Math.max(...validValues) : Math.min(...validValues);
                    isBest = feature.getValue(university) === bestValue && feature.getValue(university) !== 0 && feature.getValue(university) !== 9999;
                  }
                }

                return (
                  <div key={index} className={`h-10 flex items-center px-2 -mx-2 rounded-lg text-sm border-b border-light-border dark:border-dark-border font-medium transition-colors ${isBest ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : ''}`}>
                    {feature.formatter(university)}
                    {isBest && <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />}
                  </div>
                );
              })}
            </div>
          ))}

          {[...Array(3 - compareList.length)].map((_, index) => (
            <div key={index} className="pt-0">
              <div className="card border-dashed p-4 h-28 flex flex-col items-center justify-center text-center opacity-50">
                <GitCompare className="w-6 h-6 text-light-muted mb-2" />
                <p className="text-[10px] text-light-muted">Empty Slot</p>
              </div>
              {features.map((_, featureIndex) => (
                <div key={featureIndex} className="h-10 border-b border-light-border dark:border-dark-border" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
