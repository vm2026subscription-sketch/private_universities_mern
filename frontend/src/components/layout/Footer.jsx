import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAiChat } from '../../context/AiChatContext';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const { openChat } = useAiChat();

  return (
    <footer className="bg-primary text-white border-t border-primary-dark mt-20">
      <div className="max-w-[90rem] mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-12 mb-16">
          
          {/* Column 1 */}
          <div className="space-y-8">
            <div className="bg-white rounded-xl px-3 py-2 inline-flex items-center">
              <img src={logo} alt="Vidyarthi Mitra" className="h-9" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-accent mb-6 uppercase tracking-widest text-[11px]">Quick Links</h4>
              <div className="space-y-3">
                <Link to="/universities" className="block text-sm text-white/80 hover:text-accent transition-colors">Universities</Link>
                <Link to="/colleges" className="block text-sm text-white/80 hover:text-accent transition-colors">Colleges</Link>
                <Link to="/courses" className="block text-sm text-white/80 hover:text-accent transition-colors">Courses</Link>
                <Link to="/exams" className="block text-sm text-white/80 hover:text-accent transition-colors">Entrance Exams</Link>
                <Link to="/rank-predictor" className="block text-sm text-white/80 hover:text-accent transition-colors">Rank Predictor</Link>
                <Link to="/gallery" className="block text-sm text-white/80 hover:text-accent transition-colors">Gallery</Link>
                <Link to="/mock-exams" className="block text-sm text-white/80 hover:text-accent transition-colors">Mock Exams</Link>
              </div>
            </div>
          </div>

          {/* Column 2 - Useful URLs */}
          <div className="lg:pt-[76px]">
            <h4 className="font-serif font-bold text-accent mb-6 uppercase tracking-widest text-[11px]">Useful URLs</h4>
            <div className="space-y-3">
              <Link to="/contact" className="block text-sm text-white/80 hover:text-accent transition-colors">Feedback / Contact</Link>
              <Link to="/login" className="block text-sm text-white/80 hover:text-accent transition-colors">Sign In</Link>
              <Link to="/signup" className="block text-sm text-white/80 hover:text-accent transition-colors">Join Us</Link>
              <Link to="/profile" className="block text-sm text-white/80 hover:text-accent transition-colors">My Profile</Link>
            </div>
          </div>

          {/* Column 3 - Follow Us */}
          <div className="lg:pt-[76px]">
            <h4 className="font-serif font-bold text-accent mb-6 uppercase tracking-widest text-[11px]">Follow Us</h4>
            <div className="space-y-3">
              <a href="#" className="flex items-center gap-3 text-sm text-white/80 hover:text-accent transition-colors"><Facebook className="w-4 h-4"/> Facebook</a>
              <a href="#" className="flex items-center gap-3 text-sm text-white/80 hover:text-accent transition-colors"><Twitter className="w-4 h-4"/> Twitter</a>
              <a href="#" className="flex items-center gap-3 text-sm text-white/80 hover:text-accent transition-colors"><Linkedin className="w-4 h-4"/> Linkedin</a>
              <a href="#" className="flex items-center gap-3 text-sm text-white/80 hover:text-accent transition-colors"><Instagram className="w-4 h-4"/> Instagram</a>
              <a href="#" className="flex items-center gap-3 text-sm text-white/80 hover:text-accent transition-colors"><Youtube className="w-4 h-4"/> YouTube</a>
            </div>
          </div>

          {/* Column 4 */}
          <div className="lg:pt-[76px]">
            <h4 className="font-serif font-bold text-accent mb-6 uppercase tracking-widest text-[11px]">Entrance Exams</h4>
            <div className="space-y-3">
              <a href="#" className="block text-sm text-white/80 hover:text-accent transition-colors">MHT-CET</a>
              <a href="#" className="block text-sm text-white/80 hover:text-accent transition-colors">JEE MAIN</a>
              <a href="#" className="block text-sm text-white/80 hover:text-accent transition-colors">JEE Advanced</a>
              <a href="#" className="block text-sm text-white/80 hover:text-accent transition-colors">NEET UG</a>
              <a href="#" className="block text-sm text-white/80 hover:text-accent transition-colors">NEET PG</a>
              <a href="#" className="block text-sm text-white/80 hover:text-accent transition-colors">NDA</a>
              <a href="#" className="block text-sm text-white/80 hover:text-accent transition-colors">CLAT</a>
            </div>
          </div>

          {/* Column 5 - Our Products */}
          <div className="lg:pt-[76px]">
            <h4 className="font-serif font-bold text-accent mb-6 uppercase tracking-widest text-[11px]">Our Features</h4>
            <div className="space-y-3">
              <Link to="/compare-universities" className="block text-sm text-white/80 hover:text-accent transition-colors">Compare Universities</Link>
              <Link to="/rank-predictor" className="block text-sm text-white/80 hover:text-accent transition-colors">Rank Predictor</Link>
              <Link to="/foreign-universities" className="block text-sm text-white/80 hover:text-accent transition-colors">Study Abroad</Link>
              <Link to="/exams" className="block text-sm text-white/80 hover:text-accent transition-colors">Entrance Exams</Link>
              <Link to="/ask" className="block text-sm text-white/80 hover:text-accent transition-colors">AI Counsellor</Link>
            </div>
          </div>

          {/* Column 6 */}
          <div className="lg:pt-[76px]">
            <h4 className="font-serif font-bold text-accent mb-6 uppercase tracking-widest text-[11px]">Contact Us</h4>
            <div className="space-y-3">
              <a href="tel:+917720025900" className="flex items-center gap-3 text-sm text-white/80 hover:text-accent transition-colors"><Phone className="w-4 h-4 shrink-0"/> +91 77200 25900</a>
              <a href="tel:+917720081400" className="flex items-center gap-3 text-sm text-white/80 hover:text-accent transition-colors"><Phone className="w-4 h-4 shrink-0"/> +91 77200 81400</a>
              <a href="mailto:contact@vidyarthimitra.org" className="flex items-start gap-3 text-sm text-white/80 hover:text-accent transition-colors break-all"><Mail className="w-4 h-4 mt-1 shrink-0"/> contact@vidyarthimitra.org</a>
              <a href="mailto:info@vidyarthimitra.org" className="flex items-start gap-3 text-sm text-white/80 hover:text-accent transition-colors break-all"><Mail className="w-4 h-4 mt-1 shrink-0"/> info@vidyarthimitra.org</a>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-primary-light/20 flex flex-col xl:flex-row justify-between items-center gap-6 text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">
          <div className="flex flex-wrap items-center justify-center xl:justify-start gap-x-4 gap-y-3">
            <Link to="/terms-and-conditions" className="hover:text-accent transition-colors">Terms and Conditions</Link>
            <span className="text-white/20 hidden sm:inline">|</span>
            <Link to="/privacy-policy" className="hover:text-accent transition-colors">Privacy Policy</Link>
            <span className="text-white/20 hidden sm:inline">|</span>
            <Link to="/about" className="hover:text-accent transition-colors">About Us</Link>
            <span className="text-white/20 hidden sm:inline">|</span>
            <Link to="/contact" className="hover:text-accent transition-colors">Contact Us</Link>
            <span className="text-white/20 hidden md:inline">|</span>
            <Link to="/signup" className="hover:text-accent transition-colors">Join Us</Link>
            <span className="text-white/20 hidden md:inline">|</span>
            <Link to="/refund-cancellation" className="hover:text-accent transition-colors">Refund &amp; Cancellation</Link>
          </div>
          <div className="text-center xl:text-right shrink-0">
            <p>© VidyarthiMitra.org {new Date().getFullYear()}</p>
            <p className="text-[9px] text-white/50 mt-1.5">All Rights Reserved</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
