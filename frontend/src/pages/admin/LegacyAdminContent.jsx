import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

/**
 * Legacy wrapper — renders the old AdminDashboard as a single import
 * for Universities / Courses / Exams / News tabs.
 * These pages still use the original monolith component that is at
 * pages/AdminDashboard.jsx. The new admin layout just wraps it.
 */
export default function LegacyAdminContent({ defaultTab = 'Universities' }) {
  const [hint] = useState(defaultTab);

  useEffect(() => {
    // Redirect to old admin with a hash-based tab hint
    const params = new URLSearchParams(window.location.search);
    if (!params.get('tab')) {
      window.history.replaceState(null, '', `${window.location.pathname}?tab=${hint}`);
    }
  }, [hint]);

  return (
    <div className="card p-6 text-center space-y-4">
      <p className="text-light-muted dark:text-dark-muted">
        This section uses the full content editor.
      </p>
      <a href={`/admin-legacy?tab=${hint}`} className="btn-primary inline-block">
        Open {hint} Editor
      </a>
      <p className="text-xs text-light-muted">
        The full editor for {hint} is available via the legacy admin dashboard.<br />
        It includes bulk import, templates, cloning, and all advanced features.
      </p>
    </div>
  );
}

export function UniversitiesManager() { return <LegacyAdminContent defaultTab="Universities" />; }
export function CoursesManager() { return <LegacyAdminContent defaultTab="Courses" />; }
export function ExamsManager() { return <LegacyAdminContent defaultTab="Exams" />; }
export function NewsManager() { return <LegacyAdminContent defaultTab="News" />; }
