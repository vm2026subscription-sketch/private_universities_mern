import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useAiChat } from "../../context/AiChatContext";
import toast from "react-hot-toast";
import api from "../../utils/api";
import {
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  ArrowRight,
  Bell,
  MessageSquare,
} from "lucide-react";
import Button from "../ui/Button";

const FOOTER_LINKS = {
  explore: [
    { label: "Universities", to: "/universities" },
    { label: "Courses", to: "/courses" },
    { label: "Entrance Exams", to: "/exams" },
    { label: "Study Abroad", to: "/foreign-universities" },
    { label: "Compare", to: "/compare-universities" },
  ],
  students: [
    { label: "Rank Predictor", to: "/rank-predictor" },
    { label: "AI Counsellor", to: "/ask" },
    { label: "My Profile", to: "/profile" },
    { label: "Sign In", to: "/login" },
    { label: "Create Account", to: "/signup" },
  ],
  company: [
    { label: "About Us", to: "/about" },
    { label: "Contact", to: "/contact" },
    { label: "Privacy Policy", to: "/privacy-policy" },
    { label: "Terms", to: "/terms-and-conditions" },
    { label: "Refund Policy", to: "/refund-cancellation" },
  ],
};

const SOCIAL = [
  { label: "Facebook", href: "https://www.facebook.com/vidyarthimitra", icon: Facebook },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/vidyarthimitra", icon: Linkedin },
  { label: "Instagram", href: "https://www.instagram.com/vidyarthi_mitra/", icon: Instagram },
  { label: "YouTube", href: "https://www.youtube.com/@vidyarthimitra", icon: Youtube },
];

export default function Footer() {
  const { openChat } = useAiChat();
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    try {
      await api.post("/newsletter/subscribe", { email: email.trim() });
      toast.success("Subscribed successfully!");
      setEmail("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Subscription failed. Try again.");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="mt-section-sm border-t border-light-border bg-slate-900 text-white dark:border-dark-border">
      <div className="mx-auto max-w-container px-4 py-12 md:py-16">
        {/* Top row */}
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr] lg:gap-16">
          <div>
            <div className="inline-flex rounded-md bg-white px-3 py-2">
              <img src={logo} alt="Vidyarthi Mitra" className="h-8" />
            </div>
            <p className="mt-6 max-w-sm text-body-sm text-slate-400 leading-relaxed">
              Explore verified universities, compare options, and get admission guidance — all in one student-first platform.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="sm" onClick={openChat}>
                <MessageSquare className="h-4 w-4" />
                AI Counsellor
              </Button>
              <Link to="/contact" className="btn-outline !border-slate-600 !text-white hover:!bg-white/10 hover:!text-white">
                Contact
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(FOOTER_LINKS).map(([key, links]) => (
              <div key={key}>
                <h4 className="text-caption font-semibold uppercase tracking-widest text-primary-light mb-4">
                  {key === "explore" ? "Explore" : key === "students" ? "Students" : "Company"}
                </h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-body-sm text-slate-400 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h4 className="text-caption font-semibold uppercase tracking-widest text-primary-light mb-4">
                Connect
              </h4>
              <ul className="space-y-3 text-body-sm text-slate-400">
                <li>
                  <a href="tel:+917720025900" className="flex items-center gap-2 hover:text-white transition-colors">
                    <Phone className="h-4 w-4 shrink-0 text-primary-light" aria-hidden="true" />
                    +91 77200 25900
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@vidyarthimitra.org" className="flex items-center gap-2 hover:text-white transition-colors break-all">
                    <Mail className="h-4 w-4 shrink-0 text-primary-light" aria-hidden="true" />
                    contact@vidyarthimitra.org
                  </a>
                </li>
              </ul>
              <div className="mt-4 flex gap-2">
                {SOCIAL.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-slate-400 hover:border-primary hover:bg-primary hover:text-white transition-all"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-12 rounded-lg border border-slate-700 bg-slate-800/50 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-5 w-5 text-primary-light" aria-hidden="true" />
                <h4 className="text-h3 text-white">Stay updated</h4>
              </div>
              <p className="text-body-sm text-slate-400">
                Admission dates, exam updates, and scholarship alerts in your inbox.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full flex-col gap-3 sm:flex-row md:w-auto md:min-w-[360px]">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                aria-label="Email for newsletter"
                className="input-field !bg-slate-900 !border-slate-600 !text-white placeholder:text-slate-500 flex-1"
              />
              <Button type="submit" disabled={subscribing} className="shrink-0">
                {subscribing ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-4 border-t border-slate-800 pt-6 text-caption text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/privacy-policy" className="hover:text-primary-light transition-colors">Privacy</Link>
            <Link to="/terms-and-conditions" className="hover:text-primary-light transition-colors">Terms</Link>
            <Link to="/refund-cancellation" className="hover:text-primary-light transition-colors">Refund</Link>
          </div>
          <p>© {new Date().getFullYear()} VidyarthiMitra.org. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
