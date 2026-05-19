import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, Plus, Upload, RefreshCw, Building2, MapPin, Layers3, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, SelectInput, CheckboxField, FormActions } from './components/FormFields';

const emptyForm = () => ({
  universityCode: '',
  name: '',
  type: 'private',
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
});

const splitLines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
const num = (value) => (value === '' ? undefined : Number(value));

const statCards = (items) => [
  {
    label: 'Total Universities',
    value: items.length,
    icon: Building2,
  },
  {
    label: 'Private / Deemed',
    value: `${items.filter((item) => item.type === 'private').length} / ${items.filter((item) => item.type === 'deemed').length}`,
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
    return items.filter((item) => item.type === filterType);
  }, [items, filterType]);

  const selectedCount = selectedIds.length;
  const allSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item._id));

  const upd = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const updNested = (section, field, value) => setForm((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));

  const resetEditor = () => {
    setForm(emptyForm());
    setEditId(null);
    setShowForm(false);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        universityCode: form.universityCode || undefined,
        name: form.name,
        type: form.type,
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
      };

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
      type: university.type || 'private',
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
    });
    setEditId(university._id);
    setShowForm(true);
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
      render: (university) => <span className="badge badge-orange capitalize">{university.type}</span>,
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
            Manage records, clean duplicates faster, and keep your admission catalogue professional.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="btn-outline text-sm flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <a href="/admin-legacy?tab=Universities" className="btn-outline text-sm flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            Bulk Import
          </a>
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
                Add trusted institutional information with stronger structure and cleaner presentation.
              </p>
            </div>
            <div className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
              {editId ? 'Editing Existing Record' : 'New Catalogue Entry'}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FormField label="University Code">
              <TextInput value={form.universityCode} onChange={(event) => upd('universityCode', event.target.value)} placeholder="e.g. AMITY_NDA" />
            </FormField>
            <FormField label="University Name *">
              <TextInput value={form.name} onChange={(event) => upd('name', event.target.value)} required />
            </FormField>
            <FormField label="Type">
              <SelectInput
                value={form.type}
                onChange={(event) => upd('type', event.target.value)}
                options={[
                  { value: 'private', label: 'Private' },
                  { value: 'deemed', label: 'Deemed' },
                  { value: 'foreign', label: 'Foreign' },
                ]}
              />
            </FormField>
            <FormField label="State *">
              <TextInput value={form.state} onChange={(event) => upd('state', event.target.value)} required />
            </FormField>
            <FormField label="City *">
              <TextInput value={form.city} onChange={(event) => upd('city', event.target.value)} required />
            </FormField>
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
            <FormField label="Email">
              <TextInput value={form.email} onChange={(event) => upd('email', event.target.value)} />
            </FormField>
            <FormField label="Phone">
              <TextInput value={form.phone} onChange={(event) => upd('phone', event.target.value)} />
            </FormField>
          </div>

          <FormField label="Description">
            <TextArea value={form.description} onChange={(event) => upd('description', event.target.value)} className="min-h-[140px]" />
          </FormField>

          <FormField label="Address">
            <TextInput value={form.address} onChange={(event) => upd('address', event.target.value)} />
          </FormField>

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

          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Highlights">
              <TextArea value={form.highlightsText} onChange={(event) => upd('highlightsText', event.target.value)} />
            </FormField>
            <FormField label="Top Recruiters">
              <TextArea value={form.topRecruitersText} onChange={(event) => upd('topRecruitersText', event.target.value)} />
            </FormField>
            <FormField label="Facilities">
              <TextArea value={form.facilitiesText} onChange={(event) => upd('facilitiesText', event.target.value)} />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {Object.keys(form.links).map((key) => (
              <FormField key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase())}>
                <TextInput value={form.links[key]} onChange={(event) => updNested('links', key, event.target.value)} />
              </FormField>
            ))}
          </div>

          <FormActions
            onCancel={resetEditor}
            isEditing={!!editId}
            loading={saving}
            submitLabel="Create University"
          />
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
              { label: 'Private', value: 'private' },
              { label: 'Deemed', value: 'deemed' },
              { label: 'Foreign', value: 'foreign' },
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
          searchFields={['name', 'universityCode', 'city', 'state', 'type']}
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
