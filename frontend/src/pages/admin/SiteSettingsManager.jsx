import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { FormField, TextInput, TextArea, CheckboxField } from './components/FormFields';

const defaultSettings = [
  { key: 'siteName', label: 'Site Name', category: 'general', type: 'text', value: 'Vidyarthi Mitra' },
  { key: 'tagline', label: 'Tagline', category: 'general', type: 'text', value: '' },
  { key: 'logo', label: 'Logo URL', category: 'appearance', type: 'image', value: '' },
  { key: 'favicon', label: 'Favicon URL', category: 'appearance', type: 'image', value: '' },
  { key: 'primaryColor', label: 'Primary Color', category: 'appearance', type: 'color', value: '#6366f1' },
  { key: 'contactEmail', label: 'Contact Email', category: 'contact', type: 'text', value: '' },
  { key: 'contactPhone', label: 'Contact Phone', category: 'contact', type: 'text', value: '' },
  { key: 'address', label: 'Address', category: 'contact', type: 'textarea', value: '' },
  { key: 'footerText', label: 'Footer Text', category: 'general', type: 'textarea', value: '' },
  { key: 'heroTitle', label: 'Hero Title', category: 'general', type: 'text', value: 'Find Your Perfect University in India' },
  { key: 'heroSubtitle', label: 'Hero Subtitle', category: 'general', type: 'textarea', value: '' },
  { key: 'metaTitle', label: 'Default Meta Title', category: 'seo', type: 'text', value: '' },
  { key: 'metaDescription', label: 'Default Meta Description', category: 'seo', type: 'textarea', value: '' },
  { key: 'googleAnalyticsId', label: 'Google Analytics ID', category: 'integration', type: 'text', value: '' },
  { key: 'facebookUrl', label: 'Facebook URL', category: 'social', type: 'text', value: '' },
  { key: 'twitterUrl', label: 'Twitter/X URL', category: 'social', type: 'text', value: '' },
  { key: 'instagramUrl', label: 'Instagram URL', category: 'social', type: 'text', value: '' },
  { key: 'youtubeUrl', label: 'YouTube URL', category: 'social', type: 'text', value: '' },
  { key: 'linkedinUrl', label: 'LinkedIn URL', category: 'social', type: 'text', value: '' },
  { key: 'whatsappNumber', label: 'WhatsApp Number', category: 'social', type: 'text', value: '' },
  { key: 'maintenanceMode', label: 'Maintenance Mode', category: 'general', type: 'boolean', value: false },
];

const categories = ['general', 'appearance', 'contact', 'social', 'seo', 'integration'];

export default function SiteSettingsManager() {
  const [settings, setSettings] = useState({});
  const [activeCategory, setActiveCategory] = useState('general');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/site-settings').then(r => {
      const map = {};
      (r.data.data || []).forEach(s => { map[s.key] = s.value; });
      setSettings(map);
    });
  }, []);

  const getValue = (key, fallback) => settings[key] !== undefined ? settings[key] : fallback;
  const setValue = (key, value) => setSettings(p => ({ ...p, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const batch = defaultSettings.map(s => ({
        key: s.key, value: getValue(s.key, s.value), label: s.label, category: s.category, type: s.type
      }));
      await api.post('/admin/site-settings/bulk', { settings: batch });
      toast.success('Settings saved');
    } catch (err) { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const filtered = defaultSettings.filter(s => s.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Site Settings</h2>
        <button onClick={save} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap capitalize transition-colors ${activeCategory === cat ? 'bg-primary text-white' : 'bg-light-card dark:bg-dark-card hover:bg-primary/10'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="card p-6 space-y-5">
        {filtered.map(s => (
          <div key={s.key}>
            {s.type === 'boolean' ? (
              <CheckboxField label={s.label} checked={!!getValue(s.key, s.value)} onChange={e => setValue(s.key, e.target.checked)} />
            ) : s.type === 'textarea' ? (
              <FormField label={s.label}><TextArea value={getValue(s.key, s.value) || ''} onChange={e => setValue(s.key, e.target.value)} className="min-h-[80px]" /></FormField>
            ) : s.type === 'color' ? (
              <FormField label={s.label}>
                <div className="flex gap-2 items-center">
                  <input type="color" value={getValue(s.key, s.value) || '#6366f1'} onChange={e => setValue(s.key, e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                  <TextInput value={getValue(s.key, s.value) || ''} onChange={e => setValue(s.key, e.target.value)} className="flex-1" />
                </div>
              </FormField>
            ) : (
              <FormField label={s.label}><TextInput value={getValue(s.key, s.value) || ''} onChange={e => setValue(s.key, e.target.value)} /></FormField>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
