import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success('Password reset successful');
      navigate('/profile', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-3">Reset Password</h1>
        <p className="text-sm text-center text-light-muted dark:text-dark-muted mb-6">
          Choose a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field pr-12"
              minLength={6}
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
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="input-field pr-12"
              minLength={6}
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
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-light-muted">
          Back to <Link to="/login" className="text-primary font-medium">login</Link>
        </p>
      </div>
    </div>
  );
}
