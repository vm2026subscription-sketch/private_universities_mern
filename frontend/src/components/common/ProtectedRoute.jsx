import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false, superadminOnly = false, universityOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (superadminOnly && user.role !== 'superadmin') return <Navigate to="/admin" replace />;
  if (adminOnly && user.role !== 'admin' && user.role !== 'superadmin') return <Navigate to="/" replace />;
  /**
   * Admins are sent to their own panel, not into a tenant's dashboard.
   *
   * Letting them through here produced a half-broken screen: the UI rendered but
   * every tenant API answered 403, because those endpoints derive their target
   * from the session and an admin has no universityId. The two roles use
   * genuinely different models — an admin acts on a university by id from
   * /admin/universities, a tenant acts on its own by session — and the previous
   * attempt to serve both from one screen is what led to a fallback that handed
   * out an arbitrary real university.
   */
  if (universityOnly) {
    if (user.role === 'admin' || user.role === 'superadmin') return <Navigate to="/admin" replace />;
    if (user.role !== 'university') return <Navigate to="/" replace />;
    // Signed up and verified, but the claim is still with a reviewer.
    if (!user.universityId) return <Navigate to="/university/pending" replace />;
  }
  return children;
}
