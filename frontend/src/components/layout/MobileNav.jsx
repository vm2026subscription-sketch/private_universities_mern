import { Link, useLocation } from 'react-router-dom';
import { Home, GraduationCap, Globe, BookOpen, User } from 'lucide-react';

export default function MobileNav() {
  const { pathname } = useLocation();
  const links = [
    { to: '/',                    icon: Home,          label: 'Home'        },
    { to: '/universities',        icon: GraduationCap, label: 'Universities' },
    { to: '/courses',             icon: BookOpen,      label: 'Courses'     },
    { to: '/foreign-universities',icon: Globe,         label: 'Abroad'      },
    { to: '/profile',             icon: User,          label: 'Profile'     },
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
                  ? 'text-accent'
                  : 'text-slate-400 dark:text-slate-500 hover:text-accent'
              }`}
            >
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                isActive ? 'bg-accent/10 scale-110' : ''
              }`}>
                <l.icon className="w-5 h-5" />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wide ${isActive ? 'text-accent' : ''}`}>
                {l.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
