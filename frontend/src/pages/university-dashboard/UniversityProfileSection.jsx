import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Building2, Globe, MapPin, Phone, Mail, Upload, CheckCircle,
  Save, Eye, Image as ImageIcon, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function UniversityProfileSection() {
  const context = useOutletContext();
  const uni = context?.uni;
  const refreshUni = context?.refreshUni;

  /**
   * Empty, never sample text.
   *
   * These fields were pre-filled with another university's copy — a tagline, a
   * vision, a mission, a NAAC A++ grade, even stock campus photography. The form
   * saves what it shows, so a university that filled in its phone number and
   * pressed Save would have published all of it as its own. Placeholder prose in
   * an editable field is not a placeholder; it is a draft nobody wrote.
   */
  const emptyProfile = {
    name: '', tagline: '', about: '', vision: '', mission: '',
    email: '', phone: '', website: '', address: '', city: '', state: '',
    pincode: '', establishedYear: '', accreditation: '', logoUrl: '', coverUrl: '',
  };

  const [profile, setProfile] = useState(emptyProfile);

  useEffect(() => {
    if (uni) {
      setProfile({
        name: uni.name || '',
        tagline: uni.tagline || '',
        about: uni.description || '',
        vision: uni.vision || '',
        mission: uni.mission || '',
        email: uni.email || '',
        phone: uni.phone || '',
        website: uni.website || '',
        address: uni.address || '',
        city: uni.city || '',
        state: uni.state || '',
        pincode: uni.pincode || '',
        establishedYear: uni.establishedYear ? String(uni.establishedYear) : '',
        accreditation: uni.naacGrade ? `NAAC ${uni.naacGrade}` : '',
        logoUrl: uni.logoUrl || '',
        coverUrl: uni.bannerImageUrl || '',
      });
    }
  }, [uni]);

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const uploadFile = async (file, folder = 'university') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);
    const { data } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data?.url || data?.data?.url;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(file, 'logos');
      if (url) {
        handleChange('logoUrl', url);
        toast.success('University logo uploaded successfully!');
      }
    } catch (error) {
      toast.error('Failed to upload logo image');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadFile(file, 'covers');
      if (url) {
        handleChange('coverUrl', url);
        toast.success('Cover image uploaded successfully!');
      }
    } catch (error) {
      toast.error('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      /**
       * Sends only what this form owns, and only what was filled in.
       *
       * `establishedYear` defaulted to `|| 1998` — a founding year invented for
       * any university that left the field blank. `city` and `state` are set by
       * the platform and were silently refused on every save. Vision and mission
       * are edited on this screen but were never sent at all, so they could not
       * be saved.
       */
      const payload = {
        description: profile.about,
        vision: profile.vision,
        mission: profile.mission,
        email: profile.email,
        phone: profile.phone,
        website: profile.website,
        address: profile.address,
        logoUrl: profile.logoUrl,
        bannerImageUrl: profile.coverUrl,
      };

      const year = parseInt(profile.establishedYear, 10);
      if (Number.isFinite(year)) payload.establishedYear = year;

      const { data } = await api.put('/university-portal/my-university', payload);
      if (data?.success) {
        // The server reports three outcomes; reporting only "saved" hid the fact
        // that some fields went to a review queue instead of going live.
        if (data.applied?.length) toast.success('Saved.');
        if (data.awaitingReview?.length) {
          toast('Some changes need verification before they appear publicly.', { icon: 'ℹ️' });
        }
        if (data.rejected?.length) {
          toast.error(`Not saved: ${data.rejected.join(', ')}`);
        }
        if (refreshUni) refreshUni();
      }
    } catch (error) {
      console.error('Error updating university profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update university profile');
    } finally {
      setSaving(false);
    }
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
              {/* "Verified University" was shown to every account unconditionally.
                  Nothing verifies it, and a badge that is always on says nothing. */}
              <h2 className="text-xl md:text-2xl font-bold text-light-text dark:text-dark-text">
                {profile.name || 'Your University'}
              </h2>
              <p className="text-xs text-light-muted dark:text-dark-muted font-medium">
                {[profile.accreditation, profile.establishedYear && `Estd. ${profile.establishedYear}`]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
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
            <h3 className="font-bold text-base text-light-text dark:text-dark-text flex items-center gap-2 border-b border-light-border dark:border-dark-border pb-3"> Vision & Mission Statements
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
