import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ERROR_MESSAGES = {
  google_auth_failed: 'Google sign-in failed. Please try again.',
  google_auth_unavailable: 'Google sign-in is not configured on this server yet.',
  account_unavailable: 'This account is not able to sign in. Please contact support.',
  missing_token: 'Google sign-in did not return a login code.',
};

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeGoogleAuth } = useAuth();
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    if (hasHandledCallback.current) return;
    hasHandledCallback.current = true;

    const error = searchParams.get('error');

    // The backend now returns a single-use, 60-second exchange code instead of
    // the JWT itself, keeping the credential out of browser history, Referer
    // headers and proxy logs. `token` is still read as a fallback so a callback
    // issued by a not-yet-redeployed backend still completes.
    const code = searchParams.get('code') || searchParams.get('token');

    if (error) {
      toast.error(ERROR_MESSAGES[error] || 'Google sign-in could not be completed.');
      navigate('/login', { replace: true });
      return;
    }

    if (!code) {
      toast.error(ERROR_MESSAGES.missing_token);
      navigate('/login', { replace: true });
      return;
    }

    completeGoogleAuth(code)
      .then(() => {
        toast.success('Signed in with Google');
        navigate('/', { replace: true });
      })
      .catch((requestError) => {
        toast.error(requestError.response?.data?.message || 'Failed to finish Google sign-in.');
        navigate('/login', { replace: true });
      });
  }, [completeGoogleAuth, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">Completing Sign-In</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted">
          Please wait while we finish your Google authentication.
        </p>
      </div>
    </div>
  );
}
