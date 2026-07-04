import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, Eye, EyeOff, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useRole } from '../../hooks/useRole';
import DataTable from './components/DataTable';
import { FormField, TextInput, TextArea, SelectInput, CheckboxField, FormActions } from './components/FormFields';

const emptyForm = () => ({ title: '', subtitle: '', imageUrl: '', mediaType: 'image', videoUrl: '', link: '', linkText: '', position: 'hero', page: 'home', isActive: true, priority: 0, startDate: '', endDate: '', backgroundColor: '', textColor: '', universityId: '' });

export default function BannersManager() {
  const { canDelete } = useRole();
  const [banners, setBanners] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/admin/banners').then(r => setBanners(r.data.data || [])).catch(() => toast.error('Failed to load'));
  useEffect(() => {
    load();
    api.get('/admin/content?resource=universities')
      .then(r => setUniversities(r.data.data?.universities || []))
      .catch(() => {});
  }, []);

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, priority: Number(form.priority) || 0, universityId: form.universityId || null };
      if (form.startDate) payload.startDate = form.startDate;
      else delete payload.startDate;
      if (form.endDate) payload.endDate = form.endDate;
      else delete payload.endDate;

      if (editId) { await api.put(`/admin/banners/${editId}`, payload); toast.success('Updated'); }
      else { await api.post('/admin/banners', payload); toast.success('Created'); }
      setForm(emptyForm()); setEditId(null); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
  };

  const edit = (b) => {
    setForm({ ...b, universityId: (b.universityId && b.universityId._id) || b.universityId || '', startDate: b.startDate ? b.startDate.slice(0,10) : '', endDate: b.endDate ? b.endDate.slice(0,10) : '' });
    setEditId(b._id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id) => {
    if (!confirm('Delete this banner?')) return;
    await api.delete(`/admin/banners/${id}`); toast.success('Deleted'); load();
  };

  // Export a per-banner performance report as CSV (opens in Excel / Sheets).
  // Share this with universities to show impressions, clicks and CTR of their ad.
  const exportReport = () => {
    if (!banners.length) return toast.error('No banners to export');
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = banners.map(b => {
      const ctr = b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(2) : '0.00';
      return [
        b.title, b.position, b.page,
        b.isActive ? 'Active' : 'Inactive',
        b.impressions || 0, b.clicks || 0, `${ctr}%`,
        b.startDate ? b.startDate.slice(0, 10) : '',
        b.endDate ? b.endDate.slice(0, 10) : '',
        b.link || '',
      ].map(esc).join(',');
    });
    const header = ['Title', 'Position', 'Page', 'Status', 'Impressions', 'Clicks', 'CTR', 'Start Date', 'End Date', 'Link'].join(',');
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banner-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'position', label: 'Position', render: b => <span className="badge badge-blue">{b.position}</span> },
    { key: 'page', label: 'Page' },
    { key: 'isActive', label: 'Status', render: b => b.isActive ? <span className="badge badge-green">Active</span> : <span className="badge badge-orange">Inactive</span> },
    { key: 'priority', label: 'Priority' },
    {
      key: 'impressions',
      label: 'Impressions',
      render: b => <span className="font-semibold text-blue-500">{(b.impressions || 0).toLocaleString()}</span>
    },
    {
      key: 'clicks',
      label: 'Clicks',
      render: b => <span className="font-semibold text-green-500">{(b.clicks || 0).toLocaleString()}</span>
    },
    {
      key: 'ctr',
      label: 'CTR',
      render: b => {
        const ctr = b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(2) : '0.00';
        return <span className="font-semibold text-amber-500">{ctr}%</span>;
      }
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Banners</h2>
        <div className="flex items-center gap-2">
          <button onClick={exportReport} className="btn-outline text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export Report
          </button>
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm()); }} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Banner
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save} className="card p-6 space-y-4">
          <h3 className="font-semibold">{editId ? 'Edit Banner' : 'New Banner'}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Title"><TextInput value={form.title} onChange={e => upd('title', e.target.value)} required /></FormField>
            <FormField label="Subtitle"><TextInput value={form.subtitle} onChange={e => upd('subtitle', e.target.value)} /></FormField>
            <FormField label="Media Type">
              <SelectInput value={form.mediaType} onChange={e => upd('mediaType', e.target.value)} options={[{value:'image',label:'Image'},{value:'video',label:'Video (premium)'}]} />
            </FormField>
            <FormField label={form.mediaType === 'video' ? 'Poster Image URL (optional)' : 'Image URL'}>
              <TextInput value={form.imageUrl} onChange={e => upd('imageUrl', e.target.value)} />
            </FormField>
            {form.mediaType === 'video' && (
              <FormField label="Video URL (.mp4 / YouTube / Vimeo)">
                <TextInput value={form.videoUrl} onChange={e => upd('videoUrl', e.target.value)} placeholder="https://youtu.be/…  or  https://cdn.site.com/ad.mp4" />
              </FormField>
            )}
            <FormField label="Link URL"><TextInput value={form.link} onChange={e => upd('link', e.target.value)} /></FormField>
            <FormField label="Link Text"><TextInput value={form.linkText} onChange={e => upd('linkText', e.target.value)} /></FormField>
            <FormField label="Position">
              <SelectInput value={form.position} onChange={e => upd('position', e.target.value)} options={[{value:'hero',label:'Hero Slider'},{value:'sponsored',label:'Sponsored University'},{value:'sidebar',label:'Sidebar'},{value:'footer',label:'Sticky Bottom'},{value:'popup',label:'Popup'},{value:'ticker',label:'Ticker'}]} />
            </FormField>
            <FormField label="Page"><TextInput value={form.page} onChange={e => upd('page', e.target.value)} /></FormField>
            <FormField label="Linked University (for Sponsored)">
              <SelectInput
                value={form.universityId || ''}
                onChange={e => upd('universityId', e.target.value)}
                options={[{ value: '', label: '— None —' }, ...universities.map(u => ({ value: u._id, label: u.name }))]}
              />
            </FormField>
            <FormField label="Priority"><TextInput type="number" value={form.priority} onChange={e => upd('priority', e.target.value)} /></FormField>
            <FormField label="Start Date"><TextInput type="date" value={form.startDate} onChange={e => upd('startDate', e.target.value)} /></FormField>
            <FormField label="End Date"><TextInput type="date" value={form.endDate} onChange={e => upd('endDate', e.target.value)} /></FormField>
          </div>
          <CheckboxField label="Active" checked={form.isActive} onChange={e => upd('isActive', e.target.checked)} />
          <FormActions onCancel={() => { setShowForm(false); setEditId(null); setForm(emptyForm()); }} isEditing={!!editId} />
        </form>
      )}

      <DataTable
        data={banners} columns={columns}
        searchFields={['title', 'position', 'page']}
        searchPlaceholder="Search banners..."
        actions={(b) => (
          <>
            <button onClick={() => edit(b)} className="p-1.5 rounded-lg hover:bg-light-card dark:hover:bg-dark-card"><Pencil className="w-4 h-4" /></button>
            {canDelete && <button onClick={() => del(b._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>}
          </>
        )}
      />
    </div>
  );
}
