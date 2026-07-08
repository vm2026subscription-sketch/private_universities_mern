import { useEffect, useMemo, useState, useCallback, useDeferredValue } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Seo from '../components/common/Seo';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, BookOpen, GraduationCap, MapPin, Search, Filter, X, 
  ChevronRight, CheckCircle2, Sparkles, Building2, Pencil, Trash2,
  AlertTriangle, Save, Loader2, Award
} from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { useAuth } from '../context/AuthContext'; // adjust import path as needed
import { readSessionCache, writeSessionCache } from '../utils/pageCache';
import { EmptyState, Button, Card } from '../components/ui';

const STREAMS_CACHE_KEY = 'vm_courses_streams_v1';
const STREAMS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 mins
const COURSE_RESULTS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 mins
const getCourseResultsCacheKey = (queryStr) => `vm_courses_results_${queryStr}_v1`;

const ALL_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi NCR', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal'
];

const CATEGORY_OPTIONS = ['UG', 'PG', 'Diploma', 'PhD', 'Certificate'];
const STREAM_OPTIONS = [
  'Engineering', 'Management', 'Commerce', 'Medical & Health Sciences',
  'Law', 'Design & Architecture', 'Science', 'Arts & Humanities', 'Education', 'Others'
];

// ─── Edit Modal ──────────────────────────────────────────────────────────────

