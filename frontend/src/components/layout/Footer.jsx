import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAiChat } from '../../context/AiChatContext';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import {
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  Sparkles,
  ArrowRight,
  Bell,
} from 'lucide-react';

const footerGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'Universities', to: '/universities' },
      { label: 'Courses', to: '/courses' },
      { label: 'Entrance Exams', to: '/exams' },
      { label: 'Study Abroad', to: '/foreign-universities' },
      { label: 'Compare Universities', to: '/compare-universities' },
    ],
  },
  {
    title: 'Student Tools',
    links: [
      { label: 'Rank Predictor', to: '/rank-predictor' },
      { label: 'AI Counsellor', to: '/ask' },
      { label: 'My Profile', to: '/profile' },
      { label: 'Sign In', to: '/login' },
      { label: 'Create Account', to: '/signup' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms and Conditions', to: '/terms-and-conditions' },
      { label: 'Refund Policy', to: '/refund-cancellation' },
    ],
  },
];

const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/vidyarthimitra', icon: Facebook },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/vidyarthimitra', icon: Linkedin },
  { label: 'Instagram', href: 'https://www.instagram.com/vidyarthi_mitra/', icon: Instagram },
  { label: 'YouTube', href: 'https://www.youtube.com/@vidyarthimitra', icon: Youtube },
];

export default function Footer() {
  const { openChat } = useAiChat();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    try {
      await api.post('/newsletter/subscribe', { email: email.trim() });
      toast.success('Subscribed successfully!');
      setEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Subscription failed. Try again.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="mt-20 bg-primary text-white border-t border-primary-dark/60">
      <div className="max-w-[90rem] mx-auto px-4 pt-16 pb-8">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_2fr] mb-14">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl">
            <div className="inline-flex items-center rounded-2xl bg-white px-4 py-3 shadow-lg">
              <img src={logo} alt="Vidyarthi Mitra" className="h-9" />
            </div>
            <div className="mt-6 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent-light">
                <Sparkles className="w-3.5 h-3.5" />
                Smarter Admission Guidance
              </div>
              <h3 className="text-2xl md:text-3xl font-serif font-bold leading-tight text-white">
                Find the right university, course, and next step with a cleaner student-first experience.
              </h3>
              <p className="text-sm md:text-base text-white/70 leading-relaxed max-w-xl">
                Explore verified universities, compare options, track admissions, and talk to the AI counsellor from one place.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openChat}
                className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent/20 hover:bg-accent-light"
              >
                Talk to AI
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                Contact Team
              </Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {footerGroups.map((group) => (
              <div key={group.title} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm shadow-xl">
                <div className="mb-5">
                  <div className="mb-3 h-1.5 w-14 rounded-full bg-gradient-to-r from-accent to-accent-light" />
                  <h4 className="text-sm font-bold uppercase tracking-[0.24em] text-accent-light">
                    {group.title}
                  </h4>
                </div>
                <div className="space-y-3">
                  {group.links.map((link) => (
                    <Link
                      key={link.label}
                      to={link.to}
                      className="group flex items-center justify-between gap-3 text-sm text-white/78 hover:text-white transition-colors"
                    >
                      <span>{link.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm shadow-xl">
              <div className="mb-5">
                <div className="mb-3 h-1.5 w-14 rounded-full bg-gradient-to-r from-accent to-accent-light" />
                <h4 className="text-sm font-bold uppercase tracking-[0.24em] text-accent-light">
                  Connect
                </h4>
              </div>

              <div className="space-y-3 text-sm">
                <a href="tel:+917720025900" className="flex items-center gap-3 text-white/78 hover:text-white transition-colors">
                  <Phone className="w-4 h-4 text-accent-light shrink-0" />
                  +91 77200 25900
                </a>
                <a href="tel:+917720081400" className="flex items-center gap-3 text-white/78 hover:text-white transition-colors">
                  <Phone className="w-4 h-4 text-accent-light shrink-0" />
                  +91 77200 81400
                </a>
                <a href="mailto:contact@vidyarthimitra.org" className="flex items-start gap-3 text-white/78 hover:text-white transition-colors break-all">
                  <Mail className="w-4 h-4 text-accent-light mt-0.5 shrink-0" />
                  contact@vidyarthimitra.org
                </a>
              </div>

              <div className="mt-6 pt-5 border-t border-white/10">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-accent-light">
                  Follow Us
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {socialLinks.map((social) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={social.label}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:border-accent/40 hover:bg-accent hover:text-slate-950 transition-all"
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Subscribe */}
        <div className="mb-10 rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-accent-light" />
                <h4 className="text-base font-bold text-white">Stay Updated</h4>
              </div>
              <p className="text-sm text-white/60">Get latest admission dates, exam updates & scholarship alerts directly in your inbox.</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex gap-3 w-full md:w-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 md:w-64 px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white placeholder-white/40 text-sm outline-none focus:border-accent/50 focus:bg-white/15 transition-all"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="px-5 py-3 rounded-2xl bg-accent text-slate-950 text-sm font-bold hover:bg-accent-light transition-all disabled:opacity-60 whitespace-nowrap"
              >
                {subscribing ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-6 text-xs font-bold uppercase tracking-[0.18em] text-white/60 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/terms-and-conditions" className="hover:text-accent-light transition-colors">
              Terms
            </Link>
            <Link to="/privacy-policy" className="hover:text-accent-light transition-colors">
              Privacy
            </Link>
            <Link to="/refund-cancellation" className="hover:text-accent-light transition-colors">
              Refund
            </Link>
            <Link to="/contact" className="hover:text-accent-light transition-colors">
              Contact
            </Link>
          </div>
          <div className="text-left md:text-right">
            <p>© VidyarthiMitra.org {new Date().getFullYear()}</p>
            <p className="mt-1 text-[10px] tracking-[0.14em] text-white/40">All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
