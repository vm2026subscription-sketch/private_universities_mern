import { Link, useLocation } from 'react-router-dom';
import { Home, GraduationCap, Search, User } from 'lucide-react';

export default function MobileNav() {
  const { pathname } = useLocation();
  const links = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/universities', icon: GraduationCap, label: 'Universities' },
    { to: '/compare-universities', icon: Search, label: 'Compare' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t border-light-border dark:border-dark-border md:hidden z-50">
      <div className="flex justify-around py-2">
        {links.map(l => (
          <Link key={l.to} to={l.to} className={`flex flex-col items-center gap-1 px-3 py-1 ${pathname === l.to ? 'text-primary' : 'text-light-muted dark:text-dark-muted'}`}>
            <l.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
