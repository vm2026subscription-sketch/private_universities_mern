import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  MapPin, Globe, BookOpen, Clock, IndianRupee, ArrowRight, ExternalLink, 
  Award, Search, DollarSign, Calendar, ChevronDown, ChevronUp, ArrowLeft, 
  Briefcase, FileText, CheckCircle2, Building, Sparkles, Compass, ShieldCheck, HelpCircle 
} from 'lucide-react';
import api from '../utils/api';
import { ListSkeleton } from '../components/common/LoadingSkeleton';
import UniversityLogo from '../components/common/UniversityLogo';

// Country labels helper
const countryFlag = (name = '') => {
  const n = (name || '').toLowerCase();
  if (n.includes('united kingdom') || n.includes('uk')) return 'UK';
  if (n.includes('united states') || n.includes('usa') || n.includes('us')) return 'USA';
  if (n.includes('australia')) return 'AUS';
  if (n.includes('canada')) return 'CAN';
  if (n.includes('germany')) return 'DE';
  if (n.includes('france')) return 'FR';
  return 'Global';
};

// Country accent color helper
const countryAccent = (name = '') => {
  const n = (name || '').toLowerCase();
  if (n.includes('united kingdom') || n.includes('uk')) return 'from-blue-600 to-red-600';
  if (n.includes('united states') || n.includes('usa')) return 'from-blue-700 to-red-500';
  if (n.includes('australia')) return 'from-blue-500 to-yellow-400';
  if (n.includes('canada')) return 'from-red-600 to-red-400';
  return 'from-primary to-orange-400';
};

