import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Globe, Phone, Mail, BookOpen, Users, Award, Building, Bookmark, Share2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const tabs = ['Overview', 'Courses', 'Admissions', 'Placements', 'Campus', 'Scholarships', 'Reviews', 'News'];

export default function UniversityDetail() {
  const { slug } = useParams();
  const [uni, setUni] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    api.get(`/universities/${slug}`).then(({ data }) => setUni(data.data)).catch(() => {}).finally(() => setLoading(false));
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
          <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-dark-border flex items-center justify-center text-primary text-2xl font-bold">
            {uni.name?.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{uni.name}</h1>
            <p className="text-light-muted flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" />{uni.city}, {uni.state}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="badge badge-orange">{uni.type}</span>
              {uni.naacGrade && <span className="badge badge-green">NAAC {uni.naacGrade}</span>}
              {uni.nirfRank && <span className="badge badge-blue">NIRF #{uni.nirfRank}</span>}
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
            { icon: Building, label: 'Est.', value: uni.establishedYear || 'N/A' },
            { icon: Users, label: 'Students', value: uni.stats?.totalStudents?.toLocaleString() || 'N/A' },
            { icon: Award, label: 'Avg Pkg', value: uni.stats?.avgPackageLPA ? `Rs ${uni.stats.avgPackageLPA} LPA` : 'N/A' },
            { icon: BookOpen, label: 'Courses', value: uni.courses?.length || 0 },
          ].map((s, i) => (
            <div key={i} className="text-center p-3 rounded-xl bg-light-card dark:bg-dark-border">
              <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-light-muted">{s.label}</p>
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
          <div>
            <h2 className="text-xl font-bold mb-4">About {uni.name}</h2>
            <p className="text-light-muted dark:text-dark-muted leading-relaxed">{uni.description}</p>

            {uni.highlights?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Highlights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {uni.highlights.map((item, i) => <div key={i} className="rounded-xl bg-light-card dark:bg-dark-border p-3 text-sm">{item}</div>)}
                </div>
              </div>
            )}

            {uni.facilities?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Facilities</h3>
                <div className="flex flex-wrap gap-2">
                  {uni.facilities.map((f, i) => <span key={i} className="badge badge-orange">{f}</span>)}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-2 text-sm">
              {uni.address && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{uni.address}</p>}
              {uni.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" />{uni.phone}</p>}
              {uni.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />{uni.email}</p>}
              {uni.website && <p className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /><a href={uni.website} className="text-primary hover:underline">{uni.website}</a></p>}
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Courses & Branches</h2>
            {uni.courses?.map((c, i) => (
              <div key={i} className="mb-6 p-4 rounded-xl bg-light-card dark:bg-dark-border">
                <h3 className="font-semibold">{c.name} <span className="text-sm text-light-muted">({c.category} • {c.duration} years)</span></h3>
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
                          <td className="py-2">{s.seats}</td>
                          <td className="py-2">{s.feesPerYear ? `Rs ${s.feesPerYear.toLocaleString()}` : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
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
                <p className="text-light-muted mb-1">Application Window</p>
                <p className="font-medium">
                  {uni.admissions?.applicationStartDate ? new Date(uni.admissions.applicationStartDate).toLocaleDateString() : 'TBA'} to {uni.admissions?.applicationEndDate ? new Date(uni.admissions.applicationEndDate).toLocaleDateString() : 'TBA'}
                </p>
              </div>
              <div className="rounded-xl bg-light-card dark:bg-dark-border p-4">
                <p className="text-light-muted mb-1">Application Fee</p>
                <p className="font-medium">{uni.admissions?.applicationFee ? `Rs ${uni.admissions.applicationFee.toLocaleString()}` : 'Not specified'}</p>
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
              <div className="p-4 rounded-xl bg-light-card dark:bg-dark-border text-center"><p className="text-2xl font-bold text-primary">{uni.stats?.avgPackageLPA ? `Rs ${uni.stats.avgPackageLPA} LPA` : 'N/A'}</p><p className="text-xs text-light-muted">Avg Package</p></div>
              <div className="p-4 rounded-xl bg-light-card dark:bg-dark-border text-center"><p className="text-2xl font-bold text-success">{uni.stats?.highestPackageLPA ? `Rs ${uni.stats.highestPackageLPA} LPA` : 'N/A'}</p><p className="text-xs text-light-muted">Highest Package</p></div>
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
          <p className="text-light-muted text-center py-8">Reviews can be added in a later phase once the review system is enabled.</p>
        )}

        {activeTab === 7 && (
          <div>
            <h2 className="text-xl font-bold mb-4">University News</h2>
            {uni.newsLinks?.length ? (
              <div className="space-y-3">
                {uni.newsLinks.map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noreferrer" className="block rounded-xl bg-light-card dark:bg-dark-border p-4 hover:border-primary border border-transparent transition-colors">
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
