import { useEffect, useState } from 'react';
import { Building2, Mail, ShieldOff, Clock, CheckCircle2, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Who controls which university, and how to take that back.
 *
 * Ownership lives only on the user record — it is deliberately not mirrored onto
 * the University document — so this list is the only place the question "who
 * manages this university?" gets answered. Until now the revoke endpoint existed
 * with no screen to reach it, which meant the answer to "can I remove a
 * university's access?" was "yes, but only from Postman".
 */
export default function UniversityAccounts() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/university-portal/accounts');
      setAccounts(data.accounts || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const revoke = async () => {
    setWorking(true);
    try {
      const { data } = await api.delete(`/university-portal/access/${confirming.id}`);
      toast.success(data.message || 'Access revoked');
      setConfirming(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not revoke access');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-light-text dark:text-dark-text">University accounts</h1>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-1">
            Who can sign in and manage a university profile.
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-light-border dark:border-dark-border text-light-muted hover:text-light-text transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-light-muted">Loading…</p>
      ) : accounts.length === 0 ? (
        <div className="p-10 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-center">
          <div className="w-11 h-11 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border flex items-center justify-center mx-auto">
            <Building2 className="w-5 h-5 text-light-muted dark:text-dark-muted" />
          </div>
          <h2 className="font-semibold text-light-text dark:text-dark-text mt-4">No university accounts</h2>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-2">
            Accounts appear here once a university signs up and its claim is approved.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-light-muted dark:text-dark-muted border-b border-light-border dark:border-dark-border">
                <th className="p-4">Person</th>
                <th className="p-4">University</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-light-border dark:border-dark-border last:border-0">
                  <td className="p-4">
                    <p className="font-semibold text-light-text dark:text-dark-text">{a.name}</p>
                    <p className="text-xs text-light-muted flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" /> {a.email}
                    </p>
                  </td>

                  <td className="p-4">
                    {a.university ? (
                      <>
                        <p className="text-light-text dark:text-dark-text">{a.university.name}</p>
                        <p className="text-xs text-light-muted">{a.university.location}</p>
                      </>
                    ) : (
                      <span className="text-xs text-light-muted">—</span>
                    )}
                  </td>

                  <td className="p-4">
                    <span className="text-xs text-light-muted">{a.universityRole || '—'}</span>
                  </td>

                  <td className="p-4">
                    {a.hasAccess ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <Clock className="w-3.5 h-3.5" /> Awaiting approval
                      </span>
                    )}
                    {!a.isEmailVerified && (
                      <p className="text-[11px] text-amber-600 mt-1">Email unverified</p>
                    )}
                  </td>

                  <td className="p-4 text-right">
                    {a.hasAccess && (
                      <button
                        onClick={() => setConfirming(a)}
                        disabled={!isSuperadmin}
                        title={isSuperadmin ? 'Revoke access' : 'Only a superadmin can revoke access'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ShieldOff className="w-3.5 h-3.5" /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isSuperadmin && accounts.some((a) => a.hasAccess) && (
        <p className="text-xs text-light-muted">
          Revoking access is restricted to superadmins — it signs the university out immediately and
          removes anyone they invited.
        </p>
      )}

      {/* Confirmation. Revocation is instant and cannot be undone from here, so
          it states exactly what will happen before it happens. */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="max-w-md w-full p-6 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-light-text dark:text-dark-text">Revoke access?</h3>
              <button onClick={() => setConfirming(null)} className="text-light-muted hover:text-light-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-light-muted dark:text-dark-muted mt-3 leading-relaxed">
              <span className="font-medium text-light-text dark:text-dark-text">{confirming.email}</span> will
              lose access to <span className="font-medium text-light-text dark:text-dark-text">{confirming.university?.name}</span> immediately,
              along with anyone they invited.
            </p>

            <ul className="text-xs text-light-muted dark:text-dark-muted mt-3 space-y-1 list-disc list-inside">
              <li>Their signed-in session ends at once.</li>
              <li>The university profile and its data are untouched.</li>
              <li>They can sign up again and be reviewed afresh.</li>
            </ul>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirming(null)}
                className="flex-1 py-2.5 rounded-lg border border-light-border dark:border-dark-border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={revoke}
                disabled={working}
                className="flex-1 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {working ? 'Revoking…' : 'Revoke access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
