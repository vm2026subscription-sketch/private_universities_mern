import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { verifyEmail, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();

  const isReady = useMemo(() => email.trim() && code.trim().length === 6, [email, code]);

  const handleVerify = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await verifyEmail(email, code);
      toast.success('Email verified. You can log in now.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return toast.error('Enter your email first');
    setResending(true);
    try {
      await resendVerificationEmail(email);
      toast.success('New verification code sent');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Resend failed');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-3">Verify Email</h1>
        <p className="text-sm text-center text-light-muted dark:text-dark-muted mb-6">
          Enter the 6-digit verification code sent to your email after signup.
        </p>
        <form onSubmit={handleVerify} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} className="input-field" required />
          <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit verification code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} className="input-field tracking-[0.3em]" required />
          <button type="submit" disabled={!isReady || loading} className="btn-primary w-full">
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
        <button type="button" onClick={handleResend} disabled={resending} className="w-full mt-4 py-3 border border-light-border dark:border-dark-border rounded-xl font-medium hover:bg-light-card dark:hover:bg-dark-card transition text-sm">
          {resending ? 'Sending...' : 'Resend Code'}
        </button>
        <p className="text-center text-sm mt-6 text-light-muted">
          Already verified? <Link to="/login" className="text-primary font-medium">Login</Link>
        </p>
      </div>
    </div>
  );
}
