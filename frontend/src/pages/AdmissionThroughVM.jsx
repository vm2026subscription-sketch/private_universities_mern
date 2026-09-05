import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowRight, BadgeIndianRupee, BookOpenCheck, Check, CheckCircle2,
  ChevronDown, ClipboardCheck, GraduationCap, Headphones, Loader2, MapPin,
  Building2, Search, ShieldCheck, Sparkles, Target, UsersRound,
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Seo from '../components/common/Seo';

const ANY_BRANCH = 'Any branch / specialization';

const INDIA_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const benefits = [
  {
    icon: Target,
    title: 'Better-fit shortlist',
    text: 'Your stream, course, branch and preferred state are matched with relevant universities from our catalogue.',
  },
  {
    icon: BadgeIndianRupee,
    title: 'Fee-saving guidance',
    text: 'Get help identifying applicable scholarships, fee waivers and sensible application choices to avoid unnecessary spend.',
  },
  {
    icon: ClipboardCheck,
    title: 'Stronger application readiness',
    text: 'Counsellors help you check eligibility, documents and deadlines so avoidable application mistakes do not hold you back.',
  },
  {
    icon: Headphones,
    title: 'Dedicated support',
    text: 'Discuss your selected universities with the VM counselling team and get clear next-step guidance.',
  },
];

const initialForm = (user) => ({
  fullName: user?.name || '',
  email: user?.email || '',
  phone: user?.phone || '',
  currentCity: user?.profile?.city || '',
  currentState: INDIA_STATES.includes(user?.profile?.state) ? user.profile.state : '',
  class12Percentage: '',
  entranceExam: user?.profile?.targetExam || '',
  entranceScore: '',
  stream: '',
  course: '',
  branch: '',
  preferredState: '',
  selectedUniversityIds: [],
  message: '',
  consent: false,
});

const fieldClass = 'input-field !py-3.5 disabled:opacity-60 disabled:cursor-not-allowed';

function FormField({ label, required, hint, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
        {label}{required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-light-muted dark:text-dark-muted">{hint}</span>}
    </label>
  );
}

function SelectField({ value, onChange, disabled, placeholder, options, required = true }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`${fieldClass} appearance-none pr-10`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value || option} value={option.value || option}>
            {option.label || option}
            {option.universityCount ? ` (${option.universityCount} universities)` : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  );
}

