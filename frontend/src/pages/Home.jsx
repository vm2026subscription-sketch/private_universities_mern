import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Users, ArrowRight, MapPin, ChevronRight, Bell, Target, Stethoscope, Briefcase, Scale, Palette, Building2, Wheat, Atom, ShoppingCart, Pill, Heart, BookMarked, MessageSquare, ThumbsUp, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { useAiChat } from '../context/AiChatContext';

const stats = [
  { icon: MapPin, value: '35+', label: 'States' },
  { icon: GraduationCap, value: '500+', label: 'Universities' },
  { icon: BookOpen, value: '200+', label: 'Courses' },
  { icon: Users, value: '50000+', label: 'Students' },
];

const courseCategories = [
  { name: 'Engineering', icon: Building2 }, { name: 'Medical', icon: Stethoscope },
  { name: 'Management', icon: Briefcase }, { name: 'Law', icon: Scale },
  { name: 'Architecture', icon: Building2 }, { name: 'Design', icon: Palette },
  { name: 'Agriculture', icon: Wheat }, { name: 'Science', icon: Atom },
  { name: 'Commerce', icon: ShoppingCart }, { name: 'Pharmacy', icon: Pill },
  { name: 'Nursing', icon: Heart }, { name: 'Arts', icon: BookMarked },
];

const tabItems = [
  { label: 'Exams' },
  { label: 'Notifications' },
  { label: 'University Comparison' },
  { label: 'Test Series', href: 'https://admin-panel-three-sable.vercel.app/' },
];

export default function Home() {
  const { openChat } = useAiChat();
  const [activeTab, setActiveTab] = useState(0);
  const [exams, setExams] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/exams/upcoming').catch(() => ({ data: { data: [] } })),
      api.get('/universities?limit=8').catch(() => ({ data: { data: [] } })),
      api.get('/questions').catch(() => ({ data: { data: [] } })),
    ]).then(([e, u, q]) => {
      setExams(e.data.data || []);
      setUniversities(u.data.data || []);
      setQuestions((q.data.data || []).slice(0, 5));
      setLoading(false);
    });
  }, []);

  return (
    <div className="pb-20 md:pb-0">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
              Find Your Perfect <span className="text-primary">University</span> in India
            </h1>
            <p className="text-lg md:text-xl text-light-muted dark:text-dark-muted mb-8">
              Explore 500+ Private and Deemed Universities across all major Indian states
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/universities" className="btn-primary inline-flex items-center gap-2 justify-center">
                Explore Universities <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/compare-universities" className="btn-outline inline-flex items-center gap-2 justify-center">
                Compare Universities <Target className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map((s, i) => (
              <div key={i} className="card p-4 text-center">
                <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-light-muted dark:text-dark-muted">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Explore Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
          {tabItems.map((tab, i) => (
            tab.href ? (
              <a
                key={tab.label}
                href={tab.href}
                target="_blank"
                rel="noreferrer"
                className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-light-card dark:bg-dark-card hover:bg-primary-50 dark:hover:bg-dark-border inline-flex items-center gap-2"
              >
                {tab.label} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button key={tab.label} onClick={() => setActiveTab(i)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === i ? 'bg-primary text-white' : 'bg-light-card dark:bg-dark-card hover:bg-primary-50 dark:hover:bg-dark-border'}`}>
                {tab.label}
              </button>
            )
          ))}
        </div>

        {activeTab === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((e, i) => (
              <div key={i} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{e.name}</h3>
                    <span className="badge badge-blue mt-1">{e.shortName}</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="text-light-muted">Conducting Body:</span> {e.conductingBody}</p>
                  <p><span className="text-light-muted">Exam Date:</span> {e.examDate && new Date(e.examDate).toLocaleDateString()}</p>
                  <p><span className="text-light-muted">Registration Deadline:</span> {e.registrationDeadline && new Date(e.registrationDeadline).toLocaleDateString()}</p>
                  <p className="text-xs text-light-muted">{e.eligibility}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 1 && (
          <div className="space-y-4">
            {[
              { title: 'JEE Main 2026 Session 1 Registration Open', type: 'Admission', date: 'Nov 2025' },
              { title: 'NEET UG 2026 Application Form Released', type: 'Admission', date: 'Mar 2026' },
              { title: 'CAT 2025 Results Declared', type: 'Result', date: 'Jan 2026' },
              { title: 'GATE 2026 Admit Card Available', type: 'Deadline', date: 'Jan 2026' },
            ].map((n, i) => (
              <div key={i} className="card p-4 flex items-center gap-4">
                <Bell className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{n.title}</h4>
                  <p className="text-xs text-light-muted">{n.date}</p>
                </div>
                <span className="badge badge-orange">{n.type}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 2 && (
          <div className="card p-8 max-w-lg mx-auto text-center">
            <Target className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">University Comparison</h3>
            <p className="text-light-muted dark:text-dark-muted mb-6">Select multiple universities and compare fees, placements, approvals, exams, and course options from backend data.</p>
            <Link to="/compare-universities" className="btn-primary inline-flex items-center gap-2">
              Start Comparison <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      {/* Popular Universities */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Popular Universities</h2>
          <Link to="/universities" className="text-primary font-medium text-sm flex items-center gap-1 hover:underline">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? <CardSkeleton count={4} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {universities.slice(0, 8).map((u, i) => (
              <Link key={i} to={`/universities/${u.slug}`} className="card p-5 hover:border-primary transition-colors">
                <h3 className="font-semibold mb-2 line-clamp-1">{u.name}</h3>
                <p className="text-sm text-light-muted dark:text-dark-muted flex items-center gap-1 mb-3">
                  <MapPin className="w-3 h-3" /> {u.city}, {u.state}
                </p>
                <div className="flex gap-2 flex-wrap mb-3">
                  {u.naacGrade && <span className="badge badge-green">NAAC {u.naacGrade}</span>}
                  {u.nirfRank && <span className="badge badge-blue">NIRF #{u.nirfRank}</span>}
                </div>
                <div className="text-xs text-light-muted">
                  {u.stats?.avgPackageLPA && <span>Avg: ₹{u.stats.avgPackageLPA} LPA</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Course Categories */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8">Browse by Course Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {courseCategories.map((c, i) => (
            <Link key={i} to={`/courses?category=${c.name}`} className="card p-4 text-center hover:border-primary transition-colors group">
              <c.icon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium">{c.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Q&A Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Got a Question?</h2>
            <p className="text-light-muted dark:text-dark-muted text-sm mt-1">Ask about admissions, courses, or fees</p>
          </div>
          <button type="button" onClick={openChat} className="btn-primary text-sm !py-2 !px-4 hidden md:inline-flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Ask with Gemini
          </button>
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <button key={i} type="button" onClick={openChat} className="card p-4 flex items-center gap-4 hover:border-primary transition-colors w-full text-left">
              <div className="text-center shrink-0">
                <ThumbsUp className="w-4 h-4 text-primary mx-auto" />
                <span className="text-xs font-medium">{q.upvotes?.length || 0}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-1">{q.title}</h4>
                <p className="text-xs text-light-muted mt-1">{q.answers?.length || 0} answers · {q.category}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
