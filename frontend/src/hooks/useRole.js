import { useAuth } from '../context/AuthContext';

/**
 * Returns role-based permission flags for the current user.
 *
 * isSuperAdmin  → can read, create, update, AND delete
 * isAdmin       → can read, create, update ONLY — no delete
 */
export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? 'user';

  return {
    role,
    isAdmin: role === 'admin' || role === 'superadmin',
    isSuperAdmin: role === 'superadmin',
    /** True only if the user is allowed to delete records */
    canDelete: role === 'superadmin',
  };
}
