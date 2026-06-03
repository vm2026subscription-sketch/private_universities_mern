import { Link, useLocation } from 'react-router-dom';
import { Home, GraduationCap, Globe, Sparkles, User } from 'lucide-react';

export default function MobileNav() {
  const { pathname } = useLocation();
  const links = [
    { to: '/',             icon: Home,          label: 'Home'        },
    { to: '/universities', icon: GraduationCap, label: 'Universities' },
    { to: '/gemini-chat',  icon: Sparkles,      label: 'Gemini AI', isAi: true },
    { to: '/courses',      icon: Globe,         label: 'Courses'     },
    { to: '/profile',      icon: User,          label: 'Profile'     },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-dark-card/95 backdrop-blur border-t border-light-border dark:border-dark-border md:hidden z-50 pb-safe">
      <div className="flex justify-around py-1.5">
        {links.map(l => {
          const isActive = pathname === l.to || (l.to !== '/' && pathname?.startsWith(l.to + '/'));
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? l.isAi ? 'text-blue-600 dark:text-blue-400' : 'text-accent'
                  : l.isAi
                  ? 'text-blue-500 dark:text-blue-400 hover:text-blue-600'
                  : 'text-slate-400 dark:text-slate-500 hover:text-accent'
              }`}
            >
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                isActive
                  ? l.isAi ? 'bg-blue-100 dark:bg-blue-900/30 scale-110' : 'bg-accent/10 scale-110'
                  : l.isAi ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}>
                <l.icon className="w-5 h-5" />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wide ${
                isActive ? (l.isAi ? 'text-blue-600 dark:text-blue-400' : 'text-accent') : ''
              }`}>
                {l.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
