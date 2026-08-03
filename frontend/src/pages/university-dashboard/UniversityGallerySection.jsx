import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Image as ImageIcon, Upload, Trash2, Plus, Sparkles, Filter,
  Maximize2, X, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const INITIAL_IMAGES = [
  { id: 1, title: 'Main Academic Block', category: 'Campus', url: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80' },
  { id: 2, title: 'Advanced Robotics Lab', category: 'Labs', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80' },
  { id: 3, title: 'Central Library & Reading Hall', category: 'Infrastructure', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80' },
  { id: 4, title: 'Student Sports Complex', category: 'Events', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80' },
  { id: 5, title: 'Hostel & Residential Wing', category: 'Hostel', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80' },
  { id: 6, title: 'Annual Tech Fest Convocation', category: 'Events', url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80' }
];

const CATEGORIES = ['All', 'Campus', 'Labs', 'Infrastructure', 'Hostel', 'Events'];

export default function UniversityGallerySection() {
  const context = useOutletContext();
  const uni = context?.uni;
  const refreshUni = context?.refreshUni;

  const [images, setImages] = useState(INITIAL_IMAGES);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [previewImage, setPreviewImage] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // New Image Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Campus');

  useEffect(() => {
    if (uni?.campus?.galleryImages?.length) {
      const formatted = uni.campus.galleryImages.map((imgUrl, idx) => ({
        id: idx + 1,
        title: `Campus Image ${idx + 1}`,
        category: 'Campus',
        url: imgUrl
      }));
      setImages(formatted);
    }
  }, [uni]);

  const filteredImages = selectedCategory === 'All'
    ? images
    : images.filter(img => img.category === selectedCategory);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        // Step 1: Upload file to /api/v1/upload to get URL
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', 'gallery');

        const { data: uploadRes } = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const fileUrl = uploadRes?.url || uploadRes?.data?.url;
        if (!fileUrl) throw new Error('Failed to get uploaded image URL');

        // Step 2: POST /my-university/gallery with the obtained URL
        await api.post('/university-portal/my-university/gallery', {
          url: fileUrl,
          title: newTitle || file.name.replace(/\.[^/.]+$/, ""),
          category: newCategory
        });
      }

      toast.success(`Successfully uploaded ${files.length} photo(s) to server!`);
      setNewTitle('');
      if (refreshUni) refreshUni();
    } catch (error) {
      console.error('Gallery upload failed:', error);
      toast.error(error.response?.data?.message || 'Failed to upload photo(s)');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
    setDeleteConfirmId(null);
    toast.success('Photo removed from gallery view');
  };

  return (
    <div className="space-y-8">
      {/* Upload Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-light-border dark:border-dark-border pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-light-text dark:text-dark-text flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-primary" /> Campus Photo Gallery
            </h2>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
              Upload high-resolution photos of your campus, labs, classrooms, and hostels.
            </p>
          </div>
          <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-primary/10 text-primary self-start sm:self-auto">
            {images.length} Images Uploaded
          </span>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 relative group rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary bg-primary/5 transition-all p-8 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-sm text-light-text dark:text-dark-text">Drag & drop photos here</h3>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Supports JPG, PNG, WEBP up to 10MB each</p>

            <label className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
              Browse Files
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {/* Category & Title Controls */}
          <div className="space-y-4 p-5 rounded-2xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border">
            <h4 className="font-bold text-xs uppercase tracking-wider text-light-muted dark:text-dark-muted">Upload Metadata</h4>
            <div>
              <label className="block text-xs font-semibold text-light-text dark:text-dark-text mb-1">Image Caption / Title</label>
              <input
                type="text"
                placeholder="e.g. Modern Auditorium"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-light-text dark:text-dark-text mb-1">Category Tag</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-light-muted dark:text-dark-muted shrink-0 mr-1" />
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCategory === cat
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white dark:bg-dark-card text-light-muted dark:text-dark-muted border border-light-border dark:border-dark-border hover:text-light-text dark:hover:text-dark-text'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredImages.map((img) => (
          <div
            key={img.id}
            className="group relative rounded-2xl overflow-hidden bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
          >
            <div className="relative aspect-video overflow-hidden bg-slate-900">
              <img
                src={img.url}
                alt={img.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                <button
                  onClick={() => setPreviewImage(img)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-colors"
                  title="View Larger"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(img.id)}
                  className="p-2 rounded-xl bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-md transition-colors"
                  title="Delete Photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between gap-2 bg-white dark:bg-dark-card">
              <div>
                <h4 className="font-bold text-sm text-light-text dark:text-dark-text truncate">{img.title}</h4>
                <span className="text-[11px] font-semibold text-primary">{img.category}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative max-w-4xl w-full rounded-3xl overflow-hidden bg-white dark:bg-dark-card shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage.url} alt={previewImage.title} className="w-full max-h-[75vh] object-contain bg-black" />
            <div className="p-5 flex items-center justify-between border-t border-light-border dark:border-dark-border">
              <div>
                <h3 className="font-bold text-base text-light-text dark:text-dark-text">{previewImage.title}</h3>
                <p className="text-xs text-light-muted dark:text-dark-muted">Category: {previewImage.category}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-light-text dark:text-dark-text">Delete Photo?</h3>
            <p className="text-xs text-light-muted dark:text-dark-muted">
              Are you sure you want to delete this photo from your university gallery? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 shadow-md shadow-red-500/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