// Twinning programs structured dataset
const TWINNING_PROGRAMS = [
  {
    id: 'deakin',
    uniName: 'Deakin University',
    slug: 'deakin-university',
    country: 'Australia',
    flag: '🇦🇺',
    qsRank: '197',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Deakin_University_logo_2017.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80',
    type: '2+2',
    degree: 'B.Tech',
    courseName: 'B.Tech in Computer Science & Engineering',
    duration: '4 Years (2 Years in India + 2 Years in Australia)',
    awardedBy: 'Deakin University, Australia',
    scholarships: [
      { name: 'Deakin India Twinning Scholarship', eligibility: 'Minimum 80% in 12th', amount: '25% Tuition Fee Waiver', deadline: '2026-07-31' },
      { name: 'Vice-Chancellor Merit Scholarship', eligibility: 'Academic Excellence (Min 95%)', amount: '100% Tuition Fee Waiver', deadline: '2026-06-30' }
    ],
    highlights: { scholarship: 'Up to 25% Off', visa: '3 Years Post-Study Work Visa', internship: 'Industry Placements Included' },
    cost: { tuition: 'INR 12.5 Lakhs/year', accommodation: 'INR 4.5 Lakhs/year', living: 'INR 3.0 Lakhs/year', insurance: 'INR 50,000/year', total: 'INR 20.5 Lakhs/year' },
    careers: ['Software Engineer', 'Data Scientist', 'AI/ML Specialist', 'Cloud Solutions Architect', 'Full Stack Developer'],
    visaInfo: { workPermit: '3 Years (subclass 485)', partTime: '24 hours/week', pr: 'Pathway through State Nomination (PR Subclass 190)', avgSalary: 'AUD 85,000/year' },
    admissions: { percentage: 'Minimum 75% in 12th State/CBSE Board', ielts: '6.5 overall (no band less than 6.0)', docs: ['10th & 12th Marksheets', 'Passport Copy', 'SOP & LORs', 'IELTS Certificate'] },
    partners: ['Symbiosis International University', 'Chitkara University', 'Amity University'],
    faqs: [
      { q: 'How does the credit transfer system work?', a: 'Your academic credits for the first 2 years in India are mapped and fully recognized by Deakin University, enabling seamless transfer for Year 3.' },
      { q: 'Will I get the same degree as an on-campus student?', a: 'Yes! The final degree certificate and transcript are identical to those awarded to students who study all years in Australia.' }
    ]
  },
  {
    id: 'coventry',
    uniName: 'Coventry University',
    slug: 'coventry-university',
    country: 'United Kingdom',
    flag: '🇬🇧',
    qsRank: '531',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e8/Coventry_University_logo.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&auto=format&fit=crop&q=80',
    type: '3+1',
    degree: 'BBA',
    courseName: 'BBA in International Business',
    duration: '4 Years (3 Years in India + 1 Year in UK)',
    awardedBy: 'Coventry University, United Kingdom',
    scholarships: [
      { name: 'Coventry Academic Performance Award', eligibility: 'Minimum 75% in 12th', amount: 'GBP 2,500 One-time', deadline: '2026-08-15' }
    ],
    highlights: { scholarship: 'GBP 2,500 Available', visa: '2 Years UK Graduate Visa', internship: 'Optional 1-Year Placement' },
    cost: { tuition: 'INR 9.8 Lakhs/year', accommodation: 'INR 3.8 Lakhs/year', living: 'INR 2.8 Lakhs/year', insurance: 'INR 40,000/year', total: 'INR 16.8 Lakhs/year' },
    careers: ['International Business Manager', 'Financial Analyst', 'Marketing Director', 'HR Specialist', 'Business Consultant'],
    visaInfo: { workPermit: '2 Years (Graduate Route)', partTime: '20 hours/week', pr: 'Skilled Worker Visa sponsorship options after graduation', avgSalary: 'GBP 35,000/year' },
    admissions: { percentage: 'Minimum 70% in 12th State/CBSE Board', ielts: '6.0 overall (no band less than 5.5)', docs: ['10th & 12th Marksheets', 'Passport Copy', 'SOP & 2 LORs', 'IELTS Certificate'] },
    partners: ['MIT WPU', 'Lovely Professional University (LPU)', 'UPES Dehradun'],
    faqs: [
      { q: 'Can I do a work internship during the course?', a: 'Yes! The UK program includes an optional 1-year paid industry placement which extends your visa duration by 1 year.' }
    ]
  },
  {
    id: 'york',
    uniName: 'University of York',
    slug: 'university-of-york',
    country: 'United Kingdom',
    flag: '🇬🇧',
    qsRank: '167',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/2/23/University_of_York_logo.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1527891751199-7225231a68dd?w=1200&auto=format&fit=crop&q=80',
    type: '1+1',
    degree: 'MSc',
    courseName: 'M.Sc in Data Science',
    duration: '2 Years (1 Year in India + 1 Year in UK)',
    awardedBy: 'University of York, United Kingdom',
    scholarships: [
      { name: 'York Global Leader Scholarship', eligibility: 'Academic Merit & SOP', amount: 'GBP 5,000 Waiver', deadline: '2026-05-31' }
    ],
    highlights: { scholarship: 'GBP 5,000 Available', visa: '2 Years UK Graduate Visa', internship: 'Post-Graduate Capstone Project' },
    cost: { tuition: 'INR 14.5 Lakhs/year', accommodation: 'INR 4.8 Lakhs/year', living: 'INR 3.2 Lakhs/year', insurance: 'INR 45,000/year', total: 'INR 22.95 Lakhs/year' },
    careers: ['Lead Data Scientist', 'AI/ML Research Scientist', 'Quantitative Analyst', 'Data Engineer', 'Analytics Consultant'],
    visaInfo: { workPermit: '2 Years (Graduate Route)', partTime: '20 hours/week', pr: 'Skilled Worker Visa path', avgSalary: 'GBP 45,000/year' },
    admissions: { percentage: 'Minimum 60% in Bachelor Degree', ielts: '6.5 overall (no band less than 6.0)', docs: ['Bachelor Transcripts', 'Passport Copy', 'SOP & Academic LORs', 'IELTS Certificate'] },
    partners: ['BITS Pilani', 'Thapar Institute of Engineering and Technology'],
    faqs: [
      { q: 'Is a work permit granted after a 1+1 Master program?', a: 'Yes! As long as you complete at least 1 full year on campus in the UK, you qualify for the standard 2-year Graduate Route post-study work visa.' }
    ]
  },
  {
    id: 'wollongong',
    uniName: 'University of Wollongong',
    slug: 'university-of-wollongong',
    country: 'Australia',
    flag: '🇦🇺',
    qsRank: '162',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e0/University_of_Wollongong_logo.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1548689816-c399f954f3dd?w=1200&auto=format&fit=crop&q=80',
    type: '2+2',
    degree: 'B.Tech',
    courseName: 'B.Tech in Artificial Intelligence & Robotics',
    duration: '4 Years (2 Years in India + 2 Years in Australia)',
    awardedBy: 'University of Wollongong, Australia',
    scholarships: [
      { name: 'UOW India Excellence Grant', eligibility: 'Minimum 82% in 12th', amount: '30% Tuition Fee Reduction', deadline: '2026-07-15' }
    ],
    highlights: { scholarship: '30% Waiver Available', visa: '3 Years Post-Study Work Visa', internship: 'Robotics Lab Collaboration' },
    cost: { tuition: 'INR 13.0 Lakhs/year', accommodation: 'INR 4.2 Lakhs/year', living: 'INR 2.8 Lakhs/year', insurance: 'INR 48,000/year', total: 'INR 20.48 Lakhs/year' },
    careers: ['Robotics Engineer', 'AI Specialist', 'Control Systems Engineer', 'Automation Architect', 'Data Scientist'],
    visaInfo: { workPermit: '3 Years (subclass 485)', partTime: '24 hours/week', pr: 'State Nomination eligibility', avgSalary: 'AUD 88,000/year' },
    admissions: { percentage: 'Minimum 78% in 12th (Maths mandatory)', ielts: '6.5 overall (no band less than 6.0)', docs: ['10th & 12th Marksheets', 'Passport Copy', 'SOP & Academic LORs', 'IELTS Certificate'] },
    partners: ['Manipal Academy of Higher Education (MAHE)', 'SRM University', 'Kalinga Institute of Industrial Technology (KIIT)'],
    faqs: [
      { q: 'Are entrance exams required for Wollongong?', a: 'No, admission is purely merit-based using your high school percentages plus passing the English language proficiency (IELTS/PTE).' }
    ]
  },
  {
    id: 'illinois',
    uniName: 'Illinois Institute of Technology',
    slug: 'illinois-institute-of-technology',
    country: 'United States',
    flag: '🇺🇸',
    qsRank: '469',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Illinois_Tech_wordmark.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80',
    type: '1+1',
    degree: 'MBA',
    courseName: 'M.B.A in Business Analytics',
    duration: '2 Years (1 Year in India + 1 Year in Chicago, USA)',
    awardedBy: 'Illinois Institute of Technology, USA',
    scholarships: [
      { name: 'Chicago Talent Scholarship', eligibility: 'Academic Profile & GMAT/GRE (optional)', amount: 'USD 8,000 Award', deadline: '2026-06-15' }
    ],
    highlights: { scholarship: 'USD 8,000 Merit Grant', visa: '3 Years STEM OPT Work Visa', internship: 'Chicago Financial District projects' },
    cost: { tuition: 'INR 18.2 Lakhs/year', accommodation: 'INR 6.5 Lakhs/year', living: 'INR 4.0 Lakhs/year', insurance: 'INR 60,000/year', total: 'INR 29.3 Lakhs/year' },
    careers: ['Senior Business Analyst', 'Data Analytics Manager', 'Operations Director', 'Financial Risk consultant', 'Supply Chain Analyst'],
    visaInfo: { workPermit: '3 Years STEM OPT (Work Rights)', partTime: '20 hours/week on-campus', pr: 'H1B Visa sponsorship pathway through employers', avgSalary: 'USD 92,000/year' },
    admissions: { percentage: 'Minimum GPA 3.0 or 65% in Bachelors', ielts: '6.5 overall or TOEFL 90', docs: ['Bachelors Marksheets', 'Passport', 'SOP & 2 Professional LORs', 'English score card'] },
    partners: ['Great Lakes Institute of Management', 'SP Jain School of Global Management', 'NMIMS University'],
    faqs: [
      { q: 'Is this a STEM designated program?', a: 'Yes! The MBA in Business Analytics is STEM-designated, allowing you to qualify for the full 3 years of OPT work rights in the US.' }
    ]
  },
  {
    id: 'istituto-marangoni',
    uniName: 'Istituto Marangoni',
    slug: 'istituto-marangoni',
    country: 'Italy',
    flag: '🇮🇹',
    qsRank: '100',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Logo_Istituto_Marangoni.svg',
    bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',
    type: '2+2',
    degree: 'BCA',
    courseName: 'B.Des in Fashion Design & Art direction',
    duration: '4 Years (2 Years in Mumbai + 2 Years in Milan, Italy)',
    awardedBy: 'Istituto Marangoni, Milan',
    scholarships: [
      { name: 'Marangoni Creative Award', eligibility: 'Portfolio Presentation', amount: '50% Tuition Fee Waiver', deadline: '2026-05-30' }
    ],
    highlights: { scholarship: 'Up to 50% Portfolio Grant', visa: '1-Year Post-Study Work Permit', internship: 'Milan Fashion Week placements' },
    cost: { tuition: 'INR 15.0 Lakhs/year', accommodation: 'INR 5.2 Lakhs/year', living: 'INR 3.5 Lakhs/year', insurance: 'INR 40,000/year', total: 'INR 24.1 Lakhs/year' },
    careers: ['Fashion Designer', 'Art Director', 'Luxury Brand Manager', 'Visual Merchandiser', 'Fashion Stylist'],
    visaInfo: { workPermit: '1 Year post-study permesso di soggiorno', partTime: '20 hours/week', pr: 'EU Blue Card opportunities after finding full-time work', avgSalary: 'EUR 38,000/year' },
    admissions: { percentage: 'Min 60% in 12th + Creative Portfolio', ielts: '6.0 overall', docs: ['Marksheets', 'Passport Copy', 'Creative Portfolio (10-15 works)', 'SOP'] },
    partners: ['Istituto Marangoni Mumbai Campus'],
    faqs: [
      { q: 'Do I need to speak Italian to study in Milan?', a: 'No, all classes, lectures, and projects are conducted entirely in English.' }
    ]
  }
];

