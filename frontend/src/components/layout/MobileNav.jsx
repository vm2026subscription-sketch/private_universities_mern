import { Link, useLocation } from 'react-router-dom';
import { Home, GraduationCap, Globe, BookOpen, User } from 'lucide-react';
import { cn } from '../../utils/cn';

const LINKS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/universities', icon: GraduationCap, label: 'Universities' },
  { to: '/courses', icon: BookOpen, label: 'Courses' },
  { to: '/foreign-universities', icon: Globe, label: 'Abroad' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function MobileNav() {
  const { pathname } = useLocation();

  const isActive = (path) =>
    pathname === path || (path !== '/' && pathname.startsWith(path + '/'));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-light-border bg-light-card/95 backdrop-blur-md dark:border-dark-border dark:bg-dark-card/95 md:hidden pb-safe"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around py-2">
        {LINKS.map((l) => {
          const active = isActive(l.to);
          return (
            <Link
              key={l.to}
              to={l.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-[56px] flex-col items-center gap-1 rounded-md px-2 py-1.5 transition-colors',
                active ? 'text-primary' : 'text-light-muted hover:text-primary'
              )}
            >
              <l.icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-caption font-semibold">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
