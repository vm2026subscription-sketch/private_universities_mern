import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, BookOpen, Users, ArrowRight, MapPin, ChevronRight,
  Bell, Target, Stethoscope, Briefcase, Scale, Palette, Building2,
  Wheat, Atom, ShoppingCart, Pill, Heart, BookMarked, MessageSquare,
  ShieldCheck, FileDown, Sparkles, PhoneCall,
  School, Trophy, Newspaper, Search, ThumbsUp,
  Calendar, Award, DollarSign, Plus, X, Star
} from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { useAiChat } from '../context/AiChatContext';

const mockUniversities = [
  { name: 'SAGE University', city: 'Indore', state: 'MP', slug: 'sage-university-indore', naacGrade: 'A+', stats: { avgPackageLPA: '5.5' }, logo: 'https://ui-avatars.com/api/?name=SAGE+University&background=FF6B00&color=fff&bold=true' },
  { name: 'Thakur College of Engineering', city: 'Mumbai', state: 'MH', slug: 'thakur-college-of-engineering-and-technology', naacGrade: 'A', stats: { avgPackageLPA: '4.8' }, logo: 'https://ui-avatars.com/api/?name=TCET&background=FF6B00&color=fff&bold=true' },
  { name: 'Amity University', city: 'Noida', state: 'UP', slug: 'amity-university-noida', naacGrade: 'A+', stats: { avgPackageLPA: '6.2' }, logo: 'https://ui-avatars.com/api/?name=Amity&background=FF6B00&color=fff&bold=true' },
  { name: 'MIT-ADT University', city: 'Pune', state: 'MH', slug: 'mit-adt-university-pune', naacGrade: 'A+', stats: { avgPackageLPA: '5.2' }, logo: 'https://ui-avatars.com/api/?name=MIT-ADT&background=FF6B00&color=fff&bold=true' },
  { name: 'Chandigarh University', city: 'Mohali', state: 'PB', slug: 'chandigarh-university', naacGrade: 'A+', stats: { avgPackageLPA: '7.5' }, logo: 'https://ui-avatars.com/api/?name=CU&background=FF6B00&color=fff&bold=true' },
  { name: 'COEP Technological University', city: 'Pune', state: 'MH', slug: 'coep-pune', naacGrade: 'A++', stats: { avgPackageLPA: '9.5' }, logo: 'https://ui-avatars.com/api/?name=COEP&background=FF6B00&color=fff&bold=true' },
  { name: 'SRM University', city: 'Chennai', state: 'TN', slug: 'srm-university-chennai', naacGrade: 'A++', stats: { avgPackageLPA: '6.5' }, logo: 'https://ui-avatars.com/api/?name=SRM&background=FF6B00&color=fff&bold=true' },
  { name: 'VIT Vellore', city: 'Vellore', state: 'TN', slug: 'vit-vellore', naacGrade: 'A++', stats: { avgPackageLPA: '8.2' }, logo: 'https://ui-avatars.com/api/?name=VIT&background=FF6B00&color=fff&bold=true' },
  { name: 'Symbiosis International', city: 'Pune', state: 'MH', slug: 'symbiosis-pune', naacGrade: 'A', stats: { avgPackageLPA: '7.0' }, logo: 'https://ui-avatars.com/api/?name=SIU&background=FF6B00&color=fff&bold=true' },
  { name: 'Lovely Professional University', city: 'Phagwara', state: 'PB', slug: 'lpu-punjab', naacGrade: 'A++', stats: { avgPackageLPA: '5.8' }, logo: 'https://ui-avatars.com/api/?name=LPU&background=FF6B00&color=fff&bold=true' },
];

const mockExams = [
  { shortName: 'JEE Main', name: 'Joint Entrance Examination', conductingBody: 'NTA', examDate: '2026-04-15' },
  { shortName: 'MHT CET', name: 'Maharashtra Common Entrance Test', conductingBody: 'State CET Cell', examDate: '2026-05-10' },
];

const mockQuestions = [
  { title: 'What is the average package at SAGE University Indore?', upvotes: [1, 2, 3], answers: [1, 2] },
  { title: 'Best engineering colleges under PERA CET?', upvotes: [1, 2, 3, 4, 5], answers: [1, 2, 3] },
  { title: 'When will PERA CET 2026 applications start?', upvotes: [1, 2], answers: [1] },
];

