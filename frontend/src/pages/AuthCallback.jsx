import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ERROR_MESSAGES = {
  google_auth_failed: 'Google sign-in failed. Please try again.',
  google_auth_unavailable: 'Google sign-in is not configured on this server yet.',
  missing_token: 'Google sign-in did not return a login token.',
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
    const token = searchParams.get('token');

    if (error) {
      toast.error(ERROR_MESSAGES[error] || 'Google sign-in could not be completed.');
      navigate('/login', { replace: true });
      return;
    }

    if (!token) {
      toast.error(ERROR_MESSAGES.missing_token);
      navigate('/login', { replace: true });
      return;
    }

    completeGoogleAuth(token)
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
