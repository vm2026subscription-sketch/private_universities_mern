import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 page-enter">
      <div className="text-center max-w-lg mx-auto">
        {/* Animated 404 */}
        <div className="relative mb-8 select-none">
          <div className="text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter text-gradient opacity-90">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-primary/5 dark:bg-primary/10 border-4 border-dashed border-primary/20 animate-spin" style={{ animationDuration: '20s' }} />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3">
          Oops! Page not found
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10 text-base leading-relaxed">
          The page you're looking for doesn't exist or has been moved.<br />
          Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/" className="btn-primary gap-2 w-full sm:w-auto justify-center">
            <Home className="w-4 h-4" />
            Go to Home
          </Link>
          <Link to="/universities" className="btn-outline gap-2 w-full sm:w-auto justify-center">
            <Search className="w-4 h-4" />
            Browse Universities
          </Link>
        </div>

        <button onClick={() => window.history.back()} className="mt-8 flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors mx-auto">
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>
      </div>
    </div>
  );
}