export default function AdmissionThroughVM() {
  const { user } = useAuth();
  const formRef = useRef(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => initialForm(user));
  const [options, setOptions] = useState({ streams: [], courses: [], branches: [], states: [], universities: [] });
  const [loading, setLoading] = useState({ streams: true });
  const [catalogError, setCatalogError] = useState('');
  const [universitySearch, setUniversitySearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const fetchOptions = async (resource, params = {}) => {
    setLoading((current) => ({ ...current, [resource]: true }));
    setCatalogError('');
    try {
      const { data } = await api.get(`/admission/catalog/${resource}`, { params });
      const rows = Array.isArray(data?.data) ? data.data : [];
      setOptions((current) => ({ ...current, [resource]: rows }));
      return rows;
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to load admission options. Please try again.';
      setCatalogError(message);
      setOptions((current) => ({ ...current, [resource]: [] }));
      return [];
    } finally {
      setLoading((current) => ({ ...current, [resource]: false }));
    }
  };

  useEffect(() => {
    fetchOptions('streams');
  }, []);

  const handleStream = async (event) => {
    const stream = event.target.value;
    setForm((current) => ({
      ...current,
      stream,
      course: '', branch: '', preferredState: '', selectedUniversityIds: [],
    }));
    setOptions((current) => ({ ...current, courses: [], branches: [], states: [], universities: [] }));
    if (stream) await fetchOptions('courses', { stream });
  };

  const loadStates = (stream, course, branch) => fetchOptions('states', { stream, course, branch });

  const handleCourse = async (event) => {
    const course = event.target.value;
    setForm((current) => ({
      ...current,
      course,
      branch: '', preferredState: '', selectedUniversityIds: [],
    }));
    setOptions((current) => ({ ...current, branches: [], states: [], universities: [] }));
    if (!course) return;
    const branches = await fetchOptions('branches', { stream: form.stream, course });
    if (branches.length === 0) {
      setForm((current) => ({ ...current, branch: ANY_BRANCH }));
      await loadStates(form.stream, course, ANY_BRANCH);
    }
  };

  const handleBranch = async (event) => {
    const branch = event.target.value;
    setForm((current) => ({
      ...current,
      branch,
      preferredState: '', selectedUniversityIds: [],
    }));
    setOptions((current) => ({ ...current, states: [], universities: [] }));
    if (branch) await loadStates(form.stream, form.course, branch);
  };

  const handlePreferredState = async (event) => {
    const preferredState = event.target.value;
    setForm((current) => ({ ...current, preferredState, selectedUniversityIds: [] }));
    setOptions((current) => ({ ...current, universities: [] }));
    if (preferredState) {
      await fetchOptions('universities', {
        stream: form.stream,
        course: form.course,
        branch: form.branch,
        state: preferredState,
      });
    }
  };

  const validatePersonal = () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.currentCity.trim() || !form.currentState) {
      toast.error('Please complete all required personal details.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Please enter a valid email address.');
      return false;
    }
    if (!/^(?:\+91)?[6-9]\d{9}$/.test(form.phone.replace(/[\s()-]/g, ''))) {
      toast.error('Please enter a valid 10-digit Indian mobile number.');
      return false;
    }
    const percentage = Number(form.class12Percentage);
    if (form.class12Percentage !== '' && (Number.isNaN(percentage) || percentage < 0 || percentage > 100)) {
      toast.error('Class 12 percentage must be between 0 and 100.');
      return false;
    }
    return true;
  };

  const goToStep = (nextStep) => {
    if (nextStep === 2 && !validatePersonal()) return;
    if (nextStep === 3 && (!form.stream || !form.course || !form.branch || !form.preferredState)) {
      toast.error('Please select your stream, course, branch and preferred state.');
      return;
    }
    setStep(nextStep);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleUniversity = (id) => {
    setForm((current) => {
      const selected = current.selectedUniversityIds;
      if (selected.includes(id)) {
        return { ...current, selectedUniversityIds: selected.filter((item) => item !== id) };
      }
      if (selected.length >= 5) {
        toast.error('You can select a maximum of 5 universities.');
        return current;
      }
      return { ...current, selectedUniversityIds: [...selected, id] };
    });
  };

  const filteredUniversities = useMemo(() => {
    const query = universitySearch.trim().toLowerCase();
    if (!query) return options.universities;
    return options.universities.filter((university) =>
      [university.name, university.city, university.state].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [options.universities, universitySearch]);

  const submit = async (event) => {
    event.preventDefault();
    if (form.selectedUniversityIds.length < 1) return toast.error('Please select at least one university.');
    if (!form.consent) return toast.error('Please accept the counselling consent.');

    setSubmitting(true);
    try {
      const { data } = await api.post('/admission/applications', form);
      setSuccess(data.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Admission request submitted successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUniversities = options.universities.filter((university) => form.selectedUniversityIds.includes(String(university._id)));

  if (success) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 page-enter">
        <Seo
          title="Admission Request Submitted | Vidyarthi Mitra"
          description="Your Admission Through VM counselling request has been submitted."
          path="/admission-through-vm"
          noindex
        />
        <div className="max-w-xl w-full card p-8 md:p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="badge badge-green mb-4">Request received</span>
          <h1 className="text-3xl font-black mb-3">Your counselling journey starts here</h1>
          <p className="text-light-muted dark:text-dark-muted mb-6">
            The VM admissions team will review your preferences and contact you on the mobile number or email you provided.
          </p>
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5 mb-7">
            <p className="text-xs font-bold uppercase tracking-widest text-link mb-1">Application number</p>
            <p className="text-2xl font-black tracking-wide">{success.applicationNumber}</p>
            <p className="text-xs text-light-muted mt-2">Save this number for future communication.</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/" className="btn-outline justify-center">Back to Home</Link>
            <Link to="/universities" className="btn-primary justify-center">Explore Universities</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <Seo
        title="Admission Through VM | Expert University Admission Support"
        description="Get personalised university shortlisting, fee and scholarship guidance, application-readiness checks and admission counselling from Vidyarthi Mitra."
        path="/admission-through-vm"
        keywords="admission through VM, university admission counselling, private university admission support"
      />

      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.32),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_35%)]" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-[1.15fr_.85fr] gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-sm font-bold text-orange-200 mb-6">
              <Sparkles className="w-4 h-4" /> Personalised admission assistance
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.08] mb-5">
              Admission Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">VM</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed mb-8">
              Tell us your goal once. We will help you shortlist relevant universities, prepare a stronger application and understand possible ways to reduce your overall admission spend.
            </p>
            <button type="button" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} className="btn-primary gap-2">
              Start your request <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <div className="rounded-3xl bg-white/10 border border-white/15 backdrop-blur p-6 md:p-8 shadow-2xl">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['01', 'Share your profile'], ['02', 'Choose preferences'],
                  ['03', 'Pick up to 5 universities'], ['04', 'Get VM guidance'],
                ].map(([number, label]) => (
                  <div key={number} className="rounded-2xl bg-white/10 p-4 min-h-28 flex flex-col justify-between">
                    <span className="text-2xl font-black text-orange-300">{number}</span>
                    <span className="text-sm font-bold text-slate-100">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14 md:py-20">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-sm font-black uppercase tracking-[0.2em] text-link">Why choose VM</span>
          <h2 className="text-3xl md:text-4xl font-black mt-3 mb-4">Support that makes every application count</h2>
          <p className="text-light-muted dark:text-dark-muted">Practical guidance built around your profile—not a one-size-fits-all college list.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="card hover-card p-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <benefit.icon className="w-6 h-6 text-link" />
              </div>
              <h3 className="font-black text-lg mb-2">{benefit.title}</h3>
              <p className="text-sm leading-relaxed text-light-muted dark:text-dark-muted">{benefit.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 px-5 py-4 text-sm text-amber-900 dark:text-amber-200">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <p>VM provides counselling and application assistance. Admission, scholarship and fee-waiver decisions remain with the respective university and are not guaranteed.</p>
        </div>
      </section>

      <section ref={formRef} className="scroll-mt-24 bg-slate-50 dark:bg-slate-950/40 border-y border-light-border dark:border-dark-border py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-9">
            <span className="badge badge-orange mb-3">Takes about 5 minutes</span>
            <h2 className="text-3xl md:text-4xl font-black">Start your admission request</h2>
            <p className="text-light-muted dark:text-dark-muted mt-3">Complete all three steps so our counsellors can give you relevant guidance.</p>
          </div>

          <div className="flex items-start justify-between max-w-2xl mx-auto mb-8" aria-label={`Step ${step} of 3`}>
            {[
              [1, UsersRound, 'Your details'], [2, BookOpenCheck, 'Preferences'], [3, Building2, 'Universities'],
            ].map(([number, Icon, label], index) => (
              <div key={number} className="contents">
                {index > 0 && <div className={`h-1 flex-1 mt-5 mx-2 rounded-full ${step >= number ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                <div className="flex flex-col items-center gap-2 min-w-20">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= number ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-dark-card border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                    {step > number ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-bold text-center ${step >= number ? 'text-link' : 'text-slate-400'}`}>{label}</span>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={submit} className="card p-5 md:p-8 lg:p-10">
            {step === 1 && (
              <div className="space-y-7">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-link mb-2">Step 1 of 3</p>
                  <h3 className="text-2xl font-black">Tell us about yourself</h3>
                  <p className="text-sm text-light-muted dark:text-dark-muted mt-1">We use these details only to review your request and contact you about admission support.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <FormField label="Full name" required>
                    <input value={form.fullName} onChange={update('fullName')} className={fieldClass} maxLength={100} autoComplete="name" placeholder="Your full name" />
                  </FormField>
                  <FormField label="Email address" required>
                    <input type="email" value={form.email} onChange={update('email')} className={fieldClass} maxLength={180} autoComplete="email" placeholder="you@example.com" />
                  </FormField>
                  <FormField label="Mobile number" required hint="Indian mobile number; +91 is optional.">
                    <input type="tel" value={form.phone} onChange={update('phone')} className={fieldClass} maxLength={16} autoComplete="tel" inputMode="tel" placeholder="9876543210" />
                  </FormField>
                  <FormField label="Current city" required>
                    <input value={form.currentCity} onChange={update('currentCity')} className={fieldClass} maxLength={100} autoComplete="address-level2" placeholder="Your city" />
                  </FormField>
                  <FormField label="Current state / UT" required>
                    <SelectField value={form.currentState} onChange={update('currentState')} placeholder="Select your current state" options={INDIA_STATES} />
                  </FormField>
                  <FormField label="Class 12 percentage" hint="Optional—helps us assess eligibility.">
                    <input type="number" value={form.class12Percentage} onChange={update('class12Percentage')} className={fieldClass} min="0" max="100" step="0.01" inputMode="decimal" placeholder="e.g. 82.5" />
                  </FormField>
                  <FormField label="Entrance exam" hint="Optional">
                    <input value={form.entranceExam} onChange={update('entranceExam')} className={fieldClass} maxLength={100} placeholder="e.g. JEE Main, CUET" />
                  </FormField>
                  <FormField label="Score / percentile / rank" hint="Optional">
                    <input value={form.entranceScore} onChange={update('entranceScore')} className={fieldClass} maxLength={80} placeholder="e.g. 92 percentile" />
                  </FormField>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-7">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-link mb-2">Step 2 of 3</p>
                  <h3 className="text-2xl font-black">Choose your study preferences</h3>
                  <p className="text-sm text-light-muted dark:text-dark-muted mt-1">Every option below comes from the courses currently available in the VM university catalogue.</p>
                </div>
                {catalogError && (
                  <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    {catalogError}
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-5">
                  <FormField label="Stream" required>
                    <SelectField value={form.stream} onChange={handleStream} disabled={loading.streams} placeholder={loading.streams ? 'Loading streams...' : 'Select a stream'} options={options.streams} />
                  </FormField>
                  <FormField label="Course" required>
                    <SelectField value={form.course} onChange={handleCourse} disabled={!form.stream || loading.courses} placeholder={loading.courses ? 'Loading courses...' : 'Select a course'} options={options.courses} />
                  </FormField>
                  <FormField label="Branch / specialization" required hint={options.branches.length === 0 && form.course && !loading.branches ? 'No separate branch is required for this course.' : undefined}>
                    <SelectField
                      value={form.branch}
                      onChange={handleBranch}
                      disabled={!form.course || loading.branches || (options.branches.length === 0 && form.branch === ANY_BRANCH)}
                      placeholder={loading.branches ? 'Loading branches...' : 'Select a branch'}
                      options={[{ value: ANY_BRANCH, label: 'Any branch / specialization' }, ...options.branches]}
                    />
                  </FormField>
                  <FormField label="Preferred admission state" required>
                    <SelectField value={form.preferredState} onChange={handlePreferredState} disabled={!form.branch || loading.states} placeholder={loading.states ? 'Loading states...' : 'Select a preferred state'} options={options.states} />
                  </FormField>
                </div>
                {loading.universities && (
                  <div className="flex items-center gap-2 text-sm text-light-muted"><Loader2 className="w-4 h-4 animate-spin" /> Finding matching universities...</div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-7">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-link mb-2">Step 3 of 3</p>
                    <h3 className="text-2xl font-black">Select up to 5 universities</h3>
                    <p className="text-sm text-light-muted dark:text-dark-muted mt-1">
                      Matching {form.course}{form.branch !== ANY_BRANCH ? ` · ${form.branch}` : ''} options in {form.preferredState}.
                    </p>
                  </div>
                  <span className="shrink-0 px-4 py-2 rounded-full bg-primary/10 text-link font-black text-sm">
                    {form.selectedUniversityIds.length}/5 selected
                  </span>
                </div>

                {options.universities.length > 6 && (
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={universitySearch} onChange={(event) => setUniversitySearch(event.target.value)} className={`${fieldClass} pl-10`} placeholder="Search matching universities..." />
                  </div>
                )}

                {loading.universities ? (
                  <div className="py-14 flex flex-col items-center text-light-muted">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                    Loading matching universities...
                  </div>
                ) : filteredUniversities.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-12 px-6 text-center">
                    <MapPin className="w-9 h-9 text-slate-400 mx-auto mb-3" />
                    <h4 className="font-black">No matching universities found</h4>
                    <p className="text-sm text-light-muted mt-1">Try another branch or preferred state to see more options.</p>
                    <button type="button" onClick={() => goToStep(2)} className="btn-outline mt-5">Change preferences</button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4 max-h-[540px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredUniversities.map((university) => {
                      const id = String(university._id);
                      const selected = form.selectedUniversityIds.includes(id);
                      const selectionDisabled = !selected && form.selectedUniversityIds.length >= 5;
                      return (
                        <button
                          type="button"
                          key={id}
                          onClick={() => !selectionDisabled && toggleUniversity(id)}
                          disabled={selectionDisabled}
                          aria-pressed={selected}
                          className={`relative text-left rounded-2xl border-2 p-4 flex gap-4 transition-all ${selected ? 'border-primary bg-primary/5 shadow-md' : 'border-light-border dark:border-dark-border hover:border-primary/40'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="w-14 h-14 rounded-xl bg-white border border-slate-100 p-2 shrink-0 flex items-center justify-center overflow-hidden">
                            {university.logoUrl ? (
                              <img src={university.logoUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
                            ) : (
                              <GraduationCap className="w-7 h-7 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 pr-6">
                            <h4 className="font-black leading-snug">{university.name}</h4>
                            <p className="text-xs text-light-muted dark:text-dark-muted mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {university.city}, {university.state}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {university.naacGrade && <span className="badge badge-green !px-2 !py-0.5">NAAC {university.naacGrade}</span>}
                              {university.avgFees && <span className="badge badge-orange !px-2 !py-0.5">{university.avgFees}</span>}
                            </div>
                          </div>
                          <span className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                            {selected && <Check className="w-4 h-4" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedUniversities.length > 0 && (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-light-border dark:border-dark-border p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Your shortlist</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUniversities.map((university, index) => (
                        <span key={university._id} className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-dark-card border border-light-border dark:border-dark-border px-3 py-1.5 text-xs font-bold">
                          {index + 1}. {university.name}
                          <button type="button" onClick={() => toggleUniversity(String(university._id))} aria-label={`Remove ${university.name}`} className="text-slate-400 hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <FormField label="Anything else we should know?" hint="Optional—share budget, hostel or other preferences.">
                  <textarea value={form.message} onChange={update('message')} className={`${fieldClass} min-h-28 resize-y`} maxLength={1000} placeholder="Add any requirement that will help your counsellor..." />
                </FormField>

                <label className="flex items-start gap-3 rounded-2xl border border-light-border dark:border-dark-border p-4 cursor-pointer">
                  <input type="checkbox" checked={form.consent} onChange={update('consent')} className="mt-1 w-4 h-4 accent-primary" />
                  <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    I agree that Vidyarthi Mitra may contact me by phone, WhatsApp or email regarding this counselling request. I have read the <Link to="/privacy-policy" target="_blank" className="text-link font-bold hover:underline">Privacy Policy</Link>.
                  </span>
                </label>
              </div>
            )}

            <div className="mt-9 pt-6 border-t border-light-border dark:border-dark-border flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
              {step > 1 ? (
                <button type="button" onClick={() => goToStep(step - 1)} className="btn-outline justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : <span />}
              {step < 3 ? (
                <button type="button" onClick={() => goToStep(step + 1)} className="btn-primary justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={submitting || form.selectedUniversityIds.length === 0} className="btn-primary justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><CheckCircle2 className="w-4 h-4" /> Submit admission request</>}
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