const stats = [
  { icon: MapPin, value: '29+', label: 'States' },
  { icon: GraduationCap, value: '500+', label: 'Universities' },
  { icon: BookOpen, value: '200+', label: 'Courses' },
  { icon: Users, value: '50,000+', label: 'Students' },
];

const mainStreams = [
  { name: 'MBA/PGDM', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
  { name: 'Engineering', icon: Building2, color: 'text-orange-500', bg: 'bg-orange-50' },
  { name: 'Medical', icon: Stethoscope, color: 'text-red-500', bg: 'bg-red-50' },
  { name: 'Design', icon: Palette, color: 'text-purple-500', bg: 'bg-purple-50' },
  { name: 'Law', icon: Scale, color: 'text-slate-500', bg: 'bg-slate-50' },
  { name: 'Science', icon: Atom, color: 'text-green-500', bg: 'bg-green-50' },
  { name: 'Study Abroad', icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-50' },
];

const featuredUniversities = [
  {
    _id: '69f9c6e51a40e83778437bb8',
    name: 'Thakur College of Engineering (TCET)',
    location: 'Mumbai, Maharashtra',
    image: 'https://images.shiksha.com/mediadata/images/1489300063phpA1CPrW.jpeg',
  },
  {
    _id: '69f9c6b91a40e8377843776c',
    name: 'Amity University Chhattisgarh',
    location: 'Raipur, Chhattisgarh',
    image: 'https://images.shiksha.com/mediadata/images/articles/1663141472phpCZG1Ea.jpeg',
  },
  {
    _id: '69f9c6be1a40e837784377a8',
    name: 'SAGE University',
    location: 'Indore, Madhya Pradesh',
    image: 'https://spiderimg.amarujala.com/assets/images/2020/06/27/750x506/sage-university_1593237922.jpeg',
  },
  {
    _id: '69f9c6bb1a40e83778437778',
    name: 'OP Jindal University',
    location: 'Raigarh, Chhattisgarh',
    image: 'https://educationpost.in/_next/image?url=https%3A%2F%2Fapi.educationpost.in%2Fs3-images%2F1747130783336-OP%20Jindal%20University.jpg&w=3840&q=75',
  },
];

const popularCities = ['Pune', 'Mumbai', 'Bangalore', 'Delhi NCR', 'Hyderabad', 'Chennai'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function Home() {
  const { openChat } = useAiChat();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [exams, setExams] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uniRes, examRes, testRes] = await Promise.all([
          api.get('/universities?limit=50').catch(() => ({ data: { data: [] } })),
          api.get('/exams/upcoming').catch(() => ({ data: { data: [] } })),
          api.get('/public/testimonials').catch(() => ({ data: { data: [] } }))
        ]);

        if (uniRes.data.success) {
          let fetched = uniRes.data.data || [];

          // Priority institutions we want at top
          const priority = ['Thakur', 'Amity', 'SAGE', 'Jindal', 'ITM', 'ISBM', 'AAFT', 'C.V. Raman', 'Dev Sanskriti'];

          const sorted = fetched.sort((a, b) => {
            // First: universities with logos
            const aHasLogo = (a.logoUrl && a.logoUrl.trim() !== '') ? 1 : 0;
            const bHasLogo = (b.logoUrl && b.logoUrl.trim() !== '') ? 1 : 0;
            if (aHasLogo !== bHasLogo) return bHasLogo - aHasLogo;

            // Then: priority name match
            const aP = priority.findIndex(p => a.name.includes(p));
            const bP = priority.findIndex(p => b.name.includes(p));
            if (aP !== -1 && bP === -1) return -1;
            if (bP !== -1 && aP === -1) return 1;
            return (aP === -1 ? 999 : aP) - (bP === -1 ? 999 : bP);
          });

          setUniversities(sorted.length > 0 ? sorted.slice(0, 6) : mockUniversities.slice(0, 6));
        }
        if (examRes.data.success) setExams(examRes.data.data.length > 0 ? examRes.data.data : mockExams);
        if (testRes.data.success) setQuestions(testRes.data.data.length > 0 ? testRes.data.data : mockQuestions);
      } catch (error) {
        console.error('Data fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredUniversities.length);
    }, 5000);

    return () => clearInterval(slideInterval);
  }, []);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      await api.post('/public/testimonials', data);
      alert('Thank you! Your feedback has been submitted for review.');
      setShowFeedback(false);
    } catch (error) {
      alert('Submission failed. Please try again.');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    navigate(`/universities?search=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <div className="bg-[#f8fafc] dark:bg-dark-bg min-h-screen pb-20 overflow-x-hidden">
      {/* Hero Section - Shiksha-style rotating campus background */}
      <section className="relative h-[600px] md:h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Rotating Campus Background */}
        <AnimatePresence mode="sync">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
          >
            <img
              src={featuredUniversities[currentSlide % featuredUniversities.length].image}
              alt={featuredUniversities[currentSlide % featuredUniversities.length].name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => navigate(`/universities/${featuredUniversities[currentSlide % featuredUniversities.length]._id}`)}
              onError={(e) => { e.target.style.opacity = '0'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/75"></div>
          </motion.div>
        </AnimatePresence>

        {/* Slide indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-30">
          {featuredUniversities.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === currentSlide % featuredUniversities.length ? 'w-8 bg-primary' : 'w-2 bg-white/40'
                }`}
            />
          ))}
        </div>

        {/* Currently featured university tag - clickable */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30">
          <motion.button
            key={`tag-${currentSlide}`}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => navigate(`/universities/${featuredUniversities[currentSlide % featuredUniversities.length]._id}`)}
            className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 hover:bg-primary/80 hover:border-primary transition-all cursor-pointer group"
          >
            <GraduationCap className="w-4 h-4 text-primary group-hover:text-white" />
            <span className="text-white font-bold text-sm">{featuredUniversities[currentSlide % featuredUniversities.length].name}</span>
            <span className="text-white/50 text-xs">— {featuredUniversities[currentSlide % featuredUniversities.length].location}</span>
            <span className="text-primary group-hover:text-white text-xs font-bold ml-1">View →</span>
          </motion.button>
        </div>

        <div className="max-w-7xl mx-auto px-4 text-center relative z-20 -mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-white drop-shadow-lg leading-tight">
              Discover Top <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-orange-500">Universities</span> in India
            </h1>
            <p className="text-white/90 drop-shadow-md mb-10 text-lg md:text-xl max-w-2xl mx-auto font-medium">
              Explore simplified admissions, authentic campus details, and directly connect with institutions.
            </p>

            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto group">
              <div className="relative flex shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden bg-white p-1">
                <div className="flex items-center pl-5 pr-3">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for a university..."
                  className="w-full py-4 bg-transparent text-slate-900 text-lg font-bold placeholder:text-slate-400 focus:outline-none"
                />
                <button type="submit" className="bg-gradient-to-r from-fuchsia-600 to-orange-500 hover:from-fuchsia-500 hover:to-orange-400 text-white px-8 md:px-12 font-black text-base transition-all whitespace-nowrap rounded-xl shadow-lg shadow-orange-500/25 active:scale-95">
                  Search
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-30">
        <div className="bg-white dark:bg-dark-card shadow-2xl rounded-[2.5rem] p-8 md:p-10 flex flex-wrap justify-between gap-8 border border-slate-100 dark:border-white/5">
          {stats.map((s, i) => (
            <div key={i} className="relative flex items-center gap-4 flex-1 min-w-[150px] justify-center md:justify-start p-4 rounded-2xl group overflow-hidden cursor-default">
              {/* Left-to-right animated background (Gradient matching SS1) */}
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-700 to-orange-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out z-0" />

              <div className="relative z-10 flex items-center gap-4 w-full justify-center md:justify-start">
                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 group-hover:bg-white/20 rounded-2xl transition-colors duration-500">
                  <s.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-500" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-white transition-colors duration-500 leading-none">{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 group-hover:text-blue-100 uppercase tracking-widest mt-1 transition-colors duration-500">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <p className="text-primary font-black text-xs uppercase tracking-[0.3em] mb-4">The Vidyarthi Mitra Edge</p>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white">Why 50,000+ Students Trust Us</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {[
            { icon: ShieldCheck, title: 'Verified Information', desc: 'Directly sourced from university administration.', bgClass: 'bg-orange-50/50 dark:bg-orange-900/10', iconColor: 'text-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/20' },
            { icon: FileDown, title: 'One-Click Brochures', desc: 'Download official prospectuses instantly.', bgClass: 'bg-blue-50/50 dark:bg-blue-900/10', iconColor: 'text-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-900/20' },
            { icon: Users, title: 'Student Community', desc: 'Connect with peers and alumni.', bgClass: 'bg-fuchsia-50/50 dark:bg-fuchsia-900/10', iconColor: 'text-fuchsia-500', iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/20' },
            { icon: PhoneCall, title: 'Direct Campus Connect', desc: 'Speak directly with admission officers.', bgClass: 'bg-emerald-50/50 dark:bg-emerald-900/10', iconColor: 'text-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/20' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`relative p-8 ${item.bgClass} rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-primary/20 transition-all group text-center overflow-hidden`}
            >
              {/* Left-to-right animated background (Gradient matching SS1) */}
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-700 to-orange-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out z-0" />

              <div className="relative z-10">
                <div className={`w-16 h-16 ${item.iconBg} group-hover:bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-all duration-500`}>
                  <item.icon className={`w-8 h-8 ${item.iconColor} group-hover:text-white transition-colors duration-500`} />
                </div>
                <h4 className="font-black text-lg mb-3 text-slate-900 dark:text-white group-hover:text-white transition-colors duration-500">{item.title}</h4>
                <p className="text-sm text-slate-500 group-hover:text-white/90 transition-colors duration-500 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Explore by State Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Explore by State</h2>
          <Link to="/universities" className="text-primary font-bold text-sm">View All States</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[
            { name: 'Maharashtra', count: '150+ Colleges', img: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?q=80&w=800', landmark: 'Mumbai Skyline', color: 'from-blue-900 to-blue-700' },
            { name: 'Gujarat', count: '80+ Colleges', img: 'data:image/jpeg;base64,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', landmark: 'Statue of Unity', color: 'from-amber-900 to-orange-700' },
            { name: 'Rajasthan', count: '120+ Colleges', img: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=800', landmark: 'Amber Fort', color: 'from-yellow-900 to-yellow-700' },
            { name: 'Uttar Pradesh', count: '200+ Colleges', img: 'data:image/jpeg;base64,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', landmark: 'Taj Mahal', color: 'from-slate-800 to-slate-600' },
            { name: 'Madhya Pradesh', count: '100+ Colleges', img: 'data:image/jpeg;base64,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', landmark: 'Khajuraho', color: 'from-red-900 to-red-700' },
            { name: 'Chhattisgarh', count: '60+ Colleges', img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800', landmark: 'Chitrakote Falls', color: 'from-green-900 to-green-700' },
          ].map((state, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="relative rounded-3xl overflow-hidden aspect-[4/5] group cursor-pointer"
              onClick={() => navigate(`/universities?state=${state.name}`)}
            >
              {/* Gradient fallback shown behind image */}
              <div className={`absolute inset-0 bg-gradient-to-br ${state.color} flex items-center justify-center`}>
                <span className="text-white/20 font-black text-6xl">{state.name[0]}</span>
              </div>
              <img
                src={state.img}
                alt={state.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
                <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mb-1">{state.landmark}</p>
                <h4 className="text-white font-black text-lg leading-tight">{state.name}</h4>
                <p className="text-primary text-[10px] font-bold uppercase tracking-widest mt-1">{state.count}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Top Recruiters */}
      <section className="bg-white/50 dark:bg-dark-card/50 py-16 border-y border-slate-100 dark:border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">Top Companies Hiring from our Partners</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 md:gap-x-24 transition-all duration-700">
            {[
              { name: 'Google', logo: 'data:image/png;base64,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' },
              { name: 'TCS', logo: 'data:image/png;base64,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' },
              { name: 'HP', logo: 'data:image/png;base64,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' },
              { name: 'KPMG', logo: 'data:image/png;base64,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' },
              { name: 'Shell', logo: 'data:image/png;base64,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' },
              { name: 'IBM', logo: 'data:image/png;base64,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' }
            ].map((c) => (
              <img
                key={c.name}
                src={c.logo}
                alt={c.name}
                className="h-8 md:h-12 w-auto object-contain transition-transform duration-500 hover:scale-110"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Streams */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8"
        >
          {mainStreams.map((stream, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Link to={`/courses?category=${stream.name}`} className="relative flex flex-col items-center text-center group bg-white dark:bg-dark-card p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all overflow-hidden block w-full h-full">
                {/* Left-to-right animated background (Orange) */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out z-0" />

                <div className="relative z-10 flex flex-col items-center w-full">
                  <div className={`w-16 h-16 rounded-2xl ${stream.bg} dark:bg-slate-800/50 group-hover:bg-white/20 flex items-center justify-center mb-4 shadow-sm transition-all duration-500`}>
                    <stream.icon className={`w-8 h-8 ${stream.color} group-hover:text-white transition-colors duration-500`} />
                  </div>
                  <p className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors duration-500 uppercase">{stream.name}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Sticky Feedback Tab */}
      <motion.div
        initial={{ x: -100 }}
        animate={{ x: 0 }}
        onClick={() => setShowFeedback(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[60] bg-primary text-white py-6 px-2 rounded-r-xl cursor-pointer shadow-2xl border-l-[6px] border-transparent hover:bg-white hover:text-primary hover:border-orange-500 hover:pl-4 transition-all duration-300 group flex items-center justify-center"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        <span className="font-black tracking-[0.2em] text-sm uppercase">FEEDBACK</span>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-16">
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-2 h-8 bg-primary rounded-full"></div> Admissions & Tools
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <motion.div whileHover={{ y: -5 }} className="relative overflow-hidden p-6 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-xl group">
                <div className="relative z-10 flex flex-col h-full">
                  <span className="bg-white/20 text-[10px] font-black px-3 py-1 rounded-full uppercase self-start">Maharashtra State</span>
                  <h3 className="font-black text-2xl mt-4 mb-2">DTE Admissions</h3>
                  <p className="text-sm text-white/80 mb-6 flex-grow">Complete guide to Engineering, Pharmacy & MBA admissions.</p>
                  <button className="w-full bg-white text-indigo-600 font-black py-3 rounded-2xl text-sm transition-all hover:shadow-2xl mt-auto">
                    View Updates
                  </button>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -5 }} className="relative overflow-hidden p-6 rounded-[2rem] bg-gradient-to-br from-primary to-orange-500 text-white shadow-xl group">
                <div className="relative z-10 flex flex-col h-full">
                  <span className="bg-white/20 text-[10px] font-black px-3 py-1 rounded-full uppercase self-start">Tool</span>
                  <h3 className="font-black text-2xl mt-4 mb-2">Rank Predictor</h3>
                  <p className="text-sm text-white/80 mb-6 flex-grow">Predict potential colleges based on your scores.</p>
                  <Link to="/rank-predictor" className="w-full bg-white text-primary font-black py-3 rounded-2xl text-sm transition-all hover:shadow-2xl mt-auto flex justify-center items-center">
                    Predict Now
                  </Link>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -5 }} className="relative overflow-hidden p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl group border border-white/10">
                <div className="relative z-10 flex flex-col h-full">
                  <span className="bg-primary text-[10px] font-black px-3 py-1 rounded-full uppercase text-white self-start">Private Unis</span>
                  <h3 className="font-black text-2xl mt-4 mb-2">PERA CET</h3>
                  <p className="text-sm text-white/80 mb-6 flex-grow">Entrance for top private universities in Maharashtra.</p>
                  <button className="w-full bg-primary text-white font-black py-3 rounded-2xl text-sm transition-all hover:shadow-2xl mt-auto">
                    Apply Now
                  </button>
                </div>
              </motion.div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-2 h-8 bg-primary rounded-full"></div> Recommended for You
              </h2>
              <Link to="/universities" className="group flex items-center gap-1 text-primary text-sm font-bold">
                Explore All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(universities.length > 0 ? universities : mockUniversities).map((u, i) => (
                <motion.div key={i} whileHover={{ y: -5 }}>
                  <Link to={`/universities/${u._id}`} className="group relative bg-white dark:bg-dark-card p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 hover:border-transparent hover:shadow-2xl hover:shadow-primary/20 transition-all overflow-hidden block">
                    {/* Left-to-right animated background (Gradient matching SS1) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-700 to-orange-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out z-0" />

                    <div className="relative z-10 flex gap-6 items-center">
                      <div className="w-24 h-24 bg-white rounded-2xl shadow-sm flex items-center justify-center overflow-hidden border border-slate-50 group-hover:border-transparent transition-colors p-2 shrink-0">
                        {(u.logoUrl || u.logo) ? (
                          <img
                            src={u.logoUrl || u.logo}
                            alt={u.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`${(u.logoUrl || u.logo) ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-400 font-black text-2xl uppercase border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl`}>
                          {u.name.substring(0, 2)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-black text-lg line-clamp-1 group-hover:text-white transition-colors">{u.name}</h3>
                          <div className="flex items-center gap-1 bg-green-50 group-hover:bg-white/20 text-green-600 group-hover:text-white px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors">
                            <Award className="w-3 h-3" />
                            {u.naacGrade || 'A+'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-white/90 transition-colors mt-1 mb-4">
                          <MapPin className="w-3 h-3 text-primary group-hover:text-white transition-colors shrink-0" />
                          <span className="truncate">{u.city && u.city !== 'Unknown' ? `${u.city}, ` : ''}{u.state || 'India'}</span>
                        </div>

                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-[10px] text-slate-400 group-hover:text-white/80 transition-colors uppercase font-black tracking-widest">Avg Package</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-white transition-colors">₹{u.stats?.avgPackageLPA || '4.5'} LPA</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 group-hover:text-white/80 transition-colors uppercase font-black tracking-widest">Courses</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-white transition-colors">{u.stats?.totalCoursesCount || 12}+</p>
                          </div>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-sm shadow-sm">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link to="/universities" className="inline-flex items-center gap-3 bg-white dark:bg-dark-card border-2 border-primary text-primary hover:bg-primary hover:text-white px-10 py-4 rounded-2xl font-black transition-all group">
                EXPLORE ALL 500+ UNIVERSITIES
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
          </section>

          <section className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Users className="w-40 h-40" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-black italic">Words of Gratitude</h2>
                <div className="flex gap-2">
                  {[0, 1, 2].map((dot) => (
                    <div key={dot} className={`w-2 h-2 rounded-full transition-all ${dot === 0 ? 'bg-primary w-6' : 'bg-white/20'}`} />
                  ))}
                </div>
              </div>

              <div className="min-h-[200px]">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-16 h-16 bg-primary rounded-2xl shrink-0 flex items-center justify-center text-2xl font-black">
                      V
                    </div>
                    <div>
                      <p className="text-lg md:text-xl italic text-slate-300 leading-relaxed mb-6">
                        "Vidyarthimitra.org is a wonderful source of information for students seeking admissions. It helped me find the right college for my elder brother in Pune. One of the best sites I have ever seen!"
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-primary uppercase tracking-widest text-sm">Amol Kulkarni</p>
                          <p className="text-xs text-slate-500 font-bold">Pune, Engineering Aspirant</p>
                        </div>
                        <button
                          onClick={() => setShowFeedback(true)}
                          className="flex items-center gap-2 text-xs font-black bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all"
                        >
                          <MessageSquare className="w-4 h-4 text-primary" /> SHARE YOUR FEEDBACK
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <section className="bg-white dark:bg-dark-card rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-2xl">
            <div className="p-6 bg-gradient-to-r from-primary to-orange-400 text-white flex items-center justify-between">
              <h2 className="font-black text-lg">Alerts</h2>
              <Bell className="w-5 h-5" />
            </div>
            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {[
                { title: 'DTE Maharashtra Cut-offs 2024-25 Released', tag: 'New' },
                { title: 'Top 10 Private Universities for MBA in Pune', tag: 'Ranking' },
                { title: 'MHT-CET & JEE Online Mock Test Series', tag: 'Practice' },
                { title: 'Last Date for PERA CET 2026 Registration', tag: 'Alert' },
              ].map((n, i) => (
                <div key={i} className="p-5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-all group">
                  <span className="text-[9px] font-black uppercase text-primary">{n.tag}</span>
                  <h4 className="text-sm font-bold mt-2 group-hover:text-primary transition-colors">{n.title}</h4>
                </div>
              ))}
            </div>
          </section>

          <div className="card border-none shadow-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-[2.5rem] p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <Newspaper className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-primary rounded-full"></span> Latest Updates
              </h3>
              <div className="space-y-6">
                {[
                  { title: 'MAH-CET 2026 Registration Dates Announced', time: '2 hours ago', icon: Calendar },
                  { title: 'Top Engineering Colleges in Pune 2024 Ranking', time: '5 hours ago', icon: Award },
                  { title: 'New Scholarship for Private University Students', time: '1 day ago', icon: DollarSign },
                  { title: 'View Today\'s Educational E-Paper', time: 'Daily', icon: BookOpen, highlight: true },
                ].map((item, i) => (
                  <div key={i} className={`flex gap-4 group cursor-pointer ${item.highlight ? 'bg-primary/20 p-4 rounded-2xl border border-primary/30' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.highlight ? 'bg-primary' : 'bg-white/10'}`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold leading-tight group-hover:text-primary transition-colors ${item.highlight ? 'text-primary' : ''}`}>{item.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl text-xs transition-all border border-white/5">
                READ ALL NEWS
              </button>
            </div>
          </div>

          <section className="bg-white dark:bg-dark-card rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-8 shadow-2xl">
            <h2 className="font-black text-xl mb-8">Community</h2>
            <div className="space-y-6">
              {questions.map((q, i) => (
                <div key={i} className="group cursor-pointer border-b border-slate-50 dark:border-white/5 pb-4 last:border-none" onClick={openChat}>
                  <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{q.title}</h4>
                </div>
              ))}
            </div>
            <button onClick={openChat} className="w-full mt-8 py-4 bg-primary text-white text-xs font-black rounded-2xl shadow-xl shadow-primary/30">
              ASK A QUESTION
            </button>
          </section>

          <section className="bg-gradient-to-br from-indigo-700 to-primary p-10 rounded-[2.5rem] text-white">
            <h2 className="text-2xl font-black mb-4">Stay Ahead</h2>
            <p className="text-sm text-indigo-100 mb-8 opacity-90">Get the latest admission alerts and entrance exam tips directly in your inbox.</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Email" className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 text-sm outline-none" />
              <button className="bg-white text-primary px-6 py-3 rounded-xl font-black text-xs">JOIN</button>
            </div>
          </section>
        </div>
      </div>
      {/* Advanced Feedback Modal */}
      <AnimatePresence>
        {showFeedback && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFeedback(false)}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-dark-card w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]"
            >
              {/* Form Header */}
              <div className="bg-gradient-to-r from-orange-500 to-primary p-6 md:p-8 flex justify-between items-center">
                <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">Feedback Form</h2>
                <button onClick={() => setShowFeedback(false)} className="text-white/50 hover:text-white transition-colors">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <form onSubmit={handleFeedbackSubmit} className="p-8 md:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  {/* Left Side: Form Fields */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 block mb-2 tracking-widest">Name *</label>
                        <input name="name" required type="text" placeholder="Enter your name" className="w-full border border-slate-200 rounded-lg p-4 text-sm focus:border-primary outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 block mb-2 tracking-widest">Mobile</label>
                        <input name="mobile" type="text" placeholder="Mobile Number" className="w-full border border-slate-200 rounded-lg p-4 text-sm focus:border-primary outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 block mb-2 tracking-widest">Email ID *</label>
                        <input name="email" required type="email" placeholder="Enter your Email Id" className="w-full border border-slate-200 rounded-lg p-4 text-sm focus:border-primary outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 block mb-2 tracking-widest">Designation *</label>
                        <input name="role" required type="text" placeholder="Enter your Designation" className="w-full border border-slate-200 rounded-lg p-4 text-sm focus:border-primary outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 block mb-2 tracking-widest">Feedback *</label>
                        <textarea name="content" required placeholder="Write your review.." className="w-full border border-slate-200 rounded-lg p-4 text-sm h-32 focus:border-primary outline-none resize-none transition-all" />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button type="submit" className="px-12 bg-green-600 text-white font-black py-4 rounded-lg hover:bg-green-700 transition-all uppercase tracking-widest shadow-lg shadow-green-600/20">Submit</button>
                      <button type="button" onClick={() => setShowFeedback(false)} className="px-12 bg-red-500 text-white font-black py-4 rounded-lg hover:bg-red-600 transition-all uppercase tracking-widest shadow-lg shadow-red-500/20">Cancel</button>
                    </div>
                  </div>

                  {/* Right Side: Avatar Section */}
                  <div className="lg:col-span-4 space-y-10">
                    <div>
                      <label className="text-xs font-black uppercase text-slate-500 block mb-4 tracking-widest">Avatar Upload</label>
                      <div className="flex items-center gap-2 border border-slate-200 p-2 rounded-lg">
                        <label className="bg-slate-100 px-4 py-2 rounded border border-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-200">
                          Choose file
                          <input type="file" className="hidden" onChange={handleAvatarChange} />
                        </label>
                        <span className="text-[10px] text-slate-400 truncate">
                          {avatarPreview ? 'Image Selected' : 'No file chosen'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-black uppercase text-slate-500 block mb-2 tracking-widest">Avatar Preview</label>
                      <div className="w-full aspect-[4/3] bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden relative group">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <img src="https://ui-avatars.com/api/?name=VM&background=0f172a&color=fff&size=512" alt="Default Preview" className="w-48 h-48 opacity-20 grayscale" />
                        )}
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Plus className="w-12 h-12 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
