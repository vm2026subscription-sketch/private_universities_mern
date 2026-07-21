import { useEffect, useState } from 'react';
import { MapPin, BookOpen, Building, Sparkles, Plus, X, Loader2, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi NCR', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const STREAMS = [
  'Engineering',
  'Medical',
  'Management',
  'Law',
  'Arts',
  'Science',
  'Commerce',
  'Design',
  'Computer Applications'
];

export default function PreferencesModal() {
  const { user, updateUser } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  const [formData, setFormData] = useState({
    state: user?.profile?.state || '',
    stream: user?.profile?.stream || '',
    preferredStates: user?.profile?.preferredStates || [],
    collegeType: user?.profile?.collegeType || 'both',
    preferredCourse: user?.profile?.preferredCourse || ''
  });

  const [newState, setNewState] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [noticeConfig, setNoticeConfig] = useState({
    enabled: true,
    title: 'Important Notice',
    message: ''
  });

  useEffect(() => {
    let isMounted = true;
    api.get('/site-settings').then(res => {
      if (!isMounted) return;
      const data = res.data?.data || {};
      const enabled = data.preferencesNoticeEnabled !== false;
      const title = data.preferencesNoticeTitle || 'Important Notice';
      const message = data.preferencesNoticeMessage || '';
      setNoticeConfig({ enabled, title, message });
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Show only if user is logged in AND has NOT completed preferences
  if (!user || user.hasCompletedPreferences) {
    return null;
  }

  const handleAddState = (stateToAdd) => {
    const s = (stateToAdd || newState).trim();
    if (s && !formData.preferredStates.includes(s)) {
      setFormData(prev => ({
        ...prev,
        preferredStates: [...prev.preferredStates, s]
      }));
      setNewState('');
      setErrors(prev => ({ ...prev, preferredStates: null }));
    }
  };

  const handleRemoveState = (s) => {
    setFormData(prev => ({
      ...prev,
      preferredStates: prev.preferredStates.filter(st => st !== s)
    }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.state.trim()) {
      errs.state = 'Current state is required';
    }
    if (!formData.stream.trim()) {
      errs.stream = 'Preferred stream is required';
    }
    if (!formData.preferredStates || formData.preferredStates.length === 0) {
      errs.preferredStates = 'Please select at least one preferred state for education';
    }
    if (!formData.collegeType) {
      errs.collegeType = 'College type selection is required';
    }
    if (!formData.preferredCourse.trim()) {
      errs.preferredCourse = 'Preferred course is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        profile: {
          state: formData.state.trim(),
          stream: formData.stream.trim(),
          preferredStates: formData.preferredStates,
          collegeType: formData.collegeType,
          preferredCourse: formData.preferredCourse.trim()
        },
        hasCompletedPreferences: true
      };

      const res = await api.put('/users/profile', payload);

      if (res.data?.success && res.data?.data) {
        updateUser(res.data.data);
        toast.success('Preferences saved! Recommendations updated.');
        setIsOpen(false);
      } else {
        throw new Error(res.data?.message || 'Failed to save preferences');
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
      toast.error(err.response?.data?.message || err.message || 'Error saving preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      title="Personalize Your Experience"
      size="md"
    >
      <div className="space-y-4">
        {noticeConfig.enabled && noticeConfig.message ? (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-sm">
            <Bell className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              {noticeConfig.title ? (
                <p className="font-bold text-amber-700 dark:text-amber-300 text-xs mb-1 uppercase tracking-wider">{noticeConfig.title}</p>
              ) : null}
              <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed">{noticeConfig.message}</p>
            </div>
          </div>
        ) : null}

        <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3 text-sm">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-slate-700 dark:text-slate-200 text-xs">
            Help us find the best universities for you! Set your preferences once to unlock personalized recommendations across Vidyarthi Mitra.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Current State */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Current State <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.state}
              onChange={(e) => {
                setFormData({ ...formData, state: e.target.value });
                setErrors({ ...errors, state: null });
              }}
              className={`input-field text-sm w-full ${errors.state ? 'border-red-500' : ''}`}
            >
              <option value="">Select your current state</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            {errors.state && <p className="text-red-500 text-[11px] mt-1">{errors.state}</p>}
          </div>

          {/* 2. Preferred Stream */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-primary" /> Preferred Stream <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.stream}
              onChange={(e) => {
                setFormData({ ...formData, stream: e.target.value });
                setErrors({ ...errors, stream: null });
              }}
              className={`input-field text-sm w-full ${errors.stream ? 'border-red-500' : ''}`}
            >
              <option value="">Select Stream</option>
              {STREAMS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.stream && <p className="text-red-500 text-[11px] mt-1">{errors.stream}</p>}
          </div>

          {/* 3. Preferred States for Education */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Preferred States for Education <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={newState}
                onChange={(e) => setNewState(e.target.value)}
                className="input-field text-sm flex-1"
              >
                <option value="">Add a preferred state...</option>
                {INDIAN_STATES.filter(st => !formData.preferredStates.includes(st)).map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAddState()}
                disabled={!newState}
                className="btn-primary !py-2 !px-3 text-xs flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {formData.preferredStates.map((st) => (
                <span key={st} className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  {st}
                  <button
                    type="button"
                    onClick={() => handleRemoveState(st)}
                    className="hover:text-red-500 ml-0.5"
                    aria-label={`Remove ${st}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            {errors.preferredStates && <p className="text-red-500 text-[11px] mt-1">{errors.preferredStates}</p>}
          </div>

          {/* 4. College Type */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <Building className="w-3.5 h-3.5 text-primary" /> College Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4 mt-1.5">
              {[
                { id: 'private', label: 'Private' },
                { id: 'deemed', label: 'Deemed' },
                { id: 'both', label: 'Both' }
              ].map(({ id, label }) => (
                <label key={id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="modalCollegeType"
                    value={id}
                    checked={formData.collegeType === id}
                    onChange={(e) => setFormData({ ...formData, collegeType: e.target.value })}
                    className="text-primary focus:ring-primary"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {errors.collegeType && <p className="text-red-500 text-[11px] mt-1">{errors.collegeType}</p>}
          </div>

          {/* 5. Preferred Course */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-primary" /> Preferred Course <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.preferredCourse}
              onChange={(e) => {
                setFormData({ ...formData, preferredCourse: e.target.value });
                setErrors({ ...errors, preferredCourse: null });
              }}
              placeholder="e.g. B.Tech Computer Science, MBA, MBBS"
              className={`input-field text-sm w-full ${errors.preferredCourse ? 'border-red-500' : ''}`}
            />
            {errors.preferredCourse && <p className="text-red-500 text-[11px] mt-1">{errors.preferredCourse}</p>}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-dark-border flex justify-end gap-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Preferences & Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
