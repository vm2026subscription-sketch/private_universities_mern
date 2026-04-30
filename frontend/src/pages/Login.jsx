import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Mail, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [authMode, setAuthMode] = useState('email'); // email | phone
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpType, setOtpType] = useState('sms'); // sms | whatsapp
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, sendOtp, verifyPhoneOtp, continueWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await login(email, password); toast.success('Welcome back!'); navigate('/'); }
    catch (err) { toast.error(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) return toast.error('Enter a valid phone number');
    setLoading(true);
    try {
      const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      await sendOtp(fullPhone, otpType, 'login');
      toast.success(`OTP sent via ${otpType.toUpperCase()}`);
      setOtpSent(true);
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      await verifyPhoneOtp(fullPhone, otp);
      toast.success('Welcome!');
      navigate('/');
    } catch (err) { toast.error(err.response?.data?.message || 'Verification failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Login</h1>

        {/* Auth mode tabs */}
        <div className="flex rounded-xl bg-light-card dark:bg-dark-card p-1 mb-6">
          <button type="button" onClick={() => { setAuthMode('email'); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${authMode === 'email' ? 'bg-primary text-white shadow-sm' : ''}`}>
            <Mail className="w-4 h-4" /> Email
          </button>
          <button type="button" onClick={() => { setAuthMode('phone'); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${authMode === 'phone' ? 'bg-primary text-white shadow-sm' : ''}`}>
            <Phone className="w-4 h-4" /> Phone OTP
          </button>
        </div>

        {authMode === 'email' ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
            <div className="relative">
              <input type={show ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="input-field pr-12" required />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2">{show ? <EyeOff className="w-5 h-5 text-light-muted" /> : <Eye className="w-5 h-5 text-light-muted" />}</button>
            </div>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline block text-right">Forgot Password?</Link>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Logging in...' : 'Login'}</button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* OTP type selector */}
            <div className="flex rounded-lg bg-light-card dark:bg-dark-card p-0.5 gap-1">
              <button type="button" onClick={() => setOtpType('sms')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${otpType === 'sms' ? 'bg-white dark:bg-dark-border shadow-sm' : 'text-light-muted'}`}>
                <Smartphone className="w-3.5 h-3.5" /> SMS
              </button>
              <button type="button" onClick={() => setOtpType('whatsapp')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${otpType === 'whatsapp' ? 'bg-white dark:bg-dark-border shadow-sm' : 'text-light-muted'}`}>
                <Phone className="w-3.5 h-3.5" /> WhatsApp
              </button>
            </div>

            <div className="flex gap-2">
              <span className="input-field !w-16 text-center text-sm flex items-center justify-center">+91</span>
              <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} className="input-field flex-1" maxLength={10} />
            </div>

            {!otpSent ? (
              <button type="button" onClick={handleSendOtp} disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending...' : `Send OTP via ${otpType === 'whatsapp' ? 'WhatsApp' : 'SMS'}`}
              </button>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input type="text" placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} className="input-field text-center text-lg tracking-[0.3em] font-mono" maxLength={6} autoFocus />
                <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Verifying...' : 'Verify & Login'}</button>
                <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="text-sm text-primary hover:underline block text-center w-full">Change Number</button>
                <button type="button" onClick={handleSendOtp} disabled={loading} className="text-sm text-light-muted hover:text-primary block text-center w-full">Resend OTP</button>
              </form>
            )}
          </div>
        )}

        <div className="my-6 flex items-center gap-3"><div className="flex-1 h-px bg-light-border dark:bg-dark-border" /><span className="text-sm text-light-muted">OR</span><div className="flex-1 h-px bg-light-border dark:bg-dark-border" /></div>
        <button type="button" onClick={continueWithGoogle} className="w-full py-3 border border-light-border dark:border-dark-border rounded-xl font-medium hover:bg-light-card dark:hover:bg-dark-card transition text-sm">Continue with Google</button>
        <p className="text-center text-sm mt-6 text-light-muted">Don't have an account? <Link to="/signup" className="text-primary font-medium">Sign Up</Link></p>
      </div>
    </div>
  );
}
