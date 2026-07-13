import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
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
import Seo from '../components/common/Seo';
import { siteJsonLd } from '../utils/seo';
import { useAiChat } from '../context/AiChatContext';
import UniversityLogo from '../components/common/UniversityLogo';
import LeadCaptureModal from '../components/university/LeadCaptureModal';
import HeroBannerSlider from '../components/ads/HeroBannerSlider';
import SponsoredUniversities from '../components/ads/SponsoredUniversities';
import SidebarAds from '../components/ads/SidebarAds';
import { EmptyState, Card } from '../components/ui';
import { toast } from 'react-hot-toast';
import img_gujarat from '../assets/states/gujarat.jpg';
import img_uttar_pradesh from '../assets/states/uttar-pradesh.jpg';
import img_madhya_pradesh from '../assets/states/madhya-pradesh.jpg';

// Fallback universities shown when the API is unavailable.
// Slugs here are verified to exist in the live MongoDB database.


const mainStreams = [
  { name: 'MBA/PGDM', icon: Briefcase, color: 'text-orange-500', bg: 'bg-orange-50' },
  { name: 'Engineering', icon: Building2, color: 'text-orange-500', bg: 'bg-orange-50' },
  { name: 'Medical', icon: Stethoscope, color: 'text-red-500', bg: 'bg-red-50' },
  { name: 'Design', icon: Palette, color: 'text-purple-500', bg: 'bg-purple-50' },
  { name: 'Law', icon: Scale, color: 'text-slate-500', bg: 'bg-slate-50' },
  { name: 'Science', icon: Atom, color: 'text-green-500', bg: 'bg-green-50' },
  { name: 'Study Abroad', icon: GraduationCap, color: 'text-amber-500', bg: 'bg-amber-50' },
];

// Maps display stream names (shown on home page) to the actual stream values stored in MongoDB.
// This is required because the home page uses short/friendly labels while the DB uses canonical names.
const STREAM_TO_DB_MAP = {
  'MBA/PGDM': 'Management',
  'Engineering': 'Engineering',
  'Medical': 'Medical & Health Sciences',
  'Design': 'Design & Architecture',
  'Law': 'Law',
  'Science': 'Science',
};

const getStreamLink = (streamName) => {
  if (streamName === 'Study Abroad') {
    return '/foreign-universities';
  }
  // Translate display name to actual DB stream value (fixes "No courses found" for MBA/PGDM, Medical, Design)
  const dbStream = STREAM_TO_DB_MAP[streamName] || streamName;
  return `/courses?stream=${encodeURIComponent(dbStream)}`;
};

// NOTE: All slugs and _ids below are verified against the live MongoDB database.
// Do NOT use placeholder IDs — the detail page will return 404 if the university doesn't exist in the DB.
// Featured hero slider. Each entry's name/slug must match the image shown.
// Cards link by slug via getUniversityPath, so a card resolves to its detail
// page as soon as that university exists in the database (University tab).
// Thakur (TCET) has no DB record yet; its slug is the exact value the admin
// slug generator will produce for "Thakur College of Engineering & Technology",
// so the card will link correctly the moment it is added.
const featuredUniversities = [
  {
    _id: '6a269926472e7e99bfe1c384',
    name: 'Amity University',
    slug: 'amity-university',
    location: 'Ranchi, Jharkhand',
    accent: 'from-emerald-950 via-emerald-700 to-lime-400',
    image: 'https://images.shiksha.com/mediadata/images/articles/1663141472phpCZG1Ea.jpeg',
  },
  {
    _id: '6a38fc86588d1a5e44eea1b0',
    name: 'Sage University',
    slug: 'sage-university',
    location: 'Indore, Madhya Pradesh',
    accent: 'from-violet-950 via-orange-700 to-orange-500',
    image: 'https://spiderimg.amarujala.com/assets/images/2020/06/27/750x506/sage-university_1593237922.jpeg',
  },
  {
    name: 'Thakur College of Engineering & Technology',
    slug: 'thakur-college-of-engineering-and-technology',
    location: 'Mumbai, Maharashtra',
    accent: 'from-sky-950 via-blue-800 to-cyan-500',
    image: 'https://images.shiksha.com/mediadata/images/1489300063phpA1CPrW.jpeg',
  },
  {
    _id: '6a3391b806c08386a299b207',
    name: 'O.P. Jindal University',
    slug: 'op-jindal-university',
    location: 'Raigarh, Chhattisgarh',
    accent: 'from-slate-950 via-slate-700 to-amber-500',
    image: 'https://educationpost.in/_next/image?url=https%3A%2F%2Fapi.educationpost.in%2Fs3-images%2F1747130783336-OP%20Jindal%20University.jpg&w=3840&q=75',
  },
];

