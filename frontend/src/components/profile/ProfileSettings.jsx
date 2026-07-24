import { useState } from 'react';
import { User, Mail, Lock, LogOut, Save, ShieldAlert, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
];

export default function ProfileSettings({ user, onUpdateProfile, onChangePassword, onLogout }) {
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    avatar: user?.avatar || DEFAULT_AVATARS[0]
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleCustomAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Please select a valid image file (PNG, JPG, WEBP, etc.)');
    }

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Image file size must be less than 5 MB');
    }

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && (res.data.url || res.data.data?.avatar)) {
        const newAvatarUrl = res.data.url || res.data.data.avatar;
        setProfileData(prev => ({ ...prev, avatar: newAvatarUrl }));
        if (onUpdateProfile) {
          onUpdateProfile({ avatar: newAvatarUrl });
        }
        toast.success('Avatar uploaded successfully!');
      } else {
        throw new Error(res.data?.message || 'Avatar upload failed');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to upload avatar. Please try again.';
      toast.error(errorMsg);
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (updatingProfile) return;
    setUpdatingProfile(true);
    try {
      await onUpdateProfile(profileData);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (updatingPassword) return;
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setUpdatingPassword(true);
    try {
      await onChangePassword(passwordData);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Account Settings</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Update */}
        <div className="card p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-light-border dark:border-dark-border pb-4">
            <User className="w-5 h-5 text-link" />
            <h3 className="font-bold text-lg">Update Profile</h3>
          </div>
          
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold block">Choose Your Avatar</label>
                <label className={`cursor-pointer text-xs font-bold text-link flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 hover:bg-primary/5 transition-all ${uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      <span>Upload Image</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomAvatarUpload}
                    disabled={uploadingAvatar || updatingProfile}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                {DEFAULT_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setProfileData({ ...profileData, avatar: url })}
                    className={`
                      relative w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all
                      ${profileData.avatar === url ? 'border-primary ring-2 ring-primary/20 scale-110 shadow-lg' : 'border-transparent hover:border-primary/50'}
                    `}
                  >
                    <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    {profileData.avatar === url && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-link bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted" />
                <input 
                  type="text" 
                  value={profileData.name} 
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="input-field pl-10 text-sm" 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2 opacity-70">
              <label className="text-sm font-semibold">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted" />
                <input type="email" value={user?.email || ''} disabled className="input-field pl-10 text-sm bg-light-bg/50 cursor-not-allowed" />
              </div>
              <p className="text-[10px] text-light-muted italic ml-1">Email cannot be changed for security reasons.</p>
            </div>

            <button type="submit" disabled={updatingProfile} className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60">
              {updatingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Profile Changes
                </>
              )}
            </button>
          </form>
        </div>

        {/* Password Update */}
        <div className="card p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-light-border dark:border-dark-border pb-4">
            <Lock className="w-5 h-5 text-link" />
            <h3 className="font-bold text-lg">Change Password</h3>
          </div>

          <form onSubmit={handlePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Current Password</label>
              <input 
                type="password" 
                value={passwordData.currentPassword} 
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="input-field text-sm" 
                placeholder="Enter current password"
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">New Password</label>
              <input 
                type="password" 
                value={passwordData.newPassword} 
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="input-field text-sm" 
                placeholder="Minimum 6 characters"
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Confirm New Password</label>
              <input 
                type="password" 
                value={passwordData.confirmPassword} 
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="input-field text-sm" 
                placeholder="Re-type new password"
                required 
              />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={updatingPassword} className="btn-primary w-full flex items-center justify-center gap-2 py-3 bg-slate-600 hover:bg-slate-700 disabled:opacity-60">
                {updatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" /> Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Logout Area */}
      <div className="card p-6 border-red-100 dark:border-red-900/30 bg-red-50/10 dark:bg-red-900/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-red-600 text-lg">Sign Out</h3>
              <p className="text-sm text-light-muted">Exit your current session on this browser. You'll need to log in again to access your dashboard.</p>
            </div>
          </div>
          <button onClick={onLogout} className="btn-outline !border-red-500 !text-red-500 hover:!bg-red-500 hover:!text-white flex items-center gap-2 px-8">
             Confirm Logout
          </button>
        </div>
      </div>
    </div>
  );
}
