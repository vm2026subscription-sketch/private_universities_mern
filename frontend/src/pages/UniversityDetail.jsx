import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { MapPin, Globe, Phone, Mail, BookOpen, Users, Award, Building, Bookmark, Share2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import QASection from '../components/QASection';

const tabs = ['Overview', 'Courses', 'Admissions', 'Placements', 'Campus', 'Scholarships', 'Q&A', 'News'];

export default function UniversityDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const [uni, setUni] = useState(null);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 0);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    api.get(`/universities/${slug}`)
      .then(({ data }) => {
        const u = data.data;
        setUni(u);
        if (u) {
          // Track recently viewed in localStorage (max 10)
          const prev = JSON.parse(localStorage.getItem('vm_recent') || '[]');
          const filtered = prev.filter(r => r._id !== u._id);
          const entry = { _id: u._id, name: u.name, slug: u.slug, state: u.state, city: u.city, type: u.type, naacGrade: u.naacGrade, nirfRank: u.nirfRank };
          localStorage.setItem('vm_recent', JSON.stringify([entry, ...filtered].slice(0, 10)));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (user && uni) {
      api.get('/users/saved-universities').then(({ data }) => {
        setIsSaved(data.data.some(u => u._id === uni._id));
      }).catch(() => {});
    } else {
      setIsSaved(false);
    }
  }, [user, uni]);

  const handleBookmark = async () => {
    if (!user) return toast.error('Please login to save universities');
    try {
      if (isSaved) {
        await api.delete(`/users/saved-universities/${uni._id}`);
        setIsSaved(false);
        toast.success('Removed from saved');
      } else {
        await api.post(`/users/saved-universities/${uni._id}`);
        setIsSaved(true);
        toast.success('Saved to profile');
      }
    } catch {
      toast.error('Failed to update saved status');
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center">Loading...</div>;
  if (!uni) return <div className="max-w-7xl mx-auto px-4 py-12 text-center">University not found. Connect to backend to load data.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-20 md:pb-8">
      <div className="card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Logo with fallback to initial letter */}
          <div className="w-20 h-20 rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-border flex items-center justify-center overflow-hidden shrink-0">
            {uni.logoUrl ? (
              <img
                src={uni.logoUrl}
                alt={`${uni.name} logo`}
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.classList.add('bg-primary-50');
                  e.target.parentElement.innerHTML = `<span class="text-primary text-2xl font-bold">${uni.name?.charAt(0)}</span>`;
                }}
              />
            ) : (
              <span className="text-primary text-2xl font-bold bg-primary-50 dark:bg-dark-border w-full h-full flex items-center justify-center">{uni.name?.charAt(0)}</span>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{uni.name}</h1>
            <p className="text-light-muted flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" />{uni.city}, {uni.state}</p>
            <div className="flex flex-wrap gap-2 mt-2">
               <span className="badge badge-orange">{uni.type}</span>
               {uni.naacGrade && <span className="badge badge-green">NAAC {uni.naacGrade}</span>}
               {uni.nirfRank && <span className="badge badge-blue">NIRF #{uni.nirfRank}</span>}
               {uni.approvals?.ugc && <span className="badge bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300">UGC Approved</span>}
             </div>
          </div>
          <div className="flex gap-2">
            <button className={`btn-outline !py-2 !px-3 border ${isSaved ? 'bg-primary text-white border-primary' : 'dark:border-dark-border'}`} onClick={handleBookmark}>
              <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
            </button>
            <button
              className="btn-outline !py-2 !px-3 dark:border-dark-border"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard');
              }}
            >
              <Share2 className="w-4 h-4" />
            </button>
            {uni.website && <a href={uni.website} target="_blank" rel="noreferrer" className="btn-primary !py-2 !px-4 text-sm">Apply Now</a>}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { icon: Users, label: 'Students', value: uni.stats?.totalStudents?.toLocaleString() || 'N/A' },
            { icon: Award, label: 'Avg Pkg', value: uni.stats?.avgPackageLPA ? `₹${uni.stats.avgPackageLPA} LPA` : 'N/A' },
            { icon: BookOpen, label: 'Courses', value: uni.stats?.totalCoursesCount || uni.courses?.length || 0 },
            { icon: Building, label: 'Campus', value: uni.stats?.campusSizeAcres ? `${uni.stats.campusSizeAcres} Acres` : 'N/A' },
            { icon: Award, label: 'Placement', value: uni.stats?.placementPercentage ? `${uni.stats.placementPercentage}%` : 'N/A' },
            { icon: Award, label: 'Max Pkg', value: uni.stats?.highestPackageLPA ? `₹${uni.stats.highestPackageLPA} LPA` : 'N/A' },
          ].map((s, i) => (
            <div key={i} className="text-center p-3 rounded-xl bg-light-card dark:bg-dark-border">
              <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-sm font-bold">{s.value}</p>
              <p className="text-[10px] text-light-muted uppercase tracking-wider">{s.label}</p>
            </div>
          ))}

        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 mb-6">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === i ? 'bg-primary text-white' : 'bg-light-card dark:bg-dark-card hover:bg-primary-50'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {activeTab === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">About</h2>
              <p className="text-light-muted dark:text-dark-muted leading-relaxed">
                {uni.description || `${uni.name} is a ${uni.type} university located in ${uni.city}, ${uni.state}. It offers various undergraduate and postgraduate programs.`}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">General Information</h3>
                <div className="space-y-3 text-sm">
                   {uni.address && (
                     <div className="flex gap-3">
                       <MapPin className="w-4 h-4 text-primary shrink-0" />
                       <span className="text-light-muted dark:text-dark-muted">{uni.address}</span>
                     </div>
                   )}
                   {uni.website && (
                     <div className="flex gap-3">
                       <Globe className="w-4 h-4 text-primary shrink-0" />
                       <a href={uni.website.startsWith('http') ? uni.website : `https://${uni.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{uni.website}</a>
                     </div>
                   )}
                   {uni.email && (
                     <div className="flex gap-3">
                       <Mail className="w-4 h-4 text-primary shrink-0" />
                       <span className="text-light-muted dark:text-dark-muted">{uni.email}</span>
                     </div>
                   )}
                   {uni.phone && (
                     <div className="flex gap-3">
                       <Phone className="w-4 h-4 text-primary shrink-0" />
                       <span className="text-light-muted dark:text-dark-muted">{uni.phone}</span>
                     </div>
                   )}
                </div>
              </div>

              {uni.facilities?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Facilities</h3>
                  <div className="flex flex-wrap gap-2">
                    {uni.facilities.map((f, i) => <span key={i} className="badge badge-orange">{f}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Courses & Programs</h2>
            {uni.courses?.length === 0 && (
              <p className="text-light-muted text-center py-8">No course data available yet.</p>
            )}
            <div className="space-y-4">
              {uni.courses?.map((c, i) => (
                <div key={i} className="p-4 rounded-xl bg-light-card dark:bg-dark-border border border-light-border dark:border-dark-border">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-base">{c.name}</h3>
                      <p className="text-sm text-light-muted mt-0.5">
                        {c.category && <span className="mr-2">Level: <strong>{c.category}</strong></span>}
                        {c.duration && <span>Duration: <strong>{c.duration} yr{c.duration > 1 ? 's' : ''}</strong></span>}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.feesPerYear && (
                        <span className="badge badge-green">₹{c.feesPerYear.toLocaleString()}/yr</span>
                      )}
                      {c.totalSeats && (
                        <span className="badge badge-blue">{c.totalSeats} seats</span>
                      )}
                    </div>
                  </div>
                  {c.entranceExams?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-light-muted mr-1">Entrance Exams:</span>
                      {c.entranceExams.map((exam, j) => (
                        <span key={j} className="badge badge-orange text-xs">{exam}</span>
                      ))}
                    </div>
                  )}
                  {c.specializations?.length > 0 && (
                    <table className="w-full mt-3 text-sm">
                      <thead>
                        <tr className="border-b border-light-border dark:border-dark-border">
                          <th className="text-left py-2">Specialization</th>
                          <th className="text-left py-2">Seats</th>
                          <th className="text-left py-2">Fees/Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.specializations.map((s, j) => (
                          <tr key={j} className="border-b border-light-border dark:border-dark-border">
                            <td className="py-2">{s.name}</td>
                            <td className="py-2">{s.seats || '-'}</td>
                            <td className="py-2">{s.feesPerYear ? `₹${s.feesPerYear.toLocaleString()}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


        {activeTab === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">Admission Overview</h2>
              <p className="text-light-muted dark:text-dark-muted">{uni.admissions?.overview || 'Admission details have not been added yet.'}</p>
            </div>

            {uni.admissions?.process?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Admission Process</h3>
                <div className="space-y-3">
                  {uni.admissions.process.map((step, i) => <div key={i} className="rounded-xl bg-light-card dark:bg-dark-border p-4 text-sm">{i + 1}. {step}</div>)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
               <div className="rounded-xl bg-light-card dark:bg-dark-border p-4">
                 <p className="text-light-muted mb-1">Application Window / Deadline</p>
                 <p className="font-medium">
                   {uni.admissions?.counsellingInfo || 'Check university website'}
                 </p>
               </div>
               <div className="rounded-xl bg-light-card dark:bg-dark-border p-4">
                 <p className="text-light-muted mb-1">Application Fee</p>
                 <p className="font-medium">{uni.admissions?.applicationFee ? `₹${uni.admissions.applicationFee.toLocaleString()}` : 'Not specified'}</p>
               </div>
             </div>

            {uni.admissions?.acceptedExams?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Accepted Exams</h3>
                <div className="flex flex-wrap gap-2">
                  {uni.admissions.acceptedExams.map((exam, i) => <span key={i} className="badge badge-blue">{exam}</span>)}
                </div>
              </div>
            )}

            {uni.admissions?.documentsRequired?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Documents Required</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {uni.admissions.documentsRequired.map((document, i) => <div key={i} className="rounded-xl bg-light-card dark:bg-dark-border p-3 text-sm">{document}</div>)}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {uni.links?.admissionLink && <a href={uni.links.admissionLink} target="_blank" rel="noreferrer" className="btn-primary text-sm">Apply Online</a>}
              {uni.links?.brochureLink && <a href={uni.links.brochureLink} target="_blank" rel="noreferrer" className="btn-outline text-sm">Download Brochure</a>}
            </div>
          </div>
        )}

        {activeTab === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Placement Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-light-card dark:bg-dark-border text-center"><p className="text-2xl font-bold text-primary">{uni.stats?.avgPackageLPA ? `₹${uni.stats.avgPackageLPA} LPA` : 'N/A'}</p><p className="text-xs text-light-muted">Avg Package</p></div>
              <div className="p-4 rounded-xl bg-light-card dark:bg-dark-border text-center"><p className="text-2xl font-bold text-success">{uni.stats?.highestPackageLPA ? `₹${uni.stats.highestPackageLPA} LPA` : 'N/A'}</p><p className="text-xs text-light-muted">Highest Package</p></div>
              <div className="p-4 rounded-xl bg-light-card dark:bg-dark-border text-center"><p className="text-2xl font-bold">{uni.stats?.placementPercentage || 'N/A'}{uni.stats?.placementPercentage ? '%' : ''}</p><p className="text-xs text-light-muted">Placement Rate</p></div>
              <div className="p-4 rounded-xl bg-light-card dark:bg-dark-border text-center"><p className="text-2xl font-bold">{uni.topRecruiters?.length || 0}+</p><p className="text-xs text-light-muted">Recruiters</p></div>
            </div>
            {uni.topRecruiters?.length > 0 && (
              <div><h3 className="font-semibold mb-3">Top Recruiters</h3><div className="flex flex-wrap gap-2">{uni.topRecruiters.map((r, i) => <span key={i} className="badge badge-blue">{r}</span>)}</div></div>
            )}
            {uni.links?.placementReportLink && (
              <div className="mt-6">
                <a href={uni.links.placementReportLink} target="_blank" rel="noreferrer" className="btn-outline text-sm">View Placement Report</a>
              </div>
            )}
          </div>
        )}

        {activeTab === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">Campus Overview</h2>
              <p className="text-light-muted dark:text-dark-muted">{uni.campus?.overview || 'Campus information has not been added yet.'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {uni.campus?.hostelDetails && <div className="rounded-xl bg-light-card dark:bg-dark-border p-4"><p className="font-medium mb-1">Hostel</p><p className="text-light-muted dark:text-dark-muted">{uni.campus.hostelDetails}</p></div>}
              {uni.campus?.libraryDetails && <div className="rounded-xl bg-light-card dark:bg-dark-border p-4"><p className="font-medium mb-1">Library</p><p className="text-light-muted dark:text-dark-muted">{uni.campus.libraryDetails}</p></div>}
              {uni.campus?.labDetails && <div className="rounded-xl bg-light-card dark:bg-dark-border p-4"><p className="font-medium mb-1">Labs</p><p className="text-light-muted dark:text-dark-muted">{uni.campus.labDetails}</p></div>}
              {uni.campus?.sportsDetails && <div className="rounded-xl bg-light-card dark:bg-dark-border p-4"><p className="font-medium mb-1">Sports</p><p className="text-light-muted dark:text-dark-muted">{uni.campus.sportsDetails}</p></div>}
              {uni.campus?.transportDetails && <div className="rounded-xl bg-light-card dark:bg-dark-border p-4"><p className="font-medium mb-1">Transport</p><p className="text-light-muted dark:text-dark-muted">{uni.campus.transportDetails}</p></div>}
              {uni.campus?.medicalSupport && <div className="rounded-xl bg-light-card dark:bg-dark-border p-4"><p className="font-medium mb-1">Medical Support</p><p className="text-light-muted dark:text-dark-muted">{uni.campus.medicalSupport}</p></div>}
            </div>
            {uni.campus?.virtualTourLink && <a href={uni.campus.virtualTourLink} target="_blank" rel="noreferrer" className="btn-outline text-sm">Open Virtual Tour</a>}
          </div>
        )}

        {activeTab === 5 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Scholarships</h2>
            {uni.scholarships?.length ? (
              <div className="space-y-4">
                {uni.scholarships.map((scholarship, i) => (
                  <div key={i} className="rounded-xl bg-light-card dark:bg-dark-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-semibold">{scholarship.name}</h3>
                        {scholarship.amount && <p className="text-sm text-primary mt-1">{scholarship.amount}</p>}
                      </div>
                      {scholarship.deadline && <span className="badge badge-orange">Deadline: {new Date(scholarship.deadline).toLocaleDateString()}</span>}
                    </div>
                    {scholarship.eligibility && <p className="text-sm text-light-muted dark:text-dark-muted mb-2">Eligibility: {scholarship.eligibility}</p>}
                    {scholarship.description && <p className="text-sm text-light-muted dark:text-dark-muted mb-3">{scholarship.description}</p>}
                    {scholarship.link && <a href={scholarship.link} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Apply for Scholarship</a>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-light-muted text-center py-8">Scholarship information has not been added yet.</p>
            )}
          </div>
        )}

        {activeTab === 6 && (
          <QASection universityId={uni._id} user={user} />
        )}

        {activeTab === 7 && (
          <div>
            <h2 className="text-xl font-bold mb-4">University News</h2>
            {uni.newsLinks?.length ? (
              <div className="space-y-3">
                {uni.newsLinks.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl bg-light-card dark:bg-dark-border p-4 hover:border-primary border border-transparent transition-colors"
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-light-muted dark:text-dark-muted mt-1">{item.url}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-light-muted text-center py-8">News links have not been added yet.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
