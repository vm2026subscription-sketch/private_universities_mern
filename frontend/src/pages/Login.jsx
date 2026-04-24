import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await login(email, password); toast.success('Welcome back!'); navigate('/'); }
    catch (err) { toast.error(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
          <div className="relative">
            <input type={show ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="input-field pr-12" required />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2">{show ? <EyeOff className="w-5 h-5 text-light-muted" /> : <Eye className="w-5 h-5 text-light-muted" />}</button>
          </div>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline block text-right">Forgot Password?</Link>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <div className="my-6 flex items-center gap-3"><div className="flex-1 h-px bg-light-border dark:bg-dark-border" /><span className="text-sm text-light-muted">OR</span><div className="flex-1 h-px bg-light-border dark:bg-dark-border" /></div>
        <button className="w-full py-3 border border-light-border dark:border-dark-border rounded-xl font-medium hover:bg-light-card dark:hover:bg-dark-card transition text-sm">Continue with Google</button>
        <p className="text-center text-sm mt-6 text-light-muted">Don't have an account? <Link to="/signup" className="text-primary font-medium">Sign Up</Link></p>
      </div>
    </div>
  );
}
