import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Building2, Globe, MapPin, Phone, Mail, Upload, CheckCircle,
  Save, Eye, Image as ImageIcon, Sparkles, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UniversityProfileSection() {
  const location = useLocation();
  const uni = location.state?.university;

  const [profile, setProfile] = useState({
    name: uni?.name || 'Apex Technical University',
    tagline: uni?.tagline || 'Empowering Next-Gen Technologists & Engineers',
    about: uni?.description || 'Apex Technical University is a premier institution accredited with NAAC A++ Grade. Known for world-class research facilities, state-of-the-art laboratories, and high industry placement records across engineering, management, and computing sciences.',
    vision: uni?.vision || 'To be a globally recognized institution of educational excellence, fostering innovation, ethics, and cutting-edge technical research.',
    mission: uni?.mission || 'Delivering industry-relevant curriculum, promoting interdisciplinary learning, and empowering students with hands-on skillsets and global exposure.',
    email: uni?.email || 'admissions@apexuniv.edu.in',
    phone: uni?.phone || '+91 98765 43210',
    website: uni?.website || 'https://www.apexuniv.edu.in',
    address: uni?.address || 'Sector 62, Institutional Area, Knowledge Park Phase III',
    city: uni?.city || 'Noida',
    state: uni?.state || 'Uttar Pradesh',
    pincode: uni?.pincode || '201309',
    establishedYear: uni?.establishedYear || '1998',
    accreditation: uni?.naacGrade ? `NAAC ${uni.naacGrade} Grade, UGC Approved` : 'NAAC A++ Grade, AICTE Approved',
    logoUrl: uni?.logoUrl || 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=200&q=80',
    coverUrl: uni?.bannerImageUrl || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80'
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      handleChange('logoUrl', url);
      toast.success('University logo updated successfully!');
    }
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      handleChange('coverUrl', url);
      toast.success('Cover image updated successfully!');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('University profile updated successfully!');
    }, 800);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Cover & Logo Header Upload Card */}
      <div className="rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border overflow-hidden shadow-sm">
        {/* Cover Photo Area */}
        <div className="relative h-48 md:h-64 bg-slate-800">
          <img
            src={profile.coverUrl}
            alt="University Cover"
            className="w-full h-full object-cover opacity-80"
          />
          <label className="absolute bottom-4 right-4 cursor-pointer px-4 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 border border-white/20 transition-all shadow-lg">
            <Upload className="w-4 h-4" /> Change Cover Image
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </label>
        </div>

        {/* Logo & Basic Info Overlay */}
        <div className="p-6 md:p-8 pt-0 relative flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-light-border dark:border-dark-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5 -mt-16 md:-mt-20">
            <div className="relative group">
              <img
                src={profile.logoUrl}
                alt="University Logo"
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover bg-white p-2 border-4 border-white dark:border-dark-card shadow-xl"
              />
              <label className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold cursor-pointer">
                <Upload className="w-5 h-5 mb-1" />
                <span>Upload Logo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                <Shield className="w-3.5 h-3.5" /> Verified University
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold text-light-text dark:text-dark-text">{profile.name}</h2>
              <p className="text-xs text-light-muted dark:text-dark-muted font-medium">{profile.accreditation} • Estd. {profile.establishedYear}</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </div>

      {/* Profile Details Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details (About, Vision, Mission) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-5">
            <h3 className="font-bold text-base text-light-text dark:text-dark-text flex items-center gap-2 border-b border-light-border dark:border-dark-border pb-3">
              <Building2 className="w-5 h-5 text-primary" /> About & Overview
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-2">
                University Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-medium text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-2">
                Tagline / Motto
              </label>
              <input
                type="text"
                value={profile.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-medium text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-2">
                About University
              </label>
              <textarea
                rows={4}
                value={profile.about}
                onChange={(e) => handleChange('about', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-medium text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Vision & Mission */}
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-5">
            <h3 className="font-bold text-base text-light-text dark:text-dark-text flex items-center gap-2 border-b border-light-border dark:border-dark-border pb-3">
              <Sparkles className="w-5 h-5 text-amber-500" /> Vision & Mission Statements
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-2">
                University Vision
              </label>
              <textarea
                rows={3}
                value={profile.vision}
                onChange={(e) => handleChange('vision', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-medium text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-2">
                University Mission
              </label>
              <textarea
                rows={3}
                value={profile.mission}
                onChange={(e) => handleChange('mission', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-medium text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sidebar Contact & Address Section */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-4">
            <h3 className="font-bold text-base text-light-text dark:text-dark-text flex items-center gap-2 border-b border-light-border dark:border-dark-border pb-3">
              <Phone className="w-5 h-5 text-emerald-500" /> Contact Details
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                Admissions Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-medium text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-medium text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                Official Website URL
              </label>
              <input
                type="url"
                value={profile.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-medium text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-4">
            <h3 className="font-bold text-base text-light-text dark:text-dark-text flex items-center gap-2 border-b border-light-border dark:border-dark-border pb-3">
              <MapPin className="w-5 h-5 text-purple-500" /> Campus Address
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                Street Address
              </label>
              <textarea
                rows={2}
                value={profile.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-medium text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">City</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">State</label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text text-xs font-medium"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
