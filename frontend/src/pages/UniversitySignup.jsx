import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, Mail, Phone, Search, ShieldCheck, Upload, X, FileCheck2 } from 'lucide-react';
import toast from 'react-hot-toast';

import Seo from '../components/common/Seo';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

/**
 * University representative signup.
 *
 * Separate from the student form because the information required is genuinely
 * different, not merely longer. A student account needs an identity; this one
 * needs enough evidence for an admin to decide whether the applicant may speak
 * for an institution — which is why designation and phone are mandatory here
 * while phone stays optional for students.
 *
 * The phone number in particular is not contact convenience. Verification works
 * by calling the number published on the university's OWN website and asking for
 * the applicant, precisely because the number typed into this form is under the
 * applicant's control. Without a number on the form there is nothing to compare.
 */
export default function UniversitySignup() {
  const navigate = useNavigate();
  const { verifyEmail, resendVerificationEmail } = useAuth();

  const [form, setForm] = useState({
    name: '',
    designation: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    website: '',
  });

  // University selection
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notListed, setNotListed] = useState(false);
  const [newUniversityName, setNewUniversityName] = useState('');
  const [searching, setSearching] = useState(false);

  const [letterUrl, setLetterUrl] = useState('');
  const [uploadingLetter, setUploadingLetter] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  /* ── University search ────────────────────────────────────────────────── */

  const searchTimer = useRef(null);

  useEffect(() => {
    if (selected || notListed || query.trim().length < 2) {
      setResults([]);
      return undefined;
    }

    // Debounced so typing a university name does not fire a request per
    // keystroke against a 700-record collection.
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/universities?search=${encodeURIComponent(query.trim())}&limit=8`);
        setResults(data.data || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(searchTimer.current);
  }, [query, selected, notListed]);

  /* ── Authorisation letter ─────────────────────────────────────────────── */

  const handleLetterUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLetter(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'claim-letters');

      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = data?.url || data?.data?.url;
      if (!url) throw new Error('Upload did not return a URL');

      setLetterUrl(url);
      toast.success('Authorisation letter attached');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload the letter');
    } finally {
      setUploadingLetter(false);
    }
  };

  /* ── Submit ───────────────────────────────────────────────────────────── */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (!selected && !notListed) {
      return toast.error('Select your university, or tick "not listed"');
    }
    if (notListed && !newUniversityName.trim()) {
      return toast.error('Enter your university name');
    }
    if (form.phone.length !== 10) {
      return toast.error('Enter a valid 10-digit phone number');
    }

    setLoading(true);
    try {
      const { data } = await api.post('/university-portal/signup', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone,
        designation: form.designation.trim(),
        contactPerson: form.name.trim(),
        ...(selected ? { universityId: selected._id } : { requestedUniversityName: newUniversityName.trim() }),
        ...(form.website.trim() ? { website: form.website.trim() } : {}),
        ...(letterUrl ? { authorizationLetterUrl: letterUrl } : {}),
      });

      setOtpStep(true);
      if (data.devVerificationCode) {
        setOtp(data.devVerificationCode);
        toast.success(`Verification code sent. Local mode code: ${data.devVerificationCode}`);
      } else {
        toast.success(data.message || 'Request submitted. Check your email for the verification code.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit your request');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (otp.length !== 6) return toast.error('Enter a valid 6-digit OTP');

    setLoading(true);
    try {
      await verifyEmail(form.email.trim(), otp);
      // Email is proven, but access is not granted until an admin approves the
      // claim — so this lands on the waiting screen, never the dashboard.
      navigate('/university/pending');
    } catch (error) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const response = await resendVerificationEmail(form.email.trim());
      if (response.devVerificationCode) {
        setOtp(response.devVerificationCode);
        toast.success(`Code resent. Local mode code: ${response.devVerificationCode}`);
      } else {
        toast.success(response.message || 'Verification code resent');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not resend OTP');
    } finally {
      setResending(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 pb-20 md:pb-10">
      <Seo
        title="University Registration | Vidyarthi Mitra"
        description="Register your university to manage its profile, courses, gallery and placements on Vidyarthi Mitra."
        path="/university/signup"
        noindex
      />

      <div className="card p-8 w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-link" />
          </div>
          <h1 className="text-2xl font-bold">Register your University</h1>
          <p className="text-sm text-light-muted mt-2">
            {otpStep
              ? 'Verify your email to complete the request.'
              : 'Manage your profile, courses, gallery and placements. Our team reviews every request.'}
          </p>
        </div>

        {!otpStep ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── University ─────────────────────────────────────────────── */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-light-muted mb-2 block">
                Which university do you represent?
              </label>

              {selected ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-300 bg-orange-50/50 dark:bg-orange-900/10 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{selected.name}</p>
                    <p className="text-xs text-light-muted truncate">
                      {[selected.city, selected.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelected(null); setQuery(''); }}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30"
                    aria-label="Change university"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : notListed ? (
                <input
                  type="text"
                  placeholder="Enter your university's full name"
                  value={newUniversityName}
                  onChange={(event) => setNewUniversityName(event.target.value)}
                  className="input-field"
                  required
                />
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted" />
                  <input
                    type="text"
                    placeholder="Search your university by name"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="input-field pl-11"
                    autoComplete="off"
                  />

                  {query.trim().length >= 2 && (
                    <div className="absolute z-20 left-0 right-0 mt-2 rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xl max-h-64 overflow-y-auto">
                      {searching ? (
                        <p className="px-4 py-3 text-sm text-light-muted">Searching…</p>
                      ) : results.length ? (
                        results.map((university) => (
                          <button
                            key={university._id}
                            type="button"
                            onClick={() => { setSelected(university); setResults([]); }}
                            className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-white/5 transition-colors"
                          >
                            <p className="text-sm font-medium truncate">{university.name}</p>
                            <p className="text-xs text-light-muted truncate">
                              {[university.city, university.state].filter(Boolean).join(', ')}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-light-muted">
                          No match. Tick “not listed” below.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2 mt-3 text-sm text-light-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={notListed}
                  onChange={(event) => {
                    setNotListed(event.target.checked);
                    setSelected(null);
                    setQuery('');
                  }}
                  className="rounded border-light-border"
                />
                My university is not listed yet
              </label>
            </div>

            <div className="h-px bg-light-border dark:bg-dark-border" />

            {/* ── Person ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Your full name"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                className="input-field"
                required
              />
              <input
                type="text"
                placeholder="Designation (e.g. Registrar)"
                value={form.designation}
                onChange={(event) => update('designation', event.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted" />
              <input
                type="email"
                placeholder="Official email address"
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                className="input-field pl-11"
                required
              />
            </div>
            <p className="text-xs text-light-muted -mt-2">
              An official university domain speeds up approval, but a personal address is accepted.
            </p>

            <div className="flex gap-2">
              <span className="input-field !w-16 text-center text-sm flex items-center justify-center">+91</span>
              <div className="relative flex-1">
                <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted" />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={(event) => update('phone', event.target.value.replace(/\D/g, ''))}
                  className="input-field pl-11"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <input
              type="url"
              placeholder="University website (optional)"
              value={form.website}
              onChange={(event) => update('website', event.target.value)}
              className="input-field"
            />

            {/* ── Authorisation letter ───────────────────────────────────── */}
            <div>
              {letterUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 min-w-0">
                    <FileCheck2 className="w-4 h-4 shrink-0" />
                    Authorisation letter attached
                  </span>
                  <button
                    type="button"
                    onClick={() => setLetterUrl('')}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                    aria-label="Remove letter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-light-border dark:border-dark-border px-4 py-3 text-sm text-light-muted cursor-pointer hover:border-orange-300 transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploadingLetter ? 'Uploading…' : 'Attach authorisation letter (optional)'}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleLetterUpload}
                    disabled={uploadingLetter}
                    className="hidden"
                  />
                </label>
              )}
              <p className="text-xs text-light-muted mt-2">
                On university letterhead. Requests with a letter are approved considerably faster.
              </p>
            </div>

            {/* ── Password ───────────────────────────────────────────────── */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={(event) => update('password', event.target.value)}
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
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={(event) => update('confirmPassword', event.target.value)}
                className="input-field pr-12"
                required
              />
              <button
                type="button"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirm((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirm ? <EyeOff className="w-5 h-5 text-light-muted" /> : <Eye className="w-5 h-5 text-light-muted" />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Submitting…' : 'Submit Request'}
            </button>

            <p className="text-xs text-center text-light-muted">
              Our team verifies every request before granting access, usually within 2 working days.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card/50 dark:bg-dark-card/50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-link mb-1">Verification email sent to</p>
              <p className="text-sm font-medium break-all">{form.email}</p>
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
              {loading ? 'Verifying…' : 'Verify Email'}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
              className="text-sm text-light-muted hover:text-link block text-center w-full"
            >
              {resending ? 'Resending…' : 'Resend OTP'}
            </button>
          </form>
        )}

        <p className="text-center text-sm mt-6 text-light-muted">
          Already registered? <Link to="/login" className="text-link font-medium">Sign in</Link>
        </p>
        <p className="text-center text-sm mt-2 text-light-muted">
          Are you a student? <Link to="/signup" className="text-link font-medium">Create a student account</Link>
        </p>
      </div>
    </div>
  );
}
