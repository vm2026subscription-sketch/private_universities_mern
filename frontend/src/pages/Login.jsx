import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '../components/common/Seo';
import { Eye, EyeOff, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, verifyLoginOtp, continueWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await login(email, password);
      if (data.token) {
        // Admin / superadmin direct login — redirect to admin panel
        const role = data.user?.role;
        toast.success('Login successful');
        navigate(role === 'admin' || role === 'superadmin' ? '/admin' : '/');
      } else {
        setOtpSent(true);
        toast.success('OTP sent to your email');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (otp.length !== 6) return toast.error('Enter a valid 6-digit OTP');

    setLoading(true);
    try {
      const otpData = await verifyLoginOtp(email, otp);
      toast.success('Login successful');
      const role = otpData?.user?.role;
      navigate(role === 'admin' || role === 'superadmin' ? '/admin' : '/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resetStep = () => {
    setOtpSent(false);
    setOtp('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pb-20 md:pb-0">
      <Seo
        title="Login | Vidyarthi Mitra"
        description="Login to Vidyarthi Mitra to track applications, save universities and get personalized college recommendations."
        path="/login"
        noindex
      />
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="text-sm text-light-muted mt-2">
            Sign in with your password, then verify the one-time OTP sent to your email.
          </p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-field pl-11"
                required
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-field pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-5 h-5 text-light-muted" /> : <Eye className="w-5 h-5 text-light-muted" />}
              </button>
            </div>

            <Link to="/forgot-password" className="text-sm text-link hover:underline block text-right">
              Forgot Password?
            </Link>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending OTP...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card/50 dark:bg-dark-card/50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-link mb-1">OTP Sent To</p>
              <p className="text-sm font-medium break-all">{email}</p>
            </div>

            <div className="relative">
              <ShieldCheck className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                className="input-field pl-11 text-center text-lg tracking-[0.3em] font-mono"
                maxLength={6}
                autoFocus
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button type="button" onClick={resetStep} className="text-sm text-link hover:underline block text-center w-full">
              Change email or password
            </button>

            <button type="button" onClick={handleLogin} disabled={loading} className="text-sm text-light-muted hover:text-link block text-center w-full">
              Resend OTP
            </button>
          </form>
        )}

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-light-border dark:bg-dark-border" />
          <span className="text-sm text-light-muted">OR</span>
          <div className="flex-1 h-px bg-light-border dark:bg-dark-border" />
        </div>

        <button
          type="button"
          onClick={continueWithGoogle}
          className="w-full py-3 border border-light-border dark:border-dark-border rounded-xl font-medium hover:bg-light-card dark:hover:bg-dark-card transition text-sm"
        >
          Continue with Google
        </button>

        <p className="text-center text-sm mt-6 text-light-muted">
          Don&apos;t have an account? <Link to="/signup" className="text-link font-medium">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