export default function ForeignUniversities() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab control state
  const [activeTab, setActiveTab] = useState('foreign'); // 'foreign' or 'twinning'
  const [selectedTwinning, setSelectedTwinning] = useState(null);
  
  // Twinning filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/universities?type=foreign&limit=50`).then(({ data }) => {
      const unis = data.data || [];
      setUniversities(unis);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Filter Twinning Programs dynamically
  const filteredTwinning = TWINNING_PROGRAMS.filter(p => {
    return p.uniName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           p.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           p.country.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="bg-[#f8fafc] dark:bg-dark-bg min-h-screen">
      <Helmet>
        <title>Study Abroad | Foreign Universities & Twinning Programs | VidyarthiMitra</title>
        <meta name="description" content="Explore foreign universities in India to complete your entire degree locally, or check modular twinning programs (2+2, 3+1, 1+1) to study partly abroad." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-12 pb-28 md:pb-16 page-enter">
        
        {/* 1. HERO SECTION (Remains Unchanged in branding/style) */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full text-sm font-bold mb-5 border border-indigo-100 dark:border-indigo-500/20">
            <Globe className="w-4 h-4" />
            Study Abroad Options
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-slate-900 dark:text-white">
            World-Class Universities,<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-light">Right Here in India & Abroad</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-base leading-relaxed">
            International universities have established campuses across India. Get a globally recognised degree without leaving the country, or explore twinning pathways.
          </p>
        </div>

        {/* 5. TOP TABS */}
        <div className="flex justify-center gap-3 mb-12">
          <button 
            onClick={() => { setActiveTab('foreign'); setSelectedTwinning(null); }}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
              activeTab === 'foreign' 
                ? 'bg-slate-900 text-white shadow-xl border-slate-900' 
                : 'bg-white dark:bg-dark-card text-slate-400 hover:text-primary border-slate-100 dark:border-white/5 shadow-sm'
            }`}
          >
            Foreign Universities in India
          </button>
          <button 
            onClick={() => setActiveTab('twinning')}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
              activeTab === 'twinning' 
                ? 'bg-slate-900 text-white shadow-xl border-slate-900' 
                : 'bg-white dark:bg-dark-card text-slate-400 hover:text-primary border-slate-100 dark:border-white/5 shadow-sm'
            }`}
          >
            Twinning Programs
          </button>
        </div>

        {/* ==================== CONDITIONAL RENDERING ==================== */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: FOREIGN UNIVERSITIES IN INDIA */}
          {activeTab === 'foreign' && (
            <motion.div
              key="foreign-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-5xl mx-auto"
            >
              {/* Existing statistics bar */}
              <div className="grid grid-cols-3 gap-4 mb-14">
                {[
                  { label: 'International Universities', value: universities.length || '6+' },
                  { label: 'Countries Represented', value: '3' },
                  { label: 'UGC Approved', value: '100%' },
                ].map(s => (
                  <div key={s.label} className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-black text-primary">{s.value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Existing Foreign Universities cards */}
              {loading ? (
                <ListSkeleton count={4} />
              ) : universities.length === 0 ? (
                <div className="text-center py-24">
                  <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-600">No foreign universities found</h3>
                </div>
              ) : (
                <div className="space-y-6">
                  {universities.map((uni, idx) => {
                    const uniCourses = uni.courses || [];
                    const flag = countryFlag(uni.description || '');
                    const accent = countryAccent(uni.description || '');

                    return (
                      <motion.div
                        key={uni._id}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07 }}
                        className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group"
                      >
                        <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />

                        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start border-b border-light-border dark:border-dark-border">
                          <div className="w-20 h-20 shrink-0 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-2xl flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                            <UniversityLogo logoUrl={uni.logoUrl} name={uni.name} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="px-2.5 py-1 text-[10px] font-black bg-indigo-500/10 text-indigo-500 rounded-lg uppercase tracking-widest">
                                {flag} Foreign University
                              </span>
                              <span className="px-2.5 py-1 text-[10px] font-black bg-green-50 text-green-600 rounded-lg uppercase tracking-widest">
                                UGC Approved
                              </span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                              {uni.name}
                            </h2>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                              <MapPin className="w-4 h-4 text-primary shrink-0" />
                              <span>{uni.city !== 'Unknown' ? uni.city : ''}{uni.city && uni.city !== 'Unknown' && uni.state ? ', ' : ''}{uni.state}</span>
                            </div>
                            {uni.description && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {uni.description}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-row md:flex-col gap-3 shrink-0">
                            <Link to={`/universities/${uni.slug}`} className="btn-primary gap-2 text-sm !px-4 !py-2.5">
                              View Profile <ArrowRight className="w-4 h-4" />
                            </Link>
                            {uni.links?.admissionLink && (
                              <a
                                href={uni.links.admissionLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-outline gap-2 text-sm !px-4 !py-2.5"
                              >
                                Apply Now <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="p-6 md:p-8">
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Programs Offered {uniCourses.length > 0 && <span className="text-primary">({uniCourses.length})</span>}
                          </h3>

                          {uniCourses.length > 0 ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {uniCourses.map(course => (
                                <div key={course._id} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-primary/30 transition-colors">
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2 leading-snug">{course.name}</h4>
                                  <div className="flex items-center gap-4 text-xs text-slate-400">
                                    {course.duration && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />{course.duration}
                                      </span>
                                    )}
                                    {course.feesPerYear ? (
                                      <span className="flex items-center gap-1">
                                        <IndianRupee className="w-3.5 h-3.5" />{course.feesPerYear.toLocaleString('en-IN')}/yr
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">Fees on enquiry</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 italic">Course details coming soon. Visit the university profile for more info.</p>
                          )}

                          {uni.stats?.avgFees && (
                            <div className="mt-4 flex items-center gap-2 text-sm">
                              <Award className="w-4 h-4 text-orange-500" />
                              <span className="text-slate-500 dark:text-slate-400">Annual Tuition:</span>
                              <span className="font-bold text-slate-900 dark:text-white">{uni.stats.avgFees}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: TWINNING PROGRAMS */}
          {activeTab === 'twinning' && (
            <motion.div
              key="twinning-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-6xl mx-auto"
            >
              <AnimatePresence mode="wait">
                
                {/* TWINNING PROGRAMS LIST VIEW */}
                {!selectedTwinning ? (
                  <motion.div
                    key="twinning-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8"
                  >
                    {/* 3. Explore Twinning Programs Title & Description */}
                    <div className="text-center mb-10">
                      <h2 className="text-3xl md:text-4xl font-serif font-black text-slate-900 dark:text-white mb-2">
                        Explore Twinning Programs
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed font-bold">
                        Study part of your degree in India and complete the remaining years abroad through 2+2, 3+1, and 1+1 pathways.
                      </p>
                      
                      {/* Interactive Search inside Twinning Section */}
                      <div className="max-w-md mx-auto mt-6 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search twinning by university, country, or course..."
                          className="w-full bg-white dark:bg-dark-card border border-slate-100 dark:border-white/5 rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-slate-900 dark:text-white shadow-sm focus:border-primary outline-none"
                        />
                      </div>
                    </div>

                    {/* 4. Display Twinning Program Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredTwinning.map((p) => (
                        <div 
                          key={p.id}
                          className="bg-white dark:bg-dark-card border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                        >
                          <div>
                            {/* Card Top Block */}
                            <div className="flex justify-between items-start gap-4 mb-4 pb-4 border-b border-slate-50 dark:border-white/5">
                              <div className="flex gap-3 items-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center p-2 border border-slate-100 shrink-0">
                                  <img src={p.logoUrl} alt={p.uniName} className="max-w-full max-h-full object-contain" />
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{p.flag} {p.country}</span>
                                  <h3 className="font-serif font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-snug">{p.uniName}</h3>
                                </div>
                              </div>
                              <span className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shrink-0">
                                {p.type} Pathway
                              </span>
                            </div>

                            {/* Program Info */}
                            <div className="space-y-2 mb-4">
                              <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Course Offered</span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{p.courseName}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Scholarship Available</span>
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-yellow-500" /> {p.highlights.scholarship}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Estimated Cost</span>
                                  <span className="text-xs font-bold text-emerald-600">{p.cost.total}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="pt-4 border-t border-slate-50 dark:border-white/5 flex justify-end">
                            <button
                              onClick={() => setSelectedTwinning(p)}
                              className="bg-slate-900 hover:bg-primary hover:shadow-lg hover:shadow-primary/20 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all border border-slate-800"
                            >
                              Explore Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  // TWINNING DETAIL VIEW
                  <motion.div
                    key="twinning-details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    {/* Back Button */}
                    <button 
                      onClick={() => setSelectedTwinning(null)}
                      className="inline-flex items-center gap-2 text-slate-500 hover:text-primary font-black text-[10px] uppercase tracking-widest bg-white dark:bg-dark-card border border-slate-100 dark:border-white/5 px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-400" /> Back to Twinning Programs
                    </button>

                    {/* A. HERO SECTION */}
                    <div className="relative h-56 md:h-72 rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-xl">
                      <img src={selectedTwinning.bannerUrl} alt={selectedTwinning.uniName} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                      <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-6 z-10">
                        <div className="flex flex-col md:flex-row gap-5 items-center md:items-end text-center md:text-left">
                          <div className="w-20 h-20 rounded-2xl bg-white border-2 border-white p-2.5 shadow-2xl flex items-center justify-center overflow-hidden shrink-0">
                            <img src={selectedTwinning.logoUrl} alt={selectedTwinning.uniName} className="max-w-full max-h-full object-contain" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 mb-2">
                              <span className="bg-primary text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                                {selectedTwinning.flag} {selectedTwinning.country}
                              </span>
                              <span className="bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                                QS #{selectedTwinning.qsRank}
                              </span>
                              <span className="bg-green-500 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                                UGC Recognized
                              </span>
                            </div>
                            <h1 className="text-2xl md:text-4xl font-serif font-black text-white leading-tight">
                              {selectedTwinning.uniName}
                            </h1>
                          </div>
                        </div>

                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(selectedTwinning.uniName + ' Admissions')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-gradient-to-br from-primary to-primary-light text-white font-black text-[10px] uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-xl shadow-primary/20 hover:scale-105 transition-all text-center shrink-0 flex items-center gap-1.5"
                        >
                          Apply Now <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* B. TWINNING PROGRAMS TABLE */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-8">
                        
                        <section className="bg-white dark:bg-dark-card border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md">
                          <h2 className="text-xl font-serif font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Compass className="w-5 h-5 text-primary" /> Pathway Academic Structure
                          </h2>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5">
                                  <th className="pb-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Course</th>
                                  <th className="pb-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Pathway</th>
                                  <th className="pb-3 text-[9px] font-black uppercase tracking-widest text-slate-400">India Study</th>
                                  <th className="pb-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Abroad Study</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="py-3.5 text-xs font-bold text-slate-800 dark:text-white">{selectedTwinning.courseName}</td>
                                  <td className="py-3.5 text-[10px] font-black text-primary uppercase tracking-widest">{selectedTwinning.type}</td>
                                  <td className="py-3.5 text-xs text-slate-600">{selectedTwinning.type.split('+')[0]} Year(s)</td>
                                  <td className="py-3.5 text-xs text-slate-600">{selectedTwinning.type.split('+')[1]} Year(s)</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </section>

                        {/* C. SCHOLARSHIPS SECTION */}
                        <section className="bg-white dark:bg-dark-card border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md">
                          <h2 className="text-xl font-serif font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-500" /> Scholarships
                          </h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedTwinning.scholarships.map((s, idx) => (
                              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex flex-col justify-between">
                                <div>
                                  <span className="bg-yellow-500/10 text-yellow-600 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded mb-2 inline-block">
                                    Value: {s.amount}
                                  </span>
                                  <h3 className="font-serif font-black text-sm text-slate-950 mb-1 leading-snug">{s.name}</h3>
                                  <p className="text-[10px] font-bold text-slate-500">Eligibility: {s.eligibility}</p>
                                </div>
                                <div className="pt-2 mt-3 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-[8px] text-slate-400 uppercase tracking-widest font-black">
                                  <span>Deadline</span>
                                  <span className="text-orange-500">{new Date(s.deadline).toLocaleDateString('en-IN')}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* D. COST BREAKDOWN */}
                        <section className="bg-white dark:bg-dark-card border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md">
                          <h2 className="text-xl font-serif font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-500" /> Cost Breakdown
                          </h2>
                          <div className="space-y-3">
                            {[
                              { label: 'Tuition Fees (Annual)', value: selectedTwinning.cost.tuition },
                              { label: 'Accommodation', value: selectedTwinning.cost.accommodation },
                              { label: 'Living Expenses', value: selectedTwinning.cost.living },
                              { label: 'Insurance', value: selectedTwinning.cost.insurance },
                            ].map((c, i) => (
                              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-white/5 text-xs font-bold">
                                <span className="text-slate-500 uppercase tracking-wider text-[10px]">{c.label}</span>
                                <span className="text-slate-700">{c.value}</span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center py-3 bg-emerald-500/10 rounded-xl px-4 mt-4 border border-emerald-500/10">
                              <span className="text-emerald-700 font-black uppercase tracking-widest text-[10px]">Total Est. Cost</span>
                              <span className="text-emerald-700 font-black text-sm">{selectedTwinning.cost.total}</span>
                            </div>
                          </div>
                        </section>

                        {/* E. CAREER OPPORTUNITIES */}
                        <section className="bg-white dark:bg-dark-card border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md">
                          <h2 className="text-xl font-serif font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary" /> Career Opportunities
                          </h2>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedTwinning.careers.map((career, idx) => (
                              <div key={idx} className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-100 rounded-xl text-center flex flex-col items-center justify-center gap-2 hover:border-primary transition-all">
                                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">{career}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>

                      {/* Right details column */}
                      <div className="space-y-6">
                        {/* F. COUNTRY & VISA INFO */}
                        <aside className="bg-white dark:bg-dark-card border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md">
                          <h3 className="text-sm font-serif font-black text-slate-900 dark:text-white mb-4 flex items-center gap-1.5">
                            <Globe className="w-4 h-4 text-indigo-500" /> Country & Visa Info
                          </h3>
                          <div className="space-y-4">
                            {[
                              { label: 'Work Permit Duration', val: selectedTwinning.visaInfo.workPermit },
                              { label: 'Part-Time Work Rights', val: selectedTwinning.visaInfo.partTime },
                              { label: 'PR Opportunities', val: selectedTwinning.visaInfo.pr },
                              { label: 'Average Salary', val: selectedTwinning.visaInfo.avgSalary, highlight: true }
                            ].map((item, i) => (
                              <div key={i} className="pb-3 border-b border-slate-50 last:border-b-0 dark:border-white/5">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{item.label}</span>
                                <p className={`text-[10px] font-bold leading-relaxed ${item.highlight ? 'text-primary font-black text-xs' : 'text-slate-700'}`}>{item.val}</p>
                              </div>
                            ))}
                          </div>
                        </aside>

                        {/* G. ADMISSION REQUIREMENTS */}
                        <aside className="bg-white dark:bg-dark-card border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md">
                          <h3 className="text-sm font-serif font-black text-slate-900 dark:text-white mb-4 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-orange-500" /> Admission Requirements
                          </h3>
                          <div className="space-y-4">
                            <div className="pb-3 border-b border-slate-50 dark:border-white/5">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Min Percentage</span>
                              <p className="text-[10px] font-bold text-slate-700">{selectedTwinning.admissions.percentage}</p>
                            </div>
                            <div className="pb-3 border-b border-slate-50 dark:border-white/5">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">IELTS/PTE Requirements</span>
                              <p className="text-[10px] font-bold text-slate-700">{selectedTwinning.admissions.ielts}</p>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Required Documents</span>
                              <div className="flex flex-wrap gap-1">
                                {selectedTwinning.admissions.docs.map((doc, idx) => (
                                  <span key={idx} className="bg-slate-50 dark:bg-white/5 px-2 py-1 rounded text-[8px] font-bold text-slate-500 border border-slate-100">
                                    {doc}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </aside>

                        {/* H. PARTNER INSTITUTIONS */}
                        <aside className="bg-white dark:bg-dark-card border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md">
                          <h3 className="text-sm font-serif font-black text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                            <Building className="w-4 h-4 text-emerald-500" /> Partner Institutions
                          </h3>
                          <div className="space-y-2">
                            {selectedTwinning.partners.map((p, idx) => (
                              <div key={idx} className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 rounded-lg flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="text-[10px] font-bold text-slate-800 leading-snug">{p}</span>
                              </div>
                            ))}
                          </div>
                        </aside>
                      </div>
                    </div>

                    {/* I. FAQs Accordion */}
                    <section className="bg-white dark:bg-dark-card border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md max-w-3xl">
                      <h2 className="text-lg font-serif font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-primary" /> FAQs
                      </h2>
                      <div className="space-y-3">
                        {selectedTwinning.faqs.map((faq, idx) => {
                          const isActive = activeFaq === idx;
                          return (
                            <div key={idx} className="border-b border-slate-100 dark:border-white/5 pb-3 last:border-0 last:pb-0">
                              <button
                                onClick={() => setActiveFaq(isActive ? null : idx)}
                                className="w-full flex justify-between items-center text-left py-1.5 font-serif font-bold text-slate-900 dark:text-white text-sm"
                              >
                                <span>{faq.q}</span>
                                {isActive ? <ChevronUp className="w-4 h-4 text-primary shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                              </button>
                              
                              <AnimatePresence>
                                {isActive && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden"
                                  >
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed pt-1.5">
                                      {faq.a}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA footer */}
        <div className="mt-16 text-center p-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/30">
          <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">
            Can't find what you're looking for?
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
            Explore 700+ Indian universities with state-wise filters, NAAC grades, and NIRF rankings.
          </p>
          <Link to="/universities" className="btn-primary gap-2">
            <Globe className="w-4 h-4" />
            Browse All Universities
          </Link>
        </div>
      </div>
    </div>
  );
}
