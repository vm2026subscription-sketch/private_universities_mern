import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAiChat } from '../../context/AiChatContext';

const EXTERNAL_LINKS = {
  news: 'https://epaper.vidyarthimitra.org/',
};

export default function Footer() {
  const { openChat } = useAiChat();

  return (
    <footer className="bg-light-card dark:bg-dark-card border-t border-light-border dark:border-dark-border mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <img src={logo} alt="Vidyarthi Mitra" className="h-8 mb-4" />
            <p className="text-sm text-light-muted dark:text-dark-muted">
              Your trusted companion for finding the perfect university in India.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <div className="space-y-2">
              <Link to="/universities" className="block text-sm text-light-muted dark:text-dark-muted hover:text-primary">Universities</Link>
              <Link to="/courses" className="block text-sm text-light-muted dark:text-dark-muted hover:text-primary">Courses</Link>
              <Link to="/exams" className="block text-sm text-light-muted dark:text-dark-muted hover:text-primary">Exams</Link>
              <a href={EXTERNAL_LINKS.news} target="_blank" rel="noreferrer" className="block text-sm text-light-muted dark:text-dark-muted hover:text-primary">News</a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Tools</h4>
            <div className="space-y-2">
              <Link to="/compare-universities" className="block text-sm text-light-muted dark:text-dark-muted hover:text-primary">University Comparison</Link>
              <Link to="/loans" className="block text-sm text-light-muted dark:text-dark-muted hover:text-primary">Education Loans</Link>
              <button type="button" onClick={openChat} className="block text-sm text-light-muted dark:text-dark-muted hover:text-primary">Vidyarthi Mitra AI</button>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Support</h4>
            <div className="space-y-2 text-sm text-light-muted dark:text-dark-muted">
              <p>Email: support@vidyarthimitra.in</p>
              <p>Phone: +91-9876543210</p>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-light-border dark:border-dark-border text-center text-sm text-light-muted dark:text-dark-muted">
          © {new Date().getFullYear()} Vidyarthi Mitra. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
