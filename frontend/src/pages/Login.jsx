import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

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

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 pb-20 md:pb-8">
      <Helmet>
        <title>Login | VidyarthiMitra</title>
        <meta name="description" content="Login to VidyarthiMitra to track applications, save universities and get personalized college recommendations." />
      </Helmet>
      <Card className="w-full max-w-md" padding="lg">
        <div className="mb-8 text-center">
          <h1 className="text-h1">Welcome back</h1>
          <p className="mt-2 text-body-sm text-light-muted">
            Sign in to save universities, track applications, and get recommendations.
          </p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((c) => !c)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-[38px] text-light-muted hover:text-light-text"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <Link to="/forgot-password" className="block text-right text-body-sm text-primary hover:underline">
              Forgot password?
            </Link>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending OTP...' : 'Continue'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-md border border-light-border bg-slate-50 px-4 py-3 dark:border-dark-border dark:bg-dark-border/50">
              <p className="text-caption font-semibold uppercase tracking-wide text-primary">OTP sent to</p>
              <p className="mt-1 text-body-sm font-medium break-all">{email}</p>
            </div>
            <Input
              type="text"
              label="Verification code"
              inputMode="numeric"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              autoFocus
              className="text-center text-lg tracking-widest font-mono"
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Verifying...' : 'Verify & sign in'}
            </Button>
            <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="btn-ghost w-full !min-h-0">
              Change email or password
            </button>
          </form>
        )}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-light-border dark:bg-dark-border" />
          <span className="text-caption text-light-muted">OR</span>
          <div className="h-px flex-1 bg-light-border dark:bg-dark-border" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={continueWithGoogle}>
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-body-sm text-light-muted">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-primary hover:underline">Sign up</Link>
        </p>
      </Card>
    </div>
  );
}
