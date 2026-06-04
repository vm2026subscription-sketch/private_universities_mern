import { useEffect, useMemo, useState } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  RefreshCw,
  Building2,
  MapPin,
  Layers3,
  ShieldCheck,
  BookOpen,
  X,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, SelectInput, CheckboxField, FormActions } from './components/FormFields';

const STATE_OPTIONS = [
  { value: '', label: 'Select State' },
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
  { value: 'Arunachal Pradesh', label: 'Arunachal Pradesh' },
  { value: 'Assam', label: 'Assam' },
  { value: 'Bihar', label: 'Bihar' },
  { value: 'Chhattisgarh', label: 'Chhattisgarh' },
  { value: 'Goa', label: 'Goa' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Haryana', label: 'Haryana' },
  { value: 'Himachal Pradesh', label: 'Himachal Pradesh' },
  { value: 'Jharkhand', label: 'Jharkhand' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Manipur', label: 'Manipur' },
  { value: 'Meghalaya', label: 'Meghalaya' },
  { value: 'Mizoram', label: 'Mizoram' },
  { value: 'Nagaland', label: 'Nagaland' },
  { value: 'Odisha', label: 'Odisha' },
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Sikkim', label: 'Sikkim' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Telangana', label: 'Telangana' },
  { value: 'Tripura', label: 'Tripura' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
  { value: 'Uttarakhand', label: 'Uttarakhand' },
  { value: 'West Bengal', label: 'West Bengal' },
  { value: 'Andaman and Nicobar Islands', label: 'Andaman and Nicobar Islands' },
  { value: 'Chandigarh', label: 'Chandigarh' },
  { value: 'Dadra and Nagar Haveli and Daman and Diu', label: 'Dadra and Nagar Haveli and Daman and Diu' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Jammu and Kashmir', label: 'Jammu and Kashmir' },
  { value: 'Ladakh', label: 'Ladakh' },
  { value: 'Lakshadweep', label: 'Lakshadweep' },
  { value: 'Puducherry', label: 'Puducherry' }
];

const SEGMENT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'foreign', label: 'Foreign' },
  { value: 'twinning', label: 'Twinning' },
];

const INSTITUTION_KIND_OPTIONS = [
  { value: 'private', label: 'Private University' },
  { value: 'deemed', label: 'Deemed University' },
];

const COURSE_LEVEL_OPTIONS = [
  { value: 'UG', label: 'Undergraduate' },
  { value: 'PG', label: 'Postgraduate' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'PhD', label: 'Doctoral / PhD' },
];

const STREAM_OPTIONS = [
  'Engineering',
  'Medical',
  'Management',
  'Law',
  'Design',
  'Science',
  'Commerce',
  'Arts',
  'Education',
  'Agriculture',
  'Hospitality',
  'IT',
  'Other',
];

const emptyCourse = () => ({
  _id: '',
  stream: 'Engineering',
  category: 'UG',
  baseCourse: '',
  specializationName: '',
  duration: '',
  totalSeats: '',
  feesPerYear: '',
  eligibility: '',
  entranceExamsText: '',
});

const emptyForm = () => ({
  universityCode: '',
  name: '',
  segment: 'normal',
  institutionKind: 'private',
  state: '',
  city: '',
  establishedYear: '',
  naacGrade: '',
  nirfRank: '',
  description: '',
  logoUrl: '',
  bannerImageUrl: '',
  website: '',
  address: '',
  phone: '',
  email: '',
  approvals: { ugc: false, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  stats: { totalStudents: '', campusSizeAcres: '', avgPackageLPA: '', highestPackageLPA: '', placementPercentage: '' },
  highlightsText: '',
  topRecruitersText: '',
  facilitiesText: '',
  links: {
    admissionLink: '',
    brochureLink: '',
    placementReportLink: '',
    scholarshipLink: '',
    hostelLink: '',
    mapLink: '',
  },
  courses: [emptyCourse()],
});

const splitLines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
const num = (value) => (value === '' ? undefined : Number(value));

const getSegment = (university) => {
  if (university.segment) return university.segment;
  if (university.type === 'foreign' || university.type === 'twinning') return university.type;
  return 'normal';
};

const getInstitutionKind = (university) => {
  if (university.institutionKind) return university.institutionKind;
  return university.type === 'deemed' ? 'deemed' : 'private';
};

const getDisplayType = (university) => {
  const segment = getSegment(university);
  if (segment === 'twinning') return 'Twinning';
  if (segment === 'foreign') return 'Foreign';
  return getInstitutionKind(university) === 'deemed' ? 'Deemed' : 'Private';
};

const statCards = (items) => [
  {
    label: 'Total Universities',
    value: items.length,
    icon: Building2,
  },
  {
    label: 'Normal / Foreign / Twinning',
    value: `${items.filter((item) => getSegment(item) === 'normal').length} / ${items.filter((item) => getSegment(item) === 'foreign').length} / ${items.filter((item) => getSegment(item) === 'twinning').length}`,
    icon: Layers3,
  },
  {
    label: 'States Covered',
    value: new Set(items.map((item) => item.state).filter(Boolean)).size,
    icon: MapPin,
  },
  {
    label: 'Approved Records',
    value: items.filter((item) => Object.values(item.approvals || {}).some(Boolean)).length,
    icon: ShieldCheck,
  },
];

export default function UniversitiesManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeFormTab, setActiveFormTab] = useState('general');

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/content');
      setItems(response.data.data?.universities || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load universities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return items;
    if (filterType === 'normal') return items.filter((item) => getSegment(item) === 'normal');
    if (filterType === 'foreign') return items.filter((item) => getSegment(item) === 'foreign');
    if (filterType === 'twinning') return items.filter((item) => getSegment(item) === 'twinning');
    return items.filter((item) => getSegment(item) === 'normal' && getInstitutionKind(item) === filterType);
  }, [items, filterType]);

  const selectedCount = selectedIds.length;
  const allSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item._id));

  const upd = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const updNested = (section, field, value) => setForm((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  const updCourse = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      courses: prev.courses.map((course, courseIndex) =>
        courseIndex === index ? { ...course, [field]: value } : course
      ),
    }));
  };

  const addCourse = () => {
    setForm((prev) => ({ ...prev, courses: [...prev.courses, emptyCourse()] }));
  };

  const removeCourse = (index) => {
    setForm((prev) => {
      const nextCourses = prev.courses.filter((_, courseIndex) => courseIndex !== index);
      return { ...prev, courses: nextCourses.length ? nextCourses : [emptyCourse()] };
    });
  };

  const resetEditor = () => {
    setForm(emptyForm());
    setEditId(null);
    setShowForm(false);
    setActiveFormTab('general');
  };

  const cloneCourse = (index) => {
    setForm((prev) => {
      const courseToCopy = prev.courses[index];
      const cloned = {
        ...courseToCopy,
        _id: '',
      };
      const updatedCourses = [...prev.courses];
      updatedCourses.splice(index + 1, 0, cloned);
      return {
        ...prev,
        courses: updatedCourses,
      };
    });
    toast.success(`Course #${index + 1} cloned successfully`);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        universityCode: form.universityCode || undefined,
        name: form.name,
        segment: form.segment,
        institutionKind: form.segment === 'normal' ? form.institutionKind : undefined,
        state: form.state,
        city: form.city,
        establishedYear: num(form.establishedYear),
        naacGrade: form.naacGrade || undefined,
        nirfRank: num(form.nirfRank),
        description: form.description,
        logoUrl: form.logoUrl || undefined,
        bannerImageUrl: form.bannerImageUrl || undefined,
        website: form.website || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        approvals: { ...form.approvals },
        stats: {
          totalStudents: num(form.stats.totalStudents),
          campusSizeAcres: num(form.stats.campusSizeAcres),
          avgPackageLPA: num(form.stats.avgPackageLPA),
          highestPackageLPA: num(form.stats.highestPackageLPA),
          placementPercentage: num(form.stats.placementPercentage),
        },
        highlights: splitLines(form.highlightsText),
        topRecruiters: splitLines(form.topRecruitersText),
        facilities: splitLines(form.facilitiesText),
        links: { ...form.links },
        courses: form.courses
          .map((course) => ({
            _id: course._id || undefined,
            stream: course.stream,
            category: course.category,
            baseCourse: course.baseCourse,
            specializationName: course.specializationName || undefined,
            duration: num(course.duration),
            totalSeats: num(course.totalSeats),
            feesPerYear: num(course.feesPerYear),
            eligibility: course.eligibility || undefined,
            entranceExams: splitLines(course.entranceExamsText),
          }))
          .filter((course) => course.baseCourse),
      };

      if (!payload.courses.length) {
        toast.error('Add at least one course before saving the university');
        setSaving(false);
        return;
      }

      if (editId) {
        await api.put(`/admin/universities/${editId}`, payload);
        toast.success('University updated');
      } else {
        await api.post('/admin/universities', payload);
        toast.success('University created');
      }

      resetEditor();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save university');
    } finally {
      setSaving(false);
    }
  };

  const edit = (university) => {
    setForm({
      universityCode: university.universityCode || '',
      name: university.name || '',
      segment: university.segment || (university.type === 'foreign' || university.type === 'twinning' ? university.type : 'normal'),
      institutionKind: university.institutionKind || (university.type === 'deemed' ? 'deemed' : 'private'),
      state: university.state || '',
      city: university.city || '',
      establishedYear: university.establishedYear || '',
      naacGrade: university.naacGrade || '',
      nirfRank: university.nirfRank || '',
      description: university.description || '',
      logoUrl: university.logoUrl || '',
      bannerImageUrl: university.bannerImageUrl || '',
      website: university.website || '',
      address: university.address || '',
      phone: university.phone || '',
      email: university.email || '',
      approvals: {
        ugc: !!university.approvals?.ugc,
        aicte: !!university.approvals?.aicte,
        nmc: !!university.approvals?.nmc,
        bci: !!university.approvals?.bci,
        coa: !!university.approvals?.coa,
        pci: !!university.approvals?.pci,
      },
      stats: {
        totalStudents: university.stats?.totalStudents || '',
        campusSizeAcres: university.stats?.campusSizeAcres || '',
        avgPackageLPA: university.stats?.avgPackageLPA || '',
        highestPackageLPA: university.stats?.highestPackageLPA || '',
        placementPercentage: university.stats?.placementPercentage || '',
      },
      highlightsText: (university.highlights || []).join('\n'),
      topRecruitersText: (university.topRecruiters || []).join('\n'),
      facilitiesText: (university.facilities || []).join('\n'),
      links: {
        admissionLink: university.links?.admissionLink || '',
        brochureLink: university.links?.brochureLink || '',
        placementReportLink: university.links?.placementReportLink || '',
        scholarshipLink: university.links?.scholarshipLink || '',
        hostelLink: university.links?.hostelLink || '',
        mapLink: university.links?.mapLink || '',
      },
      courses: university.courses?.length ? university.courses.map((course) => ({
        _id: course._id || '',
        stream: course.stream || 'Engineering',
        category: course.category || 'UG',
        baseCourse: course.baseCourse || course.name || '',
        specializationName: course.specializationName || '',
        duration: course.duration || '',
        totalSeats: course.totalSeats || '',
        feesPerYear: course.feesPerYear || '',
        eligibility: course.eligibility || '',
        entranceExamsText: (course.entranceExams || []).join('\n'),
      })) : [emptyCourse()],
    });
    setEditId(university._id);
    setShowForm(true);
    setActiveFormTab('general');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id) => {
    if (!confirm('Delete this university and all its courses?')) return;
    try {
      await api.delete(`/admin/universities/${id}`);
      toast.success('University deleted');
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete university');
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredItems.some((item) => item._id === id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredItems.map((item) => item._id)])));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} selected universities and their linked courses?`)) return;

    try {
      await Promise.all(selectedIds.map((id) => api.delete(`/admin/universities/${id}`)));
      toast.success(`${selectedIds.length} universities deleted`);
      setSelectedIds([]);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk delete failed');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'University',
      render: (university) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="h-11 w-11 rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-bg flex items-center justify-center overflow-hidden shrink-0">
            {university.logoUrl ? (
              <img src={university.logoUrl} alt={university.name} className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className="text-sm font-black text-primary">{university.name?.slice(0, 2)?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-light-text dark:text-dark-text">{university.name}</p>
            <p className="text-xs text-light-muted">{university.universityCode || 'No code set'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (university) => (
        <div>
          <p>{university.city}, {university.state}</p>
          <p className="text-xs text-light-muted">{university.address || 'Address not added'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (university) => <span className="badge badge-orange capitalize">{getDisplayType(university)}</span>,
    },
    {
      key: 'naacGrade',
      label: 'Quality',
      render: (university) => (
        <div className="space-y-1">
          <p className="font-medium">{university.naacGrade || 'NA'}</p>
          <p className="text-xs text-light-muted">NIRF: {university.nirfRank || 'NA'}</p>
        </div>
      ),
    },
    {
      key: 'courses',
      label: 'Courses',
      render: (university) => university.courses?.length || 0,
    },
  ];

  if (loading) {
    return <div className="text-center py-12 text-light-muted">Loading universities...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-2xl font-black text-light-text dark:text-dark-text">University Management</h2>
          <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">
            Manual-first catalogue management with inline course creation for normal, foreign, and twinning universities.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="btn-outline text-sm flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              setShowForm((prev) => !prev);
              setEditId(null);
              setForm(emptyForm());
            }}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add University
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards(items).map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5 bg-gradient-to-br from-white to-orange-50/70 dark:from-dark-card dark:to-dark-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-light-muted dark:text-dark-muted">
                    {card.label}
                  </p>
                  <p className="mt-3 text-3xl font-black text-light-text dark:text-dark-text">{card.value}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <form onSubmit={save} className="card p-6 md:p-8 space-y-8 shadow-2xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-black text-light-text dark:text-dark-text">{editId ? 'Edit University' : 'Create University'}</h3>
              <p className="text-sm text-light-muted dark:text-dark-muted">
                Add the university and its courses together so the team never has to manage separate course uploads.
              </p>
            </div>
            <div className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
              {editId ? 'Editing Existing Record' : 'New Catalogue Entry'}
            </div>
          </div>

          {/* Form Tabs Navigation */}
          <div className="flex flex-wrap border-b border-light-border dark:border-dark-border gap-2 pb-2">
            {[
              { id: 'general', label: '1. Basic Info' },
              { id: 'media', label: '2. Details & Media' },
              { id: 'stats', label: '3. Approvals & Stats' },
              { id: 'highlights', label: '4. Highlights & Links' },
              { id: 'courses', label: '5. Course Catalog (' + form.courses.length + ')' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFormTab(tab.id)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-[0.18em] border-b-2 transition-all ${
                  activeFormTab === tab.id
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: General Info */}
          <div className={activeFormTab === 'general' ? 'space-y-6' : 'hidden'}>
            <div className="grid gap-6 md:grid-cols-4">
              <FormField label="University Code">
                <TextInput value={form.universityCode} onChange={(event) => upd('universityCode', event.target.value)} placeholder="e.g. AMITY_NDA" />
              </FormField>
              <FormField label="University Name *" className="md:col-span-2">
                <TextInput value={form.name} onChange={(event) => upd('name', event.target.value)} required />
              </FormField>
              <FormField label="University Segment">
                <SelectInput
                  value={form.segment}
                  onChange={(event) => upd('segment', event.target.value)}
                  options={SEGMENT_OPTIONS}
                />
              </FormField>
              {form.segment === 'normal' && (
                <FormField label="Normal University Type">
                  <SelectInput
                    value={form.institutionKind}
                    onChange={(event) => upd('institutionKind', event.target.value)}
                    options={INSTITUTION_KIND_OPTIONS}
                  />
                </FormField>
              )}
              <FormField label="State *">
                <SelectInput
                  value={form.state}
                  onChange={(event) => upd('state', event.target.value)}
                  options={STATE_OPTIONS}
                  required
                />
              </FormField>
              <FormField label="City *">
                <TextInput value={form.city} onChange={(event) => upd('city', event.target.value)} required />
              </FormField>
              <FormField label="Email">
                <TextInput value={form.email} onChange={(event) => upd('email', event.target.value)} />
              </FormField>
              <FormField label="Phone">
                <TextInput value={form.phone} onChange={(event) => upd('phone', event.target.value)} />
              </FormField>
            </div>

            <FormField label="Address">
              <TextInput value={form.address} onChange={(event) => upd('address', event.target.value)} />
            </FormField>
          </div>

          {/* Tab 2: Details & Media */}
          <div className={activeFormTab === 'media' ? 'space-y-6' : 'hidden'}>
            <div className="grid gap-6 md:grid-cols-3">
              <FormField label="Established Year">
                <TextInput type="number" value={form.establishedYear} onChange={(event) => upd('establishedYear', event.target.value)} />
              </FormField>
              <FormField label="NAAC Grade">
                <TextInput value={form.naacGrade} onChange={(event) => upd('naacGrade', event.target.value)} placeholder="A++, A+, A, B++" />
              </FormField>
              <FormField label="NIRF Rank">
                <TextInput type="number" value={form.nirfRank} onChange={(event) => upd('nirfRank', event.target.value)} />
              </FormField>
              <FormField label="Website">
                <TextInput value={form.website} onChange={(event) => upd('website', event.target.value)} placeholder="https://example.edu" />
              </FormField>
              <FormField label="Logo URL">
                <TextInput value={form.logoUrl} onChange={(event) => upd('logoUrl', event.target.value)} />
              </FormField>
              <FormField label="Banner Image URL">
                <TextInput value={form.bannerImageUrl} onChange={(event) => upd('bannerImageUrl', event.target.value)} />
              </FormField>
            </div>

            <FormField label="Description">
              <TextArea value={form.description} onChange={(event) => upd('description', event.target.value)} className="min-h-[140px]" />
            </FormField>
          </div>

          {/* Tab 3: Stats & Approvals */}
          <div className={activeFormTab === 'stats' ? 'space-y-6' : 'hidden'}>
            <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
              <div className="rounded-[1.75rem] border border-light-border dark:border-dark-border p-5 space-y-4">
                <p className="text-sm font-black text-light-text dark:text-dark-text">Approvals</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Object.keys(form.approvals).map((key) => (
                    <CheckboxField
                      key={key}
                      label={key.toUpperCase()}
                      checked={form.approvals[key]}
                      onChange={(event) => updNested('approvals', key, event.target.checked)}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-light-border dark:border-dark-border p-5 space-y-4">
                <p className="text-sm font-black text-light-text dark:text-dark-text">Stats</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Total Students">
                    <TextInput type="number" value={form.stats.totalStudents} onChange={(event) => updNested('stats', 'totalStudents', event.target.value)} />
                  </FormField>
                  <FormField label="Campus Acres">
                    <TextInput type="number" value={form.stats.campusSizeAcres} onChange={(event) => updNested('stats', 'campusSizeAcres', event.target.value)} />
                  </FormField>
                  <FormField label="Avg Package LPA">
                    <TextInput type="number" step="0.1" value={form.stats.avgPackageLPA} onChange={(event) => updNested('stats', 'avgPackageLPA', event.target.value)} />
                  </FormField>
                  <FormField label="Highest Package LPA">
                    <TextInput type="number" step="0.1" value={form.stats.highestPackageLPA} onChange={(event) => updNested('stats', 'highestPackageLPA', event.target.value)} />
                  </FormField>
                  <FormField label="Placement %">
                    <TextInput type="number" value={form.stats.placementPercentage} onChange={(event) => updNested('stats', 'placementPercentage', event.target.value)} />
                  </FormField>
                </div>
              </div>
            </div>
          </div>

          {/* Tab 4: Highlights & Links */}
          <div className={activeFormTab === 'highlights' ? 'space-y-6' : 'hidden'}>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Highlights (one per line)">
                <TextArea value={form.highlightsText} onChange={(event) => upd('highlightsText', event.target.value)} className="min-h-[120px]" />
              </FormField>
              <FormField label="Top Recruiters (one per line)">
                <TextArea value={form.topRecruitersText} onChange={(event) => upd('topRecruitersText', event.target.value)} className="min-h-[120px]" />
              </FormField>
              <FormField label="Facilities (one per line)">
                <TextArea value={form.facilitiesText} onChange={(event) => upd('facilitiesText', event.target.value)} className="min-h-[120px]" />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {Object.keys(form.links).map((key) => (
                <FormField key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase())}>
                  <TextInput value={form.links[key]} onChange={(event) => updNested('links', key, event.target.value)} />
                </FormField>
              ))}
            </div>
          </div>

          {/* Tab 5: Courses */}
          <div className={activeFormTab === 'courses' ? 'space-y-6' : 'hidden'}>
            <div className="rounded-[2rem] border border-light-border dark:border-dark-border p-5 md:p-6 space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="text-lg font-black text-light-text dark:text-dark-text flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Courses Inside University
                  </h4>
                  <p className="text-sm text-light-muted dark:text-dark-muted">
                    Build the hierarchy directly here: Stream -&gt; Base Course -&gt; Universities.
                  </p>
                </div>
                <button type="button" onClick={addCourse} className="btn-outline text-sm flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Add Course
                </button>
              </div>

              <div className="space-y-4">
                {form.courses.map((course, index) => (
                  <div key={`${course._id || 'new'}-${index}`} className="rounded-[1.5rem] border border-light-border dark:border-dark-border p-4 md:p-5 space-y-4 bg-light-card/30 dark:bg-dark-card/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black text-light-text dark:text-dark-text">Course #{index + 1}</div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => cloneCourse(index)}
                          className="rounded-xl p-2 text-light-muted hover:bg-primary/10 hover:text-primary flex items-center gap-1 text-xs font-bold"
                          title="Clone this course details"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Clone
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCourse(index)}
                          className="rounded-xl p-2 text-light-muted hover:bg-red-50 hover:text-red-500"
                          aria-label={`Remove course ${index + 1}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <FormField label="Stream">
                        <SelectInput
                          value={course.stream}
                          onChange={(event) => updCourse(index, 'stream', event.target.value)}
                          options={STREAM_OPTIONS.map((stream) => ({ value: stream, label: stream }))}
                        />
                      </FormField>
                      <FormField label="Course Level">
                        <SelectInput
                          value={course.category}
                          onChange={(event) => updCourse(index, 'category', event.target.value)}
                          options={COURSE_LEVEL_OPTIONS}
                        />
                      </FormField>
                      <FormField label="Base Course *">
                        <TextInput
                          value={course.baseCourse}
                          onChange={(event) => updCourse(index, 'baseCourse', event.target.value)}
                          placeholder="e.g. LLB"
                          required
                        />
                      </FormField>
                      <FormField label="Specialization">
                        <TextInput
                          value={course.specializationName}
                          onChange={(event) => updCourse(index, 'specializationName', event.target.value)}
                          placeholder="e.g. Corporate Law"
                        />
                      </FormField>
                      <FormField label="Duration (Years)">
                        <TextInput type="number" value={course.duration} onChange={(event) => updCourse(index, 'duration', event.target.value)} />
                      </FormField>
                      <FormField label="Total Seats">
                        <TextInput type="number" value={course.totalSeats} onChange={(event) => updCourse(index, 'totalSeats', event.target.value)} />
                      </FormField>
                      <FormField label="Fees Per Year">
                        <TextInput type="number" value={course.feesPerYear} onChange={(event) => updCourse(index, 'feesPerYear', event.target.value)} />
                      </FormField>
                      <FormField label="Entrance Exams">
                        <TextArea
                          value={course.entranceExamsText}
                          onChange={(event) => updCourse(index, 'entranceExamsText', event.target.value)}
                          className="min-h-[92px]"
                          placeholder="One exam per line"
                        />
                      </FormField>
                    </div>

                    <FormField label="Eligibility">
                      <TextArea
                        value={course.eligibility}
                        onChange={(event) => updCourse(index, 'eligibility', event.target.value)}
                        className="min-h-[92px]"
                        placeholder="e.g. 10+2 with 50% marks"
                      />
                    </FormField>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Wizard Navigation Buttons & Submit Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-light-border dark:border-dark-border pt-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const tabs = ['general', 'media', 'stats', 'highlights', 'courses'];
                  const idx = tabs.indexOf(activeFormTab);
                  if (idx > 0) setActiveFormTab(tabs[idx - 1]);
                }}
                disabled={activeFormTab === 'general'}
                className="btn-outline text-sm py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  const tabs = ['general', 'media', 'stats', 'highlights', 'courses'];
                  const idx = tabs.indexOf(activeFormTab);
                  if (idx < tabs.length - 1) setActiveFormTab(tabs[idx + 1]);
                }}
                disabled={activeFormTab === 'courses'}
                className="btn-outline text-sm py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetEditor}
                className="btn-outline text-sm text-light-muted hover:text-light-text py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-sm flex items-center gap-1.5 py-2 px-6"
              >
                {saving ? 'Saving...' : editId ? 'Update University' : 'Create University'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="card p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-light-text dark:text-dark-text">Manage Universities</h3>
            <p className="text-sm text-light-muted dark:text-dark-muted">
              Review records, clean inactive entries, and take bulk actions from one table.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'All', value: 'all' },
              { label: 'Normal', value: 'normal' },
              { label: 'Private', value: 'private' },
              { label: 'Deemed', value: 'deemed' },
              { label: 'Foreign', value: 'foreign' },
              { label: 'Twinning', value: 'twinning' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterType(filter.value)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                  filterType === filter.value
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-light-card dark:bg-dark-card text-light-muted dark:text-dark-muted'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-sm font-bold text-primary">{selectedCount} selected</span>
          <button
            onClick={handleBulkDelete}
            disabled={!selectedCount}
            className="rounded-xl bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedIds([])}
            disabled={!selectedCount}
            className="rounded-xl border border-light-border dark:border-dark-border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-light-muted dark:text-dark-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear Selection
          </button>
        </div>

        <DataTable
          data={filteredItems}
          columns={columns}
          searchFields={['name', 'universityCode', 'city', 'state', 'type', 'segment', 'institutionKind']}
          searchPlaceholder="Search universities by name, code, city or state..."
          pageSize={12}
          rowSelection={{
            selectedIds,
            allSelected,
            onToggleAll: handleToggleAll,
            onToggleOne: handleToggleRow,
          }}
          actions={(university) => (
            <>
              <button onClick={() => edit(university)} className="p-2 rounded-xl hover:bg-light-card dark:hover:bg-dark-card">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => del(university._id)} className="p-2 rounded-xl hover:bg-red-50 text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        />
      </div>
    </div>
  );
}
