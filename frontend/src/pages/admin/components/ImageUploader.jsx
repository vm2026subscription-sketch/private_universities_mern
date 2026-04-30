import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

export default function ImageUploader({ value, onChange, folder = 'general', label = 'Image' }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', folder);
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onChange(data.data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium block">{label}</span>
      <div className="flex items-start gap-3">
        {value ? (
          <div className="relative group">
            <img src={value} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-light-border" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : null}

        <div className="flex-1">
          <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Paste Cloudinary URL or upload..." className="input-field text-sm mb-2" />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-outline text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> Upload to Cloudinary</>}
          </button>
        </div>
      </div>
    </div>
  );
}