const HOME_CACHE_KEY = 'vm_home_cache';
const HOME_CACHE_TTL_MS = 5 * 60 * 1000;

const getCachedHomeData = () => {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.sessionStorage.getItem(HOME_CACHE_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue);
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > HOME_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(HOME_CACHE_KEY);
      return null;
    }

    return parsed.data || null;
  } catch {
    window.sessionStorage.removeItem(HOME_CACHE_KEY);
    return null;
  }
};

const setCachedHomeData = (data) => {
  if (typeof window === 'undefined') return;

  window.sessionStorage.setItem(
    HOME_CACHE_KEY,
    JSON.stringify({
      timestamp: Date.now(),
      data,
    })
  );
};

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
  const [cachedHomeData] = useState(() => getCachedHomeData());
  const [searchTerm, setSearchTerm] = useState('');
  const [exams, setExams] = useState(() => cachedHomeData?.exams || []);
  const [universities, setUniversities] = useState(() => cachedHomeData?.universities || []);
  const [questions, setQuestions] = useState(() => cachedHomeData?.questions || []);
  const [news, setNews] = useState(() => cachedHomeData?.news || []);
  const [testimonials, setTestimonials] = useState(() => cachedHomeData?.testimonials || []);
  const [uniTotal, setUniTotal] = useState(() => cachedHomeData?.uniTotal ?? null);
  const [stateCounts, setStateCounts] = useState(() => cachedHomeData?.stateCounts || {});

  // Honest, real headline stats. The university count is live from the API;
  // the rest are conservative, verifiable figures (no fabricated numbers).
  const displayStats = useMemo(() => ([
    { icon: MapPin, value: '30+', label: 'States & UTs' },
    { icon: GraduationCap, value: uniTotal ? uniTotal.toLocaleString() : '500+', label: 'Universities' },
    { icon: BookOpen, value: '8,000+', label: 'Courses' },
    { icon: Award, value: '20+', label: 'Entrance Exams' },
  ]), [uniTotal]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAllStatesModal, setShowAllStatesModal] = useState(false);

  const ALL_INDIA_STATES = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
    'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi NCR',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
    'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra',
    'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal'
  ];
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [selectedUni, setSelectedUni] = useState(null);
  const [leadType, setLeadType] = useState('apply');
  const featuredUniversity = featuredUniversities[currentSlide % featuredUniversities.length];
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const getUniversityPath = (university) => {
    const routeParam = university?.slug || university?._id;
    return routeParam ? `/universities/${routeParam}` : '/universities';
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [uniRes, examRes, testRes, newsRes, testmRes, stateCountRes] = await Promise.all([
          api.get('/universities?limit=12').catch(() => ({ data: { data: [] } })),
          api.get('/exams/upcoming?limit=4').catch(() => ({ data: { data: [] } })),
          api.get('/questions?limit=4').catch(() => ({ data: { data: [] } })),
          api.get('/news?limit=4').catch(() => ({ data: { data: [] } })),
          api.get('/testimonials').catch(() => ({ data: { data: [] } })),
          api.get('/universities/state-counts').catch(() => ({ data: { data: {} } }))
        ]);

        const fetchedUniversities = Array.isArray(uniRes?.data?.data) ? [...uniRes.data.data] : [];
        const fetchedExams = Array.isArray(examRes?.data?.data) ? examRes.data.data : [];
        const fetchedQuestions = Array.isArray(testRes?.data?.data) ? testRes.data.data : [];
        const fetchedNews = Array.isArray(newsRes?.data?.data) ? newsRes.data.data : Array.isArray(newsRes?.data?.articles) ? newsRes.data.articles : [];
        const fetchedTestimonials = Array.isArray(testmRes?.data?.data) ? testmRes.data.data : [];

        const priority = ['Thakur', 'Amity', 'SAGE', 'Jindal', 'ITM', 'ISBM', 'AAFT', 'C.V. Raman', 'Dev Sanskriti'];
        const sortedUniversities = fetchedUniversities.sort((a, b) => {
          const aHasLogo = a.logoUrl?.trim() ? 1 : 0;
          const bHasLogo = b.logoUrl?.trim() ? 1 : 0;
          if (aHasLogo !== bHasLogo) return bHasLogo - aHasLogo;

          const aP = priority.findIndex((name) => a.name?.includes(name));
          const bP = priority.findIndex((name) => b.name?.includes(name));
          if (aP !== -1 && bP === -1) return -1;
          if (bP !== -1 && aP === -1) return 1;
          return (aP === -1 ? 999 : aP) - (bP === -1 ? 999 : bP);
        });

        if (!isMounted) return;

        const nextHomeData = {
          universities: sortedUniversities.slice(0, 6),
          exams: fetchedExams,
          questions: fetchedQuestions,
          news: fetchedNews,
          testimonials: fetchedTestimonials,
          uniTotal: typeof uniRes?.data?.total === 'number' ? uniRes.data.total : null,
          stateCounts: (stateCountRes?.data?.data && typeof stateCountRes.data.data === 'object') ? stateCountRes.data.data : {},
        };

        setCachedHomeData(nextHomeData);
        startTransition(() => {
          setUniversities(nextHomeData.universities);
          setExams(nextHomeData.exams);
          setQuestions(nextHomeData.questions);
          setNews(nextHomeData.news);
          setTestimonials(nextHomeData.testimonials);
          setUniTotal(nextHomeData.uniTotal);
          setStateCounts(nextHomeData.stateCounts);
        });
      } catch (error) {
        console.error('Data fetch failed:', error);
      }
    };
    fetchData();

    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredUniversities.length);
    }, 5000);

    const testimonialInterval = setInterval(() => {
      setCurrentTestimonialIndex((prev) => prev + 1);
    }, 8000);

    return () => {
      isMounted = false;
      clearInterval(slideInterval);
      clearInterval(testimonialInterval);
    };
  }, []);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      await api.post('/testimonials', data);
      toast.success('Thank you! Your feedback has been submitted for review.');
      setShowFeedback(false);
    } catch (error) {
      toast.error('Submission failed. Please try again.');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    navigate(`/universities?search=${encodeURIComponent(searchTerm)}`);
  };

  const quickSearchSuggestions = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();
    if (query.length < 2) return [];

    const suggestionMap = new Map();

    [...universities, ...featuredUniversities].forEach((university) => {
      if (!university?.name || suggestionMap.has(university.name.toLowerCase())) return;

      const searchableText = [
        university.name,
        university.city,
        university.state,
        university.location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (searchableText.includes(query)) {
        suggestionMap.set(university.name.toLowerCase(), {
          label: university.name,
          sublabel: university.location || [university.city, university.state].filter(Boolean).join(', '),
          action: () => navigate(getUniversityPath(university)),
        });
      }
    });

    popularCities.forEach((city) => {
      if (!city.toLowerCase().includes(query) || suggestionMap.has(city.toLowerCase())) return;
      suggestionMap.set(city.toLowerCase(), {
        label: city,
        sublabel: 'Search universities by city',
        action: () => navigate(`/universities?search=${encodeURIComponent(city)}`),
      });
    });

    return Array.from(suggestionMap.values()).slice(0, 6);
  }, [deferredSearchTerm, navigate, universities]);

  return (
    <div className="bg-[#f8fafc] dark:bg-dark-bg min-h-screen pb-20 overflow-x-hidden">
      <Seo
        title="Vidyarthi Mitra – Find Your Perfect University in India"
        description="Explore 700+ private, deemed and international universities across India. Compare fees, NAAC grades, NIRF rankings, courses, placements and admissions 2026."
        path="/"
        jsonLd={siteJsonLd()}
      />
      {/* Hero Section - Shiksha-style rotating campus background */}
      <section className="relative min-h-[600px] md:h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Rotating Campus Background */}
        <AnimatePresence mode="sync">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className={`absolute inset-0 bg-gradient-to-br ${featuredUniversity.accent}`}
          >
            <img
              src={featuredUniversity.image}
              alt={featuredUniversity.name}
              className="absolute inset-0 h-full w-full object-cover cursor-pointer"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onClick={() => navigate(getUniversityPath(featuredUniversity))}
              onError={(event) => {
                event.currentTarget.style.opacity = '0';
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.14),transparent_30%)]" />
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
            onClick={() => navigate(getUniversityPath(featuredUniversity))}
            className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 hover:bg-primary/80 hover:border-primary transition-all cursor-pointer group"
          >
            <GraduationCap className="w-4 h-4 text-link group-hover:text-white" />
            <span className="text-white font-bold text-sm">{featuredUniversity.name}</span>
            <span className="text-white/50 text-xs">- {featuredUniversity.location}</span>
            <span className="text-link group-hover:text-white text-xs font-bold ml-1">View -&gt;</span>
          </motion.button>
        </div>

        <div className="max-w-7xl mx-auto px-4 text-center relative z-20 -mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 tracking-tight text-white drop-shadow-lg leading-tight break-words">
              Discover Top <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-light to-accent">Universities</span> in India
            </h1>
            <p className="text-white/90 drop-shadow-md mb-10 text-lg md:text-xl max-w-2xl mx-auto font-medium">
              Explore simplified admissions, authentic campus details, and directly connect with institutions.
            </p>

            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto group">
              <div className="relative flex shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden bg-white p-1">
                <div className="flex items-center pl-5 pr-3">
                  <Search className="w-6 h-6 text-link" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for a university..."
                  className="w-full min-w-0 py-4 bg-transparent text-slate-900 text-lg font-bold placeholder:text-slate-400 focus:outline-none"
                />
                <button type="submit" className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary text-white px-8 md:px-12 font-bold text-base transition-all whitespace-nowrap rounded-xl shadow-lg shadow-primary/25 active:scale-95 border border-accent/30">
                  Search
                </button>
              </div>

              {quickSearchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-30 overflow-hidden rounded-3xl border border-white/20 bg-white/95 p-2 text-left shadow-[0_24px_60px_rgba(15,23,42,0.28)] backdrop-blur">
                  {quickSearchSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.label}-${suggestion.sublabel}`}
                      type="button"
                      onClick={suggestion.action}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 transition-colors hover:bg-slate-100"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">{suggestion.label}</p>
                        <p className="text-xs font-bold text-slate-400">{suggestion.sublabel}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </form>
          </motion.div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-30">
        <div className="bg-white dark:bg-dark-card shadow-lg rounded-[2rem] p-8 md:p-10 flex flex-wrap justify-between gap-8 border border-slate-100 dark:border-white/5">
          {displayStats.map((s, i) => (
            <div key={i} className="relative flex items-center gap-4 flex-1 min-w-[150px] justify-center md:justify-start p-4 rounded-2xl group overflow-hidden cursor-default">
              {/* Left-to-right animated background (Gradient matching SS1) */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-700 to-orange-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out z-0" />

              <div className="relative z-10 flex items-center gap-4 w-full justify-center md:justify-start">
                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 group-hover:bg-white/20 rounded-2xl transition-colors duration-500">
                  <s.icon className="w-6 h-6 text-link group-hover:text-white transition-colors duration-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-white transition-colors duration-500 leading-none">{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 group-hover:text-orange-100 uppercase tracking-widest mt-1 transition-colors duration-500">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <p className="text-link font-bold text-xs uppercase tracking-[0.3em] mb-4">The Vidyarthi Mitra Edge</p>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white">Why 50,00,000+ Students Trust Us</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {[
            { icon: ShieldCheck, title: 'Verified Information', desc: 'Directly sourced from university administration.', bgClass: 'bg-orange-50/50 dark:bg-orange-900/10', iconColor: 'text-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/20' },
            { icon: FileDown, title: 'One-Click Brochures', desc: 'Download official prospectuses instantly.', bgClass: 'bg-blue-50/50 dark:bg-blue-900/10', iconColor: 'text-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-900/20' },
            { icon: Users, title: 'Student Community', desc: 'Connect with peers and alumni.', bgClass: 'bg-orange-50/50 dark:bg-orange-900/10', iconColor: 'text-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/20' },
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
              <div className="absolute inset-0 bg-gradient-to-br from-orange-700 to-orange-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out z-0" />

              <div className="relative z-10">
                <div className={`w-16 h-16 ${item.iconBg} group-hover:bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-all duration-500`}>
                  <item.icon className={`w-8 h-8 ${item.iconColor} group-hover:text-white transition-colors duration-500`} />
                </div>
                <h4 className="font-bold text-lg mb-3 text-slate-900 dark:text-white group-hover:text-white transition-colors duration-500">{item.title}</h4>
                <p className="text-sm text-slate-500 group-hover:text-white/90 transition-colors duration-500 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Explore by State Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Explore by State</h2>
          <button onClick={() => setShowAllStatesModal(true)} className="text-link font-bold text-sm hover:underline transition-all inline-flex items-center gap-1">View All States <ArrowRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[
            { name: 'Maharashtra', count: '100+ Universities', img: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?q=80&w=800', landmark: 'Mumbai Skyline', color: 'from-blue-900 to-blue-700' },
            { name: 'Gujarat', count: '80+ Universities', img: img_gujarat, landmark: 'Statue of Unity', color: 'from-amber-900 to-orange-700' },
            { name: 'Rajasthan', count: '120+ Universities', img: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=800', landmark: 'Amber Fort', color: 'from-yellow-900 to-yellow-700' },
            { name: 'Uttar Pradesh', count: '200+ Universities', img: img_uttar_pradesh, landmark: 'Taj Mahal', color: 'from-slate-800 to-slate-600' },
            { name: 'Madhya Pradesh', count: '100+ Universities', img: img_madhya_pradesh, landmark: 'Khajuraho', color: 'from-red-900 to-red-700' },
            { name: 'Chhattisgarh', count: '60+ Universities', img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800', landmark: 'Chitrakote Falls', color: 'from-green-900 to-green-700' },
          ].map((state, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="relative rounded-3xl overflow-hidden aspect-[4/5] group cursor-pointer"
              onClick={() => navigate(`/universities?state=${state.name}`)}
            >
              {/* Gradient fallback shown behind image */}
              <div className={`absolute inset-0 bg-gradient-to-br ${state.color} flex items-center justify-center`}>
                <span className="text-white/20 font-bold text-6xl">{state.name[0]}</span>
              </div>
              {state.img ? (
                <img
                  src={state.img}
                  alt={state.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
                <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mb-1">{state.landmark}</p>
                <h4 className="text-white font-bold text-lg leading-tight">{state.name}</h4>
                {stateCounts[state.name] > 0 && (
                  <p className="text-link text-[10px] font-bold uppercase tracking-widest mt-1">{stateCounts[state.name]} Universities</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sponsored hero banner slider — admin-managed ad placement */}
      <HeroBannerSlider page="home" />

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
              <Link to={getStreamLink(stream.name)} className="relative flex flex-col items-center text-center group bg-white dark:bg-dark-card p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all overflow-hidden block w-full h-full">
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

      {/* Featured Sponsored Universities — driven by admin ad banners */}
      <SponsoredUniversities page="home" />

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-16">
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-2 h-8 bg-primary rounded-full"></div> Admissions & Tools
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <motion.div whileHover={{ y: -5 }} className="relative overflow-hidden p-6 rounded-[2rem] bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl group">
                <div className="relative z-10 flex flex-col h-full">
                  <span className="bg-white/20 text-[10px] font-bold px-3 py-1 rounded-full uppercase self-start">Maharashtra State</span>
                  <h3 className="font-bold text-2xl mt-4 mb-2">DTE Admissions</h3>
                  <p className="text-sm text-white/80 mb-6 flex-grow">Complete guide to Engineering, Pharmacy & MBA admissions.</p>
                  <Link to="/exams" className="w-full bg-white text-link font-bold py-3 rounded-2xl text-sm transition-all hover:shadow-lg mt-auto flex justify-center items-center">
                    View Updates
                  </Link>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -5 }} className="relative overflow-hidden p-6 rounded-[2rem] bg-gradient-to-br from-primary to-orange-500 text-white shadow-xl group">
                <div className="relative z-10 flex flex-col h-full">
                  <span className="bg-white/20 text-[10px] font-bold px-3 py-1 rounded-full uppercase self-start">Tool</span>
                  <h3 className="font-bold text-2xl mt-4 mb-2">Rank Predictor</h3>
                  <p className="text-sm text-white/80 mb-6 flex-grow">Predict potential colleges based on your scores.</p>
                  <Link to="/rank-predictor" className="w-full bg-white text-link font-bold py-3 rounded-2xl text-sm transition-all hover:shadow-lg mt-auto flex justify-center items-center">
                    Predict Now
                  </Link>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -5 }} className="relative overflow-hidden p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl group border border-white/10">
                <div className="relative z-10 flex flex-col h-full">
                  <span className="bg-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase text-white self-start">Private Unis</span>
                  <h3 className="font-bold text-2xl mt-4 mb-2">PERA CET</h3>
                  <p className="text-sm text-white/80 mb-6 flex-grow">Entrance for top private universities in Maharashtra.</p>
                  <Link to="/universities" className="w-full bg-primary text-white font-bold py-3 rounded-2xl text-sm transition-all hover:shadow-lg mt-auto flex justify-center items-center">
                    Apply Now
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-2 h-8 bg-primary rounded-full"></div> Recommended for You
              </h2>
              <Link to="/universities" className="group flex items-center gap-1 text-link text-sm font-bold">
                Explore All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            {universities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {universities.map((u, i) => (
                  <motion.div key={i} whileHover={{ y: -5 }}>
                    <Link to={getUniversityPath(u)} className="group relative bg-white dark:bg-dark-card p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 hover:border-transparent hover:shadow-lg hover:shadow-primary/20 transition-all overflow-hidden block">
                      {/* Left-to-right animated background (Gradient matching SS1) */}
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-700 to-orange-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out z-0" />

                      <div className="relative z-10 flex gap-6 items-center">
                        <div className="w-24 h-24 bg-white rounded-2xl shadow-sm flex items-center justify-center overflow-hidden border border-slate-50 group-hover:border-transparent transition-colors p-2 shrink-0">
                          <UniversityLogo logoUrl={u.logoUrl || u.logo} name={u.name} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-lg line-clamp-1 group-hover:text-white transition-colors">{u.name}</h3>
                            {u.naacGrade && (
                              <div className="flex items-center gap-1 bg-green-50 group-hover:bg-white/20 text-green-600 group-hover:text-white px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors">
                                <Award className="w-3 h-3" />
                                NAAC {u.naacGrade}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-white/90 transition-colors mt-1 mb-4">
                            <MapPin className="w-3 h-3 text-link group-hover:text-white transition-colors shrink-0" />
                            <span className="truncate">{u.city && u.city !== 'Unknown' ? `${u.city}, ` : ''}{u.state || 'India'}</span>
                          </div>

                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-[10px] text-slate-400 group-hover:text-white/80 transition-colors uppercase font-bold tracking-widest">Avg Package</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-white transition-colors">{u.stats?.avgPackageLPA ? `INR ${u.stats.avgPackageLPA} LPA` : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 group-hover:text-white/80 transition-colors uppercase font-bold tracking-widest">Courses</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-white transition-colors">{u.stats?.totalCoursesCount ? `${u.stats.totalCoursesCount}+` : 'N/A'}</p>
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
            ) : (
              <Card className="border-dashed bg-white/70 dark:bg-dark-card/70">
                <EmptyState
                  icon={School}
                  title="No Recommendations Yet"
                  description="No universities are available right now. Once your team uploads universities from the admin panel, recommendations will appear here."
                />
              </Card>
            )}
            {universities.length > 0 ? (
              <div className="mt-12 text-center">
                <Link to="/universities" className="inline-flex items-center gap-3 bg-white dark:bg-dark-card border-2 border-primary text-link hover:bg-primary hover:text-white px-10 py-4 rounded-2xl font-bold transition-all group">
                  EXPLORE ALL UNIVERSITIES
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            ) : null}
          </section>

          {testimonials.length > 0 && (
          <section className="bg-slate-900 rounded-[2rem] p-10 md:p-16 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Users className="w-40 h-40" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-bold italic">Words of Gratitude</h2>
                <div className="flex gap-2">
                  {(() => {
                    const fallbackTestimonials = [
                      {
                        content: "Vidyarthimitra.org is a wonderful source of information for students seeking admissions. It helped me find the right college for my elder brother in Pune. One of the best sites I have ever seen!",
                        name: "Amol Kulkarni",
                        role: "Pune, Engineering Aspirant"
                      },
                      {
                        content: "The expert counseling feature completely changed my perspective on which engineering branch to choose. Thank you to the entire team for building such a student-friendly platform.",
                        name: "Priya Sharma",
                        role: "Mumbai, B.Tech First Year"
                      },
                      {
                        content: "I got to know about PERA CET through this portal and it helped me secure admission in a top private university when I thought I had no options left.",
                        name: "Rahul Deshmukh",
                        role: "Nashik, Management Student"
                      }
                    ];
                    const displayTestimonials = testimonials.length > 0 ? testimonials : fallbackTestimonials;
                    const activeIndex = currentTestimonialIndex % displayTestimonials.length;
                    const activeTestimonial = displayTestimonials[activeIndex];

                    return (
                      <>
                        {displayTestimonials.map((_, idx) => (
                          <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === activeIndex ? 'bg-primary w-6' : 'bg-white/20'}`} />
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="min-h-[200px]">
                {(() => {
                  const fallbackTestimonials = [
                    {
                      content: "Vidyarthimitra.org is a wonderful source of information for students seeking admissions. It helped me find the right college for my elder brother in Pune. One of the best sites I have ever seen!",
                      name: "Amol Kulkarni",
                      role: "Pune, Engineering Aspirant"
                    },
                    {
                      content: "The expert counseling feature completely changed my perspective on which engineering branch to choose. Thank you to the entire team for building such a student-friendly platform.",
                      name: "Priya Sharma",
                      role: "Mumbai, B.Tech First Year"
                    },
                    {
                      content: "I got to know about PERA CET through this portal and it helped me secure admission in a top private university when I thought I had no options left.",
                      name: "Rahul Deshmukh",
                      role: "Nashik, Management Student"
                    }
                  ];
                  const displayTestimonials = testimonials.length > 0 ? testimonials : fallbackTestimonials;
                  const activeIndex = currentTestimonialIndex % displayTestimonials.length;
                  const activeTestimonial = displayTestimonials[activeIndex];

                  return (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                      >
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                          {activeTestimonial.avatarUrl ? (
                            <img src={activeTestimonial.avatarUrl} alt={activeTestimonial.name} className="w-16 h-16 rounded-2xl shrink-0 object-cover shadow-sm" />
                          ) : (
                            <div className="w-16 h-16 bg-primary rounded-2xl shrink-0 flex items-center justify-center text-2xl font-bold shadow-sm">
                              {activeTestimonial.name ? activeTestimonial.name[0].toUpperCase() : 'V'}
                            </div>
                          )}
                          <div>
                            <p className="text-lg md:text-xl italic text-slate-300 leading-relaxed mb-6">
                              "{activeTestimonial.content}"
                            </p>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-link uppercase tracking-widest text-sm">{activeTestimonial.name}</p>
                                <p className="text-xs text-slate-500 font-bold">{activeTestimonial.role || activeTestimonial.designation}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  );
                })()}
              </div>
            </div>
          </section>
          )}
        </div>

        <div className="lg:col-span-4 space-y-10">
          {/* Sidebar advertisements — admin-managed ad placement */}
          <SidebarAds page="home" />

          <section className="bg-white dark:bg-dark-card rounded-[2rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-lg">
            <div className="p-6 bg-gradient-to-r from-primary to-orange-400 text-white flex items-center justify-between">
              <h2 className="font-bold text-lg">Alerts</h2>
              <Bell className="w-5 h-5" />
            </div>
            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {news.length > 0 ? news.map((n, i) => (
                <div key={i} className="p-5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-all group">
                  <span className="text-[9px] font-bold uppercase text-link">{n.category || 'News'}</span>
                  <h4 className="text-sm font-bold mt-2 group-hover:text-link transition-colors line-clamp-2">{n.title}</h4>
                </div>
              )) : (
                <div className="p-8 text-center text-sm text-light-muted">No news yet. Check back soon!</div>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-dark-card rounded-[2rem] border border-slate-100 dark:border-white/5 p-8 shadow-lg">
            <h2 className="font-bold text-xl mb-8">Community</h2>
            <div className="space-y-6">
              {questions.map((q, i) => (
                <div key={i} className="group cursor-pointer border-b border-slate-50 dark:border-white/5 pb-4 last:border-none" onClick={openChat}>
                  <h4 className="text-sm font-bold group-hover:text-link transition-colors">{q.title || q.content}</h4>
                </div>
              ))}
            </div>
            <button onClick={openChat} className="w-full mt-8 py-4 bg-primary text-white text-xs font-bold rounded-2xl shadow-xl shadow-primary/30">
              ASK A QUESTION
            </button>
          </section>

          <section className="bg-gradient-to-br from-primary-dark to-primary p-10 rounded-[2rem] text-white">
            <h2 className="text-2xl font-bold mb-4">Stay Ahead</h2>
            <p className="text-sm text-orange-100 mb-8 opacity-90">Get the latest admission alerts and entrance exam tips directly in your inbox.</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Email" className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 text-sm outline-none" />
              <button className="bg-white text-link px-6 py-3 rounded-xl font-bold text-xs">JOIN</button>
            </div>
          </section>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 pb-8">
        <div className="rounded-[2rem] border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-dark-card/95 shadow-lg overflow-hidden">
          <div className="grid gap-8 p-8 md:p-10 lg:grid-cols-[1.4fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-link mb-3">Contact and Feedback</p>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white">
                Need help from our team or want to share your experience?
              </h2>
              <p className="mt-4 max-w-2xl text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Reach out through the contact details in the footer or send feedback directly here. This keeps support and suggestions in one place right before the final contact section.
              </p>
            </div>

            <div className="rounded-[2rem] bg-slate-900 text-white p-6 md:p-8 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary-light" />
                </div>
                <div>
                  <p className="text-lg font-bold">Share Feedback</p>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                    Tell us what is working well, what feels confusing, or what you want improved before the next release.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowFeedback(true)}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-light"
              >
                <MessageSquare className="w-4 h-4" />
                Open Feedback Form
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Feedback Modal */}
      <AnimatePresence>
        {showFeedback && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
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
              className="relative bg-white dark:bg-dark-card w-full max-w-5xl rounded-3xl shadow-lg overflow-hidden overflow-y-auto max-h-[90vh]"
            >
              {/* Form Header */}
              <div className="bg-gradient-to-r from-orange-500 to-primary p-6 md:p-8 flex justify-between items-center">
                <h2 className="text-2xl md:text-4xl font-bold text-white uppercase tracking-tighter">Feedback Form</h2>
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
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-2 tracking-widest">Name *</label>
                        <input name="name" required type="text" placeholder="Enter your name" className="w-full border border-slate-200 rounded-lg p-4 text-sm focus:border-primary outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-2 tracking-widest">Mobile</label>
                        <input name="mobile" type="text" placeholder="Mobile Number" className="w-full border border-slate-200 rounded-lg p-4 text-sm focus:border-primary outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-2 tracking-widest">Email ID *</label>
                        <input name="email" required type="email" placeholder="Enter your Email Id" className="w-full border border-slate-200 rounded-lg p-4 text-sm focus:border-primary outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-2 tracking-widest">Designation *</label>
                        <input name="role" required type="text" placeholder="Enter your Designation" className="w-full border border-slate-200 rounded-lg p-4 text-sm focus:border-primary outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-2 tracking-widest">Feedback *</label>
                        <textarea name="content" required placeholder="Write your review.." className="w-full border border-slate-200 rounded-lg p-4 text-sm h-32 focus:border-primary outline-none resize-none transition-all" />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button type="submit" className="px-12 bg-green-600 text-white font-bold py-4 rounded-lg hover:bg-green-700 transition-all uppercase tracking-widest shadow-lg shadow-green-600/20">Submit</button>
                      <button type="button" onClick={() => setShowFeedback(false)} className="px-12 bg-red-500 text-white font-bold py-4 rounded-lg hover:bg-red-600 transition-all uppercase tracking-widest shadow-lg shadow-red-500/20">Cancel</button>
                    </div>
                  </div>

                  {/* Right Side: Avatar Section */}
                  <div className="lg:col-span-4 space-y-10">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500 block mb-4 tracking-widest">Avatar Upload</label>
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
                      <label className="text-xs font-bold uppercase text-slate-500 block mb-2 tracking-widest">Avatar Preview</label>
                      <div className="w-full aspect-[4/3] bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden relative group">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-5xl font-bold text-white/30">
                            VM
                          </div>
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

      {/* All States Modal */}
      <AnimatePresence>
        {showAllStatesModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowAllStatesModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-dark-card rounded-[2rem] shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-dark-border shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Explore by State</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">All {ALL_INDIA_STATES.length} states & union territories</p>
                </div>
                <button
                  onClick={() => setShowAllStatesModal(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-border flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {ALL_INDIA_STATES.map((state) => (
                    <button
                      key={state}
                      onClick={() => { setShowAllStatesModal(false); navigate(`/universities?state=${encodeURIComponent(state)}`); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-dark-bg hover:bg-primary/10 dark:hover:bg-primary/10 hover:text-link border border-transparent hover:border-primary/20 transition-all text-left group"
                    >
                      <MapPin className="w-3.5 h-3.5 text-link shrink-0" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-link transition-colors truncate">{state}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-8 py-5 border-t border-slate-100 dark:border-dark-border shrink-0 flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium">Click on any state to browse universities</p>
                <button
                  onClick={() => { setShowAllStatesModal(false); navigate('/universities'); }}
                  className="px-6 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Browse All Universities
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <LeadCaptureModal 
        isOpen={leadModalOpen} 
        onClose={() => setLeadModalOpen(false)} 
        university={selectedUni} 
        leadType={leadType} 
      />
    </div>
  );
}
