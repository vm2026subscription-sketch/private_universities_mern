import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAiChat } from '../../context/AiChatContext';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const { openChat } = useAiChat();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl px-3 py-2 inline-flex items-center mb-6">
              <img src={logo} alt="Vidyarthi Mitra" className="h-9" />
            </div>
            <p className="text-sm leading-relaxed text-slate-400 mb-8 max-w-sm">
              Vidyarthi Mitra is India's leading education portal, helping students discover their dream careers and the best universities to pursue them.
            </p>
            <div className="flex gap-4">
              {[Facebook, Twitter, Instagram, Linkedin, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-black text-white mb-6 uppercase tracking-widest text-xs">Explore</h4>
            <div className="space-y-4">
              <Link to="/universities" className="block text-sm hover:text-primary transition-colors">Universities</Link>
              <Link to="/courses" className="block text-sm hover:text-primary transition-colors">Top Courses</Link>
              <Link to="/exams" className="block text-sm hover:text-primary transition-colors">Entrance Exams</Link>
              <Link to="/compare-universities" className="block text-sm hover:text-primary transition-colors">Compare Colleges</Link>
            </div>
          </div>

          <div>
            <h4 className="font-black text-white mb-6 uppercase tracking-widest text-xs">Study in India</h4>
            <div className="space-y-4">
              <Link to="/universities?state=Maharashtra" className="block text-sm hover:text-primary transition-colors">Maharashtra</Link>
              <Link to="/universities?state=Karnataka" className="block text-sm hover:text-primary transition-colors">Karnataka</Link>
              <Link to="/universities?state=Delhi+NCR" className="block text-sm hover:text-primary transition-colors">Delhi NCR</Link>
              <Link to="/universities?state=Tamil+Nadu" className="block text-sm hover:text-primary transition-colors">Tamil Nadu</Link>
            </div>
          </div>

          <div>
            <h4 className="font-black text-white mb-6 uppercase tracking-widest text-xs">Contact Us</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <Mail className="w-4 h-4 text-primary shrink-0 mt-1" />
                <span>info@vidyarthimitra.org</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Phone className="w-4 h-4 text-primary shrink-0 mt-1" />
                <div>
                  <p>+91 77200 25900</p>
                  <p>+91 77200 81400</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-1" />
                <span>Pune, Maharashtra, India</span>
              </div>
              <a 
                href="https://api.whatsapp.com/send?phone=917720025900&text=Hello,%20Vidyarthimitra.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs mt-4 hover:bg-green-700 transition-colors"
              >
                Get WhatsApp Updates
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <p>© {new Date().getFullYear()} Vidyarthi Mitra. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