function EditCourseModal({ course, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: course.name || '',
    baseCourse: course.baseCourse || course.name || '',
    specializationName: course.specializationName || '',
    category: course.category || 'UG',
    stream: course.stream || 'Others',
    duration: course.duration || '',
    totalSeats: course.totalSeats ?? '',
    feesPerYear: course.feesPerYear ?? '',
    eligibility: course.eligibility || '',
    entranceExams: (course.entranceExams || []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.baseCourse.trim()) { setError('Base Course is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        name: form.specializationName
          ? `${form.baseCourse} in ${form.specializationName}`
          : form.baseCourse,
        totalSeats: form.totalSeats !== '' ? Number(form.totalSeats) : null,
        feesPerYear: form.feesPerYear !== '' ? Number(form.feesPerYear) : null,
        entranceExams: form.entranceExams
          ? form.entranceExams.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      const { data } = await api.put(`/admin/courses/${course._id}`, payload);
      if (data.success !== false) {
        onSaved(data.data || data);
      } else {
        setError(data.message || 'Failed to save.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-dark-card rounded-[2rem] shadow-lg overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-dark-border shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-link mb-1">Edit Course</p>
            <h2 className="text-xl font-serif font-bold text-slate-800 dark:text-white truncate max-w-sm">
              {course.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-border flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto custom-scrollbar p-8 space-y-5 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Base Course *">
              <input
                value={form.baseCourse}
                onChange={set('baseCourse')}
                className="input-field"
                placeholder="e.g. B.Tech, MBA"
              />
            </Field>
            <Field label="Specialization">
              <input
                value={form.specializationName}
                onChange={set('specializationName')}
                className="input-field"
                placeholder="e.g. Computer Science"
              />
            </Field>
            <Field label="Degree Level">
              <select value={form.category} onChange={set('category')} className="input-field">
                {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Stream">
              <select value={form.stream} onChange={set('stream')} className="input-field">
                {STREAM_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Duration">
              <input
                value={form.duration}
                onChange={set('duration')}
                className="input-field"
                placeholder="e.g. 4 Years"
              />
            </Field>
            <Field label="Total Seats">
              <input
                type="number"
                value={form.totalSeats}
                onChange={set('totalSeats')}
                className="input-field"
                placeholder="e.g. 60"
                min={0}
              />
            </Field>
            <Field label="Fees Per Year (₹)">
              <input
                type="number"
                value={form.feesPerYear}
                onChange={set('feesPerYear')}
                className="input-field"
                placeholder="e.g. 150000"
                min={0}
              />
            </Field>
            <Field label="Entrance Exams">
              <input
                value={form.entranceExams}
                onChange={set('entranceExams')}
                className="input-field"
                placeholder="JEE, CAT (comma separated)"
              />
            </Field>
          </div>
          <Field label="Eligibility">
            <textarea
              value={form.eligibility}
              onChange={set('eligibility')}
              className="input-field resize-none"
              rows={3}
              placeholder="Eligibility criteria..."
            />
          </Field>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-slate-100 dark:border-dark-border shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteConfirmDialog({ course, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/admin/courses/${course._id}`);
      onDeleted(course._id);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Delete failed.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white dark:bg-dark-card rounded-[2rem] shadow-lg p-8"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-slate-800 dark:text-white mb-1">Delete Course?</h3>
            <p className="text-sm font-bold text-slate-400">
              <span className="text-slate-600 dark:text-slate-300">"{course.name}"</span> will be permanently removed. This cannot be undone.
            </p>
          </div>

          {error && (
            <div className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 w-full pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-dark-border dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 active:scale-95 transition-all disabled:opacity-60"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Courses Page ────────────────────────────────────────────────────────

export default function Courses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Try to get isAdmin from your auth context; adjust the import/hook as needed.
  // Falls back gracefully if the hook isn't wired up yet.
  let isAdmin = false;
  try {
    const auth = useAuth();
    const role = auth?.user?.role;
    isAdmin = role === 'admin' || role === 'superadmin' || auth?.isAdmin || false;
  } catch (_) {}

  const selectedCategory = searchParams.get('category') || 'All';
  const selectedState = searchParams.get('state') || 'All';
  const rawStream = searchParams.get('stream') || 'All';
  const STREAM_TO_DB_MAP = {
    'MBA/PGDM': 'Management',
    'Medical': 'Medical & Health Sciences',
    'Design': 'Design & Architecture',
  };
  const selectedStream = STREAM_TO_DB_MAP[rawStream] || rawStream;
  const selectedCourse = searchParams.get('course') || '';
  const selectedSpec = searchParams.get('specialization') || 'All';
  const universityId = searchParams.get('universityId');
  const universityName = searchParams.get('universityName');
  const cachedStreams = readSessionCache(STREAMS_CACHE_KEY, STREAMS_CACHE_TTL_MS) || [];
  
  const [courses, setCourses] = useState([]);
  const [streams, setStreams] = useState(cachedStreams);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(24);
  const deferredSearch = useDeferredValue(search);
  const deferredStateSearch = useDeferredValue(stateSearch);

  // Edit / Delete modal state
  const [editingCourse, setEditingCourse] = useState(null);
  const [deletingCourse, setDeletingCourse] = useState(null);

  const normalizeText = (...values) =>
    values
      .flat()
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value).trim())
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const { data } = await api.get('/courses/streams');
        if (data.success) {
          setStreams(data.data);
          writeSessionCache(STREAMS_CACHE_KEY, data.data);
        }
      } catch (error) {
        console.error('Failed to fetch streams:', error);
      }
    };
    fetchStreams();
  }, []);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        let queryParams = new URLSearchParams();
        if (selectedCategory !== 'All') queryParams.append('category', selectedCategory);
        if (selectedState !== 'All') queryParams.append('state', selectedState);
        if (selectedStream !== 'All') queryParams.append('stream', selectedStream);
        if (universityId) queryParams.append('universityId', universityId);
        const queryStringBase = queryParams.toString();
        const requestKey = selectedCourse
          ? getCourseResultsCacheKey(`list_${queryStringBase}&baseCourse=${encodeURIComponent(selectedCourse)}`)
          : getCourseResultsCacheKey(`grouped_${queryStringBase}`);
        const cachedData = readSessionCache(requestKey, COURSE_RESULTS_CACHE_TTL_MS);

        if (cachedData && active) {
          setCourses(cachedData.data || []);
          setTotalCount(cachedData.total || cachedData.data?.length || 0);
          setLoading(false);
        } else {
          setLoading(true);
        }

        if (selectedCourse) {
          queryParams.append('baseCourse', selectedCourse);
          queryParams.append('limit', '100');
          const { data } = await api.get(`/courses?${queryParams.toString()}`);
          if (active) {
            const nextCourses = data.data || [];
            const nextTotal = data.pagination?.total || nextCourses.length;
            setCourses(nextCourses);
            setTotalCount(nextTotal);
            writeSessionCache(requestKey, { data: nextCourses, total: nextTotal });
          }
        } else {
          const { data } = await api.get(`/courses/grouped?${queryParams.toString()}`);
          if (active) {
            setCourses(data.data || []);
            setTotalCount(data.data?.length || 0);
          }
        }
      } catch {
        if (active) setCourses([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, [selectedCategory, universityId, selectedState, selectedCourse, selectedStream]);

  useEffect(() => {
    setVisibleCount(24);
  }, [selectedCategory, selectedState, selectedStream, search, selectedCourse, selectedSpec]);

  // ── Optimistic handlers ────────────────────────────────────────────────────

  // Clears cached course result pages so stale data isn't shown after a mutation.
  const clearCourseResultCaches = useCallback(() => {
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('vm_courses_results_')) keys.push(k);
      }
      keys.forEach((k) => sessionStorage.removeItem(k));
    } catch (_) { /* sessionStorage unavailable — ignore */ }
  }, []);

  const handleCourseSaved = useCallback((updated) => {
    if (!updated || !updated._id) { setEditingCourse(null); return; }
    setCourses((prev) =>
      prev.map((c) =>
        c._id === updated._id
          ? {
              ...c,
              ...updated,
              // Keep richer nested university fields if the update response omitted any.
              universityId: { ...(c.universityId || {}), ...(updated.universityId || {}) },
            }
          : c
      )
    );
    clearCourseResultCaches();
    setEditingCourse(null);
  }, [clearCourseResultCaches]);

  const handleCourseDeleted = useCallback((deletedId) => {
    setCourses((prev) => prev.filter((c) => c._id !== deletedId));
    setTotalCount((prev) => Math.max(0, prev - 1));
    clearCourseResultCaches();
    setDeletingCourse(null);
  }, [clearCourseResultCaches]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const courseGroups = useMemo(() => {
    if (selectedCourse) return [];
    return courses
      .filter((course) => course && course.name && course.name.trim() !== '' && (course.category || course.stream))
      .map((course, index) => ({
        ...course,
        _id: course._id || `${course.name}-${course.category || 'misc'}-${index}`,
        name: course.name.trim(),
        category: course.category || 'Others',
        stream: course.stream || 'Others',
        normName: normalizeText(course.name),
        searchIndex: normalizeText(course.name, course.category, course.stream, course.specializations),
      }));
  }, [courses, selectedCourse]);

  const filteredCourseGroups = useMemo(() => {
    let filtered = courseGroups;
    if (selectedSpec !== 'All') {
      filtered = filtered.filter(group => 
        group.specializations?.includes(selectedSpec) || 
        group.specializationName === selectedSpec
      );
    }
    const query = search.trim().toLowerCase();
    if (!query) return filtered;
    const terms = query.split(' ').filter(Boolean);
    return filtered.filter((group) => terms.every(t => group.searchIndex.includes(t)));
  }, [courseGroups, deferredSearch, selectedSpec]);

  const visibleCourseGroups = useMemo(() => filteredCourseGroups.slice(0, visibleCount), [filteredCourseGroups, visibleCount]);

  const handleStateChange = (state) => {
    const params = new URLSearchParams(searchParams);
    if (state === 'All') params.delete('state');
    else params.set('state', state);
    setSearchParams(params);
  };

  const handleCategoryChange = (cat) => {
    const params = new URLSearchParams(searchParams);
    if (cat === 'All') params.delete('category');
    else params.set('category', cat);
    setSearchParams(params);
  };

  const handleStreamChange = (stream) => {
    const params = new URLSearchParams(searchParams);
    params.delete('course');
    params.delete('category');
    params.delete('specialization');
    if (stream === 'All') params.delete('stream');
    else params.set('stream', stream);
    setSearchParams(params);
  };

  const handleSpecChange = (spec) => {
    const params = new URLSearchParams(searchParams);
    if (spec === 'All') params.delete('specialization');
    else params.set('specialization', spec);
    setSearchParams(params);
  };

  const availableSpecs = useMemo(() => {
    if (!selectedCourse && selectedCategory === 'All') return [];
    const specs = new Set();
    courses.forEach(c => {
      if (c.specializationName && c.specializationName !== 'General') {
        specs.add(c.specializationName);
      }
    });
    return Array.from(specs).sort();
  }, [courses, selectedCourse, selectedCategory]);

  const filteredColleges = useMemo(() => {
    if (!selectedCourse) return [];
    let filtered = courses;
    if (selectedSpec !== 'All') {
      filtered = filtered.filter(c => c.specializationName === selectedSpec);
    }
    const query = search.trim().toLowerCase();
    if (!query) return filtered;
    return filtered.filter((course) =>
      normalizeText(
        course.universityId?.name,
        course.universityId?.city,
        course.universityId?.state,
        course.specializationName,
        course.name
      ).includes(query)
    );
  }, [courses, selectedCourse, search, selectedSpec]);

  const visibleColleges = useMemo(() => filteredColleges.slice(0, visibleCount), [filteredColleges, visibleCount]);

  const filteredStates = useMemo(() => {
    const query = deferredStateSearch.trim().toLowerCase();
    if (!query) return ALL_STATES;
    return ALL_STATES.filter((state) => state.toLowerCase().includes(query));
  }, [deferredStateSearch]);

  // ── Card action buttons (admin only) ──────────────────────────────────────

  const AdminActions = ({ item }) => {
    if (!isAdmin || !selectedCourse) return null;
    return (
      <div
        className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setEditingCourse(item)}
          title="Edit course"
          className="w-9 h-9 rounded-full bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border shadow-md flex items-center justify-center text-slate-500 hover:text-link hover:border-primary transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDeletingCourse(item)}
          title="Delete course"
          className="w-9 h-9 rounded-full bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border shadow-md flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <Seo
        title="Courses & Programs in India | B.Tech, MBA, Law, Medical & More | Vidyarthi Mitra"
        description="Browse UG, PG, diploma and doctoral programs across Indian private and deemed universities. Compare fees, seats, eligibility and entrance exams."
        path="/courses"
      />
      {/* Hero */}
      <div className="relative mb-6 shrink-0 rounded-[2rem] overflow-hidden bg-slate-900 text-white shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />

        <div className="relative px-8 py-12 md:px-16 md:py-16 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="max-w-xl space-y-6 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl text-white/80 text-[10px] font-bold uppercase tracking-[0.3em] border border-white/10"
            >
              Course Directory
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-serif font-bold leading-tight tracking-tight"
            >
              Explore Courses &amp; Programs
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base md:text-lg text-white/50 font-medium leading-relaxed"
            >
              Discover {totalCount.toLocaleString()}+ verified academic programs from India's most prestigious universities.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full lg:w-[500px]"
          >
            <div className="relative group">
              <div className="relative flex items-center bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] overflow-hidden shadow-lg">
                <Search className="w-6 h-6 ml-8 text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by degree, stream or keyword..."
                  className="w-full pl-5 pr-14 py-7 bg-transparent border-none outline-none text-xl text-white font-bold placeholder:text-white/20"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="mr-4 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {(universityName || selectedStream !== 'All' || selectedCourse) && (
              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete('universityId');
                  params.delete('universityName');
                  params.delete('stream');
                  params.delete('course');
                  setSearchParams(params);
                }} 
                className="mt-4 mx-auto lg:ml-auto flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-link transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Reset active filters
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 items-start flex-1">
        {/* Sidebar */}
        <aside className={`${showFilters ? 'fixed inset-0 z-[150] bg-white dark:bg-dark-bg p-6 overflow-y-auto' : 'hidden'} lg:block lg:w-80 shrink-0 lg:sticky lg:top-24 lg:h-[calc(100vh-120px)] lg:overflow-y-auto custom-scrollbar`}>
          <div className="space-y-6 pb-10 lg:pb-4">
            {showFilters && (
              <div className="flex items-center justify-between mb-8 lg:hidden">
                <h3 className="text-xl font-bold">Filters</h3>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-border flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Stream Filter */}
            <div className="bg-slate-50/50 dark:bg-dark-card/50 backdrop-blur-xl p-7 rounded-[2rem] border border-slate-200/60 dark:border-dark-border shadow-sm">
              <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-link" /> Academic Stream
              </h4>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <button 
                  onClick={() => { handleStreamChange('All'); if(showFilters) setShowFilters(false); }}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[13px] font-bold transition-all ${selectedStream === 'All' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white dark:bg-dark-bg hover:bg-slate-100 text-slate-500 dark:text-dark-muted dark:hover:bg-dark-border border border-slate-100 dark:border-transparent'}`}
                >
                  All Streams <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
                {streams.map((s) => (
                  <button 
                    key={s.stream}
                    onClick={() => { handleStreamChange(s.stream); if(showFilters) setShowFilters(false); }}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[13px] font-bold transition-all ${selectedStream === s.stream ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white dark:bg-dark-bg hover:bg-slate-100 text-slate-500 dark:text-dark-muted dark:hover:bg-dark-border border border-slate-100 dark:border-transparent'}`}
                  >
                    <span className="truncate">{s.stream}</span>
                    <span className={`text-[10px] ${selectedStream === s.stream ? 'text-white/70' : 'text-slate-400'}`}>{s.collegeCount}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* State Filter */}
            <div className="bg-slate-50/50 dark:bg-dark-card/50 backdrop-blur-xl p-7 rounded-[2rem] border border-slate-200/60 dark:border-dark-border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-link" /> State / Region
                </h4>
                <div className="px-3 py-1 rounded-full bg-white dark:bg-dark-border text-[9px] font-bold text-slate-400 shadow-sm">
                  {selectedState === 'All' ? '37 Regions' : '1 Active'}
                </div>
              </div>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search state..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-dark-bg rounded-xl text-[11px] font-bold border border-slate-100 dark:border-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <button 
                  onClick={() => { handleStateChange('All'); if(showFilters) setShowFilters(false); }}
                  className={`state-item w-full text-left px-5 py-3 rounded-xl text-[12px] font-bold transition-all ${selectedState === 'All' ? 'bg-primary/10 text-link' : 'hover:bg-slate-100 text-slate-400 dark:hover:bg-dark-border'}`}
                >
                  All Regions
                </button>
                {filteredStates.map((state) => (
                  <button 
                    key={state}
                    onClick={() => { handleStateChange(state); if(showFilters) setShowFilters(false); }}
                    className={`state-item w-full text-left px-5 py-3 rounded-xl text-[12px] font-bold transition-all ${selectedState === state ? 'bg-primary/10 text-link' : 'hover:bg-slate-100 text-slate-400 dark:hover:bg-dark-border'}`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="bg-slate-50/50 dark:bg-dark-card/50 backdrop-blur-xl p-7 rounded-[2rem] border border-slate-200/60 dark:border-dark-border shadow-sm">
              <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2.5">
                <GraduationCap className="w-4 h-4 text-link" /> Degree Level
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {['All', 'UG', 'PG', 'Diploma', 'PhD'].map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => { handleCategoryChange(cat); if(showFilters) setShowFilters(false); }}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-[13px] font-bold transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 dark:bg-primary' : 'bg-white dark:bg-dark-bg hover:bg-slate-100 text-slate-500 dark:text-dark-muted dark:hover:bg-dark-border border border-slate-100 dark:border-transparent'}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${selectedCategory === cat ? 'bg-primary dark:bg-white' : 'bg-slate-200 dark:bg-dark-border'}`} />
                    {cat === 'UG' ? 'Undergraduate' : cat === 'PG' ? 'Postgraduate' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 w-full pb-20">
          {(selectedCourse || selectedCategory !== 'All') ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-10 p-10 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden group shadow-lg"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-700">
                {selectedCourse ? <BookOpen className="w-48 h-48" /> : <GraduationCap className="w-48 h-48" />}
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-link">
                    {selectedCourse ? 'Degree Profile' : `${selectedCategory} Directory`}
                  </span>
                  <h2 className="text-4xl md:text-5xl font-serif font-bold">
                    {selectedCourse || (selectedCategory === 'UG' ? 'Undergraduate' : selectedCategory === 'PG' ? 'Postgraduate' : selectedCategory)}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-white/50 text-xs font-bold pt-2">
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      <Building2 className="w-3.5 h-3.5" /> {selectedCourse ? courses.length : filteredCourseGroups.length} {selectedCourse ? 'Institutions' : 'Programs'}
                    </span>
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {availableSpecs.length} Specializations
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('course');
                    params.delete('category');
                    params.delete('specialization');
                    setSearchParams(params);
                  }} 
                  className="px-8 py-4 bg-white text-slate-900 rounded-[1.25rem] font-bold text-xs transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-xl"
                >
                  <ArrowLeft className="w-4 h-4" /> RESET FILTERS
                </button>
              </div>

              {availableSpecs.length > 0 && (
                <div className="relative z-10 mt-12 pt-8 border-t border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-link">Browse by Specialization</h4>
                    {selectedSpec !== 'All' && (
                      <button onClick={() => handleSpecChange('All')} className="text-[10px] font-bold text-white/30 hover:text-white underline">Clear Selection</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                    <button 
                      onClick={() => handleSpecChange('All')}
                      className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${selectedSpec === 'All' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                    >
                      All Specs
                    </button>
                    {availableSpecs.map(spec => (
                      <button 
                        key={spec}
                        onClick={() => handleSpecChange(spec)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${selectedSpec === spec ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                <h2 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">
                  {selectedStream !== 'All' ? selectedStream : 'Academic Programs'}
                </h2>
                <div className="h-px w-24 bg-slate-200 dark:bg-dark-border hidden md:block" />
                <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-[11px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {totalCount} RESULTS
                </div>
                {search ? (
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Searching for "{deferredSearch || search}"
                  </div>
                ) : null}
              </div>
              <button 
                onClick={() => setShowFilters(true)}
                className="lg:hidden flex items-center gap-3 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-xs shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                <Filter className="w-4 h-4" /> FILTERS
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="space-y-16">
              {filteredCourseGroups.length === 0 && !selectedCourse && (
                <Card className="border-2 border-dashed">
                  <EmptyState
                    icon={Search}
                    title="No Courses Found"
                    description="We couldn't find any courses matching your current filters."
                    action={(
                      <Button onClick={() => { handleStreamChange('All'); handleCategoryChange('All'); setSearch(''); }}>
                        Reset Filters
                      </Button>
                    )}
                  />
                </Card>
              )}

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {(selectedCourse ? visibleColleges : visibleCourseGroups).map((item, idx) => (
                    <motion.div
                      layout
                      key={item._id || item.normName || `${item.name || 'item'}-${idx}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3) }}
                      className="group relative bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300 overflow-hidden"
                    >
                      {/* Admin edit/delete buttons — only shown in college (selectedCourse) view */}
                      {isAdmin && selectedCourse && (
                        <div
                          className="absolute top-5 right-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setEditingCourse(item)}
                            title="Edit course"
                            className="w-9 h-9 rounded-full bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border shadow-md flex items-center justify-center text-slate-500 hover:text-link hover:border-primary transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingCourse(item)}
                            title="Delete course"
                            className="w-9 h-9 rounded-full bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border shadow-md flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {selectedCourse ? (
                        <div className="p-8 space-y-8">
                        <div className="flex justify-between items-start">
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-3 py-1 rounded-lg bg-slate-500/5 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-slate-500/10">
                                {item.category || 'Professional'}
                              </span>
                              {item.stream && (
                                <span className="px-3 py-1 rounded-lg bg-primary/5 text-link text-[10px] font-bold uppercase tracking-widest border border-primary/10">
                                  {item.stream}
                                </span>
                              )}
                              {selectedCourse && item.specializationName && item.specializationName !== 'General' && (
                                <span className="px-3 py-1 rounded-lg bg-emerald-500/5 text-emerald-600 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/10">
                                  {item.specializationName}
                                </span>
                              )}
                            </div>
                            <h3
                              className="text-2xl md:text-3xl font-serif font-bold leading-tight group-hover:text-link transition-colors cursor-pointer"
                              onClick={() => {
                                if (!selectedCourse) {
                                  const params = new URLSearchParams(searchParams);
                                  params.set('course', item.name || '');
                                  setSearchParams(params);
                                } else {
                                  const routeParam = item.universityId?.slug || item.universityId?._id;
                                  if (routeParam) navigate(`/universities/${routeParam}`, { state: { activeTab: 1 } });
                                }
                              }}
                            >
                              {selectedCourse ? item.universityId?.name : item.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                              <MapPin className="w-4 h-4 text-link" /> 
                              {selectedCourse
                                ? `${item.universityId?.city}, ${item.universityId?.state}`
                                : `${item.collegeCount} Participating Institutions`}
                            </div>
                          </div>
                          <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-dark-border/20 flex items-center justify-center p-3 shrink-0 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 shadow-inner">
                            {selectedCourse ? (
                              item.universityId?.logoUrl
                                ? <img src={item.universityId.logoUrl} alt="" className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                : <div className="text-2xl font-bold text-link">{item.universityId?.name?.[0]}</div>
                            ) : (
                              <div className="text-link"><GraduationCap className="w-10 h-10" /></div>
                            )}
                          </div>
                        </div>

                          {/* Main Detailed Content */}
                          <div className="flex-1 p-6 flex flex-col justify-between gap-4">
                            <div>
                              {/* Pill Badges */}
                              <div className="flex flex-wrap gap-1.5 mb-2.5">
                                {item.category && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">{item.category}</span>
                                )}
                                {item.specializationName && item.specializationName !== 'General' && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-link text-[10px] font-bold uppercase tracking-wider">{item.specializationName}</span>
                                )}
                                {item.universityId?.naacGrade && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-800">NAAC Grade {item.universityId.naacGrade}</span>
                                )}
                              </div>

                              <h3
                                onClick={() => { const r = item.universityId?.slug || item.universityId?._id; if (r) navigate(`/universities/${r}`, { state: { activeTab: 1 } }); }}
                                className="text-lg md:text-xl font-bold text-slate-900 dark:text-white group-hover:text-link transition-colors cursor-pointer leading-snug line-clamp-2"
                              >
                                {item.universityId?.name}
                              </h3>

                              <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mt-2">
                                <MapPin className="w-4 h-4 text-link shrink-0" />
                                {item.universityId?.city}{item.universityId?.state ? `, ${item.universityId.state}` : ''}
                              </p>
                            </div>

                            {/* Footer info: Exams + CTA */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-400 font-bold mr-1">Exams:</span>
                                {(item.entranceExams || []).length > 0 ? (
                                  item.entranceExams.slice(0, 3).map(exam => (
                                    <span key={exam} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-900">{exam}</span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-semibold bg-slate-50 dark:bg-dark-border px-2 py-0.5 rounded-md">Direct Admission</span>
                                )}
                              </div>

                              <button
                                onClick={() => { const r = item.universityId?.slug || item.universityId?._id; if (r) navigate(`/universities/${r}`, { state: { activeTab: 1 } }); }}
                                className="shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-[11px] uppercase tracking-wider hover:bg-primary-dark active:scale-95 transition-all shadow-sm"
                              >
                                View Details <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                          role="button"
                          tabIndex={0}
                          aria-label={`View ${item.name} programs`}
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 cursor-pointer hover:bg-slate-50/40 dark:hover:bg-dark-border/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
                          onClick={() => { const params = new URLSearchParams(searchParams); params.set('course', item.name || ''); setSearchParams(params); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const params = new URLSearchParams(searchParams); params.set('course', item.name || ''); setSearchParams(params); } }}
                        >
                          {/* Left Icon Panel */}
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950/30 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-900 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                            <GraduationCap className="w-7 h-7 text-link group-hover:text-white transition-colors" />
                          </div>

                          {/* Center info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 text-[9px] font-bold uppercase tracking-wider">{item.category || 'UG/PG'}</span>
                              {item.stream && <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-link text-[9px] font-bold uppercase tracking-wider">{item.stream}</span>}
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-link transition-colors truncate">{item.name}</h3>
                            <div className="flex flex-wrap gap-4 mt-2">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-slate-400" /> {item.collegeCount || 0} Colleges in India
                              </span>
                              {item.specializations?.length > 0 && (
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                  <Award className="w-4 h-4 text-amber-500" /> {item.specializations.length} Specializations
                                </span>
                              )}
                            </div>

                            {/* Tags preview */}
                            {item.specializations?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {item.specializations.slice(0, 5).map(spec => (
                                  <span key={spec} className="px-2.5 py-0.5 rounded-lg bg-slate-50 dark:bg-dark-border/50 text-slate-500 dark:text-dark-muted text-[10px] font-bold border border-slate-100 dark:border-dark-border">{spec}</span>
                                ))}
                                {item.specializations.length > 5 && (
                                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-50 dark:bg-dark-border/50 text-link text-[10px] font-bold">+{item.specializations.length - 5} more</span>
                                )}
                              </div>
                            )}
                          </div>
                          </div>

                        <div className="flex items-center justify-end pt-2">
                          <button
                            onClick={() => {
                              if (selectedCourse) {
                                const routeParam = item.universityId?.slug || item.universityId?._id;
                                if (routeParam) navigate(`/universities/${routeParam}`, { state: { activeTab: 1 } });
                              } else {
                                const params = new URLSearchParams(searchParams);
                                params.set('course', item.name || '');
                                setSearchParams(params);
                              }
                            }}
                            className="flex items-center gap-3 pl-6 pr-2 py-2 bg-slate-900 dark:bg-primary text-white rounded-full font-bold text-[11px] uppercase tracking-widest group-hover:pr-3 transition-all shadow-xl shadow-slate-900/20"
                          >
                            Explore {selectedCourse ? 'University' : 'Programs'}
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {((!selectedCourse && visibleCourseGroups.length < filteredCourseGroups.length) ||
                (selectedCourse && visibleColleges.length < filteredColleges.length)) && (
                <div className="py-20 text-center">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVisibleCount((prev) => prev + 24)}
                    className="px-16 py-5 bg-white dark:bg-dark-card border-2 border-primary text-link rounded-[2rem] font-bold text-sm tracking-widest shadow-lg shadow-primary/10 hover:bg-primary hover:text-white transition-all duration-300"
                  >
                    {selectedCourse ? 'LOAD MORE UNIVERSITIES' : 'LOAD MORE PROGRAMS'}
                  </motion.button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editingCourse && (
          <EditCourseModal
            key="edit"
            course={editingCourse}
            onClose={() => setEditingCourse(null)}
            onSaved={handleCourseSaved}
          />
        )}
        {deletingCourse && (
          <DeleteConfirmDialog
            key="delete"
            course={deletingCourse}
            onClose={() => setDeletingCourse(null)}
            onDeleted={handleCourseDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}