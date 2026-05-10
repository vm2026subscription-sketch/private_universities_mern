import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await forgotPassword(email);
      toast.success(response.message || 'Password reset link sent');
      setSubmitted(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
          <Mail className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-3">Forgot Password</h1>
        <p className="text-sm text-center text-light-muted dark:text-dark-muted mb-6">
          Enter your email address and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input-field"
            required
          />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {submitted ? (
          <p className="text-sm text-center text-light-muted dark:text-dark-muted mt-5">
            Check your inbox for the reset link. If the account exists, the email is on its way.
          </p>
        ) : null}

        <p className="text-center text-sm mt-6 text-light-muted">
          Remembered it? <Link to="/login" className="text-primary font-medium">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
