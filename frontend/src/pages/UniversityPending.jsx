import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, XCircle, Mail, RefreshCw, Building2 } from 'lucide-react';

import Seo from '../components/common/Seo';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

/**
 * Where a university applicant waits.
 *
 * Reached both after signup and whenever an unapproved account tries to open the
 * dashboard. It exists because the alternative — a red "403 Forbidden" toast on
 * the login screen — tells someone who did everything correctly that they did
 * something wrong. Nothing here is an error; the request is simply with a human.
 */
export default function UniversityPending() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/university-portal/me');

      // Approved while the tab sat open — send them straight in.
      if (data.hasAccess) {
        navigate('/university/dashboard');
        return;
      }

      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const claim = status?.claim;
  const rejected = claim?.status === 'rejected';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 pb-20 md:pb-10">
      <Seo title="Request Under Review | Vidyarthi Mitra" path="/university/pending" noindex />

      <div className="card p-8 w-full max-w-lg text-center">
        {loading ? (
          <>
            <RefreshCw className="w-10 h-10 text-light-muted mx-auto mb-4 animate-spin" />
            <p className="text-sm text-light-muted">Checking your request…</p>
          </>
        ) : rejected ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Request not approved</h1>

            {claim.reviewNote ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 dark:bg-rose-900/10 px-4 py-3 text-left mb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-1">Reason</p>
                <p className="text-sm">{claim.reviewNote}</p>
              </div>
            ) : null}

            <p className="text-sm text-light-muted mb-6">
              You can apply again with the missing information.
            </p>
            <Link to="/university/signup" className="btn-primary inline-block px-8">
              Apply again
            </Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Your request is under review</h1>
            <p className="text-sm text-light-muted mb-6">
              Our team verifies every university before granting access — usually within 2 working days.
              You will get an email as soon as it is approved.
            </p>

            {claim ? (
              <div className="rounded-2xl border border-light-border dark:border-dark-border px-4 py-4 text-left mb-6 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-light-muted shrink-0" />
                  <span className="font-medium truncate">{claim.universityName || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-light-muted shrink-0" />
                  <span className="text-light-muted truncate">{claim.officialEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-light-muted">
                    Submitted {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : 'recently'}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl bg-light-card/60 dark:bg-dark-card/60 px-4 py-3 text-left mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-light-muted mb-2">
                What happens next
              </p>
              <ol className="text-sm text-light-muted space-y-1.5 list-decimal list-inside">
                <li>We check your designation and authorisation letter.</li>
                <li>We may call the number listed on your university's website.</li>
                <li>Once approved, you can set up your subscription and dashboard.</li>
              </ol>
            </div>

            <button onClick={loadStatus} className="btn-primary w-full flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Check status
            </button>
          </>
        )}

        <p className="text-center text-sm mt-6 text-light-muted">
          <Link to="/" className="text-link font-medium">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
