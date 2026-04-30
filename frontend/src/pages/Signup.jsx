import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, continueWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.phone || undefined);
      toast.success('Verification code sent to your email');
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    }
    catch (err) { toast.error(err.response?.data?.message || 'Signup failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Sign Up</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" required />
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" required />
          <div className="flex gap-2">
            <span className="input-field !w-16 text-center text-sm flex items-center justify-center">+91</span>
            <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g, '')})} className="input-field flex-1" maxLength={10} />
          </div>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field pr-12" required />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showPassword ? <EyeOff className="w-5 h-5 text-light-muted" /> : <Eye className="w-5 h-5 text-light-muted" />}
            </button>
          </div>
          <div className="relative">
            <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm Password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} className="input-field pr-12" required />
            <button type="button" aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showConfirmPassword ? <EyeOff className="w-5 h-5 text-light-muted" /> : <Eye className="w-5 h-5 text-light-muted" />}
            </button>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating...' : 'Sign Up & Verify Email'}</button>
        </form>
        <div className="my-6 flex items-center gap-3"><div className="flex-1 h-px bg-light-border dark:bg-dark-border" /><span className="text-sm text-light-muted">OR</span><div className="flex-1 h-px bg-light-border dark:bg-dark-border" /></div>
        <button type="button" onClick={continueWithGoogle} className="w-full py-3 border border-light-border dark:border-dark-border rounded-xl font-medium hover:bg-light-card dark:hover:bg-dark-card transition text-sm">Continue with Google</button>
        <p className="text-center text-sm mt-6 text-light-muted">Already have an account? <Link to="/login" className="text-primary font-medium">Login</Link></p>
      </div>
    </div>
  );
}
