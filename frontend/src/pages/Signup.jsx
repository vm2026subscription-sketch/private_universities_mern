import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '../components/common/Seo';
import { Eye, EyeOff, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Signup() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { register, verifyEmail, resendVerificationEmail, continueWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setLoading(true);
    try {
      const response = await register(form.name, form.email, form.password, form.phone || undefined);
      setOtpStep(true);
      if (response.devVerificationCode) {
        setOtp(response.devVerificationCode);
        setDevCode(response.devVerificationCode);
      }
      toast.success(response.message || 'OTP sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (otp.length !== 6) return toast.error('Enter a valid 6-digit OTP');

    setLoading(true);
    try {
      await verifyEmail(form.email, otp);
      toast.success('Account verified successfully');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const response = await resendVerificationEmail(form.email);
      if (response.devVerificationCode) {
        setOtp(response.devVerificationCode);
        setDevCode(response.devVerificationCode);
      }
      toast.success(response.message || 'OTP resent successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pb-20 md:pb-0">
      <Seo
        title="Create Account | Vidyarthi Mitra"
        description="Create your free Vidyarthi Mitra account. Get personalized university recommendations, track applications and compare colleges."
        path="/signup"
        noindex
      />
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Sign Up</h1>
          <p className="text-sm text-light-muted mt-2">
            Create your account and verify it with the OTP sent to your email.
          </p>
        </div>

        {!otpStep ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="input-field"
              required
            />

            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted" />
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="input-field pl-11"
                required
              />
            </div>

            <div className="flex gap-2">
              <span className="input-field !w-16 text-center text-sm flex items-center justify-center">+91</span>
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '') })}
                className="input-field flex-1"
                maxLength={10}
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="input-field pr-12"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-5 h-5 text-light-muted" /> : <Eye className="w-5 h-5 text-light-muted" />}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                className="input-field pr-12"
                required
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5 text-light-muted" /> : <Eye className="w-5 h-5 text-light-muted" />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending OTP...' : 'Create Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card/50 dark:bg-dark-card/50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-link mb-1">Verification Email</p>
              <p className="text-sm font-medium break-all">{form.email}</p>
            </div>

            {devCode ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Local mode code: <span className="font-bold tracking-[0.25em]">{devCode}</span>
              </div>
            ) : null}

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
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
              className="text-sm text-light-muted hover:text-link block text-center w-full"
            >
              {resending ? 'Resending OTP...' : 'Resend OTP'}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpStep(false);
                setOtp('');
              }}
              className="text-sm text-link hover:underline block text-center w-full"
            >
              Change account details
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
          Already have an account? <Link to="/login" className="text-link font-medium">Login</Link>
        </p>
      </div>
    </div>
  );
}
