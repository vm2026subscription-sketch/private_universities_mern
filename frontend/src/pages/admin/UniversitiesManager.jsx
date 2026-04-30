import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, SelectInput, CheckboxField, FormActions } from './components/FormFields';

const emptyForm = () => ({
  universityCode: '', name: '', type: 'private', state: '', city: '',
  establishedYear: '', naacGrade: '', nirfRank: '', description: '',
  logoUrl: '', bannerImageUrl: '', website: '', address: '', phone: '', email: '',
  approvals: { ugc: false, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  stats: { totalStudents: '', campusSizeAcres: '', avgPackageLPA: '', highestPackageLPA: '', placementPercentage: '' },
  highlightsText: '', topRecruitersText: '', facilitiesText: '',
  links: { admissionLink: '', brochureLink: '', placementReportLink: '', scholarshipLink: '', hostelLink: '', mapLink: '' },
});

const splitLines = v => String(v || '').split('\n').map(s => s.trim()).filter(Boolean);
const num = v => v === '' ? undefined : Number(v);

export default function UniversitiesManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/admin/content').then(r => { setItems(r.data.data?.universities || []); setLoading(false); }).catch(() => { toast.error('Failed'); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const updNested = (s, f, v) => setForm(p => ({ ...p, [s]: { ...p[s], [f]: v } }));

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        universityCode: form.universityCode || undefined, name: form.name, type: form.type, state: form.state, city: form.city,
        establishedYear: num(form.establishedYear), naacGrade: form.naacGrade || undefined, nirfRank: num(form.nirfRank),
        description: form.description, logoUrl: form.logoUrl || undefined, bannerImageUrl: form.bannerImageUrl || undefined,
        website: form.website || undefined, address: form.address || undefined, phone: form.phone || undefined, email: form.email || undefined,
        approvals: { ...form.approvals },
        stats: { totalStudents: num(form.stats.totalStudents), campusSizeAcres: num(form.stats.campusSizeAcres), avgPackageLPA: num(form.stats.avgPackageLPA), highestPackageLPA: num(form.stats.highestPackageLPA), placementPercentage: num(form.stats.placementPercentage) },
        highlights: splitLines(form.highlightsText), topRecruiters: splitLines(form.topRecruitersText), facilities: splitLines(form.facilitiesText),
        links: { ...form.links },
      };
      if (editId) { await api.put(`/admin/universities/${editId}`, payload); toast.success('Updated'); }
      else { await api.post('/admin/universities', payload); toast.success('Created'); }
      setForm(emptyForm()); setEditId(null); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const edit = (u) => {
    setForm({
      universityCode: u.universityCode || '', name: u.name || '', type: u.type || 'private', state: u.state || '', city: u.city || '',
      establishedYear: u.establishedYear || '', naacGrade: u.naacGrade || '', nirfRank: u.nirfRank || '',
      description: u.description || '', logoUrl: u.logoUrl || '', bannerImageUrl: u.bannerImageUrl || '',
      website: u.website || '', address: u.address || '', phone: u.phone || '', email: u.email || '',
      approvals: { ugc: !!u.approvals?.ugc, aicte: !!u.approvals?.aicte, nmc: !!u.approvals?.nmc, bci: !!u.approvals?.bci, coa: !!u.approvals?.coa, pci: !!u.approvals?.pci },
      stats: { totalStudents: u.stats?.totalStudents || '', campusSizeAcres: u.stats?.campusSizeAcres || '', avgPackageLPA: u.stats?.avgPackageLPA || '', highestPackageLPA: u.stats?.highestPackageLPA || '', placementPercentage: u.stats?.placementPercentage || '' },
      highlightsText: (u.highlights || []).join('\n'), topRecruitersText: (u.topRecruiters || []).join('\n'), facilitiesText: (u.facilities || []).join('\n'),
      links: { admissionLink: u.links?.admissionLink || '', brochureLink: u.links?.brochureLink || '', placementReportLink: u.links?.placementReportLink || '', scholarshipLink: u.links?.scholarshipLink || '', hostelLink: u.links?.hostelLink || '', mapLink: u.links?.mapLink || '' },
    });
    setEditId(u._id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id) => { if (!confirm('Delete this university and all its courses?')) return; await api.delete(`/admin/universities/${id}`); toast.success('Deleted'); load(); };

  const columns = [
    { key: 'name', label: 'Name', render: u => <span className="font-medium">{u.name}</span> },
    { key: 'universityCode', label: 'Code' },
    { key: 'city', label: 'Location', render: u => `${u.city}, ${u.state}` },
    { key: 'type', label: 'Type', render: u => <span className="badge badge-blue capitalize">{u.type}</span> },
    { key: 'naacGrade', label: 'NAAC', render: u => u.naacGrade ? <span className="badge badge-green">{u.naacGrade}</span> : '—' },
    { key: 'courses', label: 'Courses', render: u => u.courses?.length || 0 },
  ];

  if (loading) return <div className="text-center py-12 text-light-muted">Loading universities...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Universities ({items.length})</h2>
        <div className="flex gap-2">
          <a href="/admin-legacy?tab=Universities" className="btn-outline text-sm flex items-center gap-1.5"><Upload className="w-4 h-4" /> Bulk Import</a>
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm()); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save} className="card p-6 space-y-5">
          <h3 className="font-semibold text-lg">{editId ? 'Edit' : 'New'} University</h3>

          <div className="grid md:grid-cols-3 gap-4">
            <FormField label="University Code"><TextInput value={form.universityCode} onChange={e => upd('universityCode', e.target.value)} placeholder="e.g. AMITY_NDA" /></FormField>
            <FormField label="Name *"><TextInput value={form.name} onChange={e => upd('name', e.target.value)} required /></FormField>
            <FormField label="Type"><SelectInput value={form.type} onChange={e => upd('type', e.target.value)} options={[{value:'private',label:'Private'},{value:'deemed',label:'Deemed'}]} /></FormField>
            <FormField label="State *"><TextInput value={form.state} onChange={e => upd('state', e.target.value)} required /></FormField>
            <FormField label="City *"><TextInput value={form.city} onChange={e => upd('city', e.target.value)} required /></FormField>
            <FormField label="Established Year"><TextInput type="number" value={form.establishedYear} onChange={e => upd('establishedYear', e.target.value)} /></FormField>
            <FormField label="NAAC Grade"><TextInput value={form.naacGrade} onChange={e => upd('naacGrade', e.target.value)} placeholder="A++, A+, A, B++" /></FormField>
            <FormField label="NIRF Rank"><TextInput type="number" value={form.nirfRank} onChange={e => upd('nirfRank', e.target.value)} /></FormField>
            <FormField label="Website"><TextInput value={form.website} onChange={e => upd('website', e.target.value)} /></FormField>
            <FormField label="Logo URL (Cloudinary)"><TextInput value={form.logoUrl} onChange={e => upd('logoUrl', e.target.value)} /></FormField>
            <FormField label="Banner Image URL"><TextInput value={form.bannerImageUrl} onChange={e => upd('bannerImageUrl', e.target.value)} /></FormField>
            <FormField label="Email"><TextInput value={form.email} onChange={e => upd('email', e.target.value)} /></FormField>
            <FormField label="Phone"><TextInput value={form.phone} onChange={e => upd('phone', e.target.value)} /></FormField>
          </div>

          <FormField label="Description"><TextArea value={form.description} onChange={e => upd('description', e.target.value)} /></FormField>
          <FormField label="Address"><TextInput value={form.address} onChange={e => upd('address', e.target.value)} /></FormField>

          <div>
            <span className="text-sm font-medium block mb-2">Approvals</span>
            <div className="flex flex-wrap gap-4">
              {Object.keys(form.approvals).map(key => (
                <CheckboxField key={key} label={key.toUpperCase()} checked={form.approvals[key]} onChange={e => updNested('approvals', key, e.target.checked)} />
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            <FormField label="Total Students"><TextInput type="number" value={form.stats.totalStudents} onChange={e => updNested('stats', 'totalStudents', e.target.value)} /></FormField>
            <FormField label="Campus Acres"><TextInput type="number" value={form.stats.campusSizeAcres} onChange={e => updNested('stats', 'campusSizeAcres', e.target.value)} /></FormField>
            <FormField label="Avg Package LPA"><TextInput type="number" step="0.1" value={form.stats.avgPackageLPA} onChange={e => updNested('stats', 'avgPackageLPA', e.target.value)} /></FormField>
            <FormField label="Highest LPA"><TextInput type="number" step="0.1" value={form.stats.highestPackageLPA} onChange={e => updNested('stats', 'highestPackageLPA', e.target.value)} /></FormField>
            <FormField label="Placement %"><TextInput type="number" value={form.stats.placementPercentage} onChange={e => updNested('stats', 'placementPercentage', e.target.value)} /></FormField>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <FormField label="Highlights (one per line)"><TextArea value={form.highlightsText} onChange={e => upd('highlightsText', e.target.value)} /></FormField>
            <FormField label="Top Recruiters (one per line)"><TextArea value={form.topRecruitersText} onChange={e => upd('topRecruitersText', e.target.value)} /></FormField>
            <FormField label="Facilities (one per line)"><TextArea value={form.facilitiesText} onChange={e => upd('facilitiesText', e.target.value)} /></FormField>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {Object.keys(form.links).map(key => (
              <FormField key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}>
                <TextInput value={form.links[key]} onChange={e => updNested('links', key, e.target.value)} />
              </FormField>
            ))}
          </div>

          <FormActions onCancel={() => { setShowForm(false); setEditId(null); setForm(emptyForm()); }} isEditing={!!editId} />
        </form>
      )}

      <DataTable data={items} columns={columns} searchFields={['name', 'universityCode', 'city', 'state']} searchPlaceholder="Search universities..."
        actions={u => (<>
          <button onClick={() => edit(u)} className="p-1.5 rounded-lg hover:bg-light-card dark:hover:bg-dark-card"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => del(u._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
        </>)}
      />
    </div>
  );
}
