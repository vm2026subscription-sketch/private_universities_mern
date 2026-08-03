import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Image as ImageIcon, Upload, Trash2, X, ZoomIn } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const MAX_IMAGES = 40;

/**
 * Campus photo gallery.
 *
 * Holds plain image URLs, because that is what the record stores
 * (`campus.galleryImages: [String]`). The earlier version showed a title and a
 * category filter per photo, but neither was ever saved: titles were generated
 * as "Campus Image 1, 2, 3…" and the category was hardcoded to "Campus" on every
 * upload, so the filter tabs sorted images by a value nobody had set. Deleting
 * was local too — the tile vanished, the toast said "removed from gallery view",
 * and the photo came back on the next refresh.
 *
 * Captions are worth having, but as a schema change and a public-page change
 * together, not as labels invented in the browser.
 */
export default function UniversityGallerySection() {
  const context = useOutletContext();
  const uni = context?.uni;
  const refreshUni = context?.refreshUni;

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [confirmUrl, setConfirmUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    setImages(uni?.campus?.galleryImages || []);
  }, [uni]);

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > MAX_IMAGES) {
      return toast.error(`A gallery holds at most ${MAX_IMAGES} images.`);
    }

    setUploading(true);
    try {
      const uploaded = [];

      for (const file of files) {
        const form = new FormData();
        form.append('image', file);
        form.append('folder', 'gallery');

        const { data: uploadRes } = await api.post('/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const url = uploadRes?.url || uploadRes?.data?.url;
        if (!url) throw new Error('Upload did not return a URL');
        uploaded.push(url);
      }

      // One request for the batch. The endpoint appends and de-duplicates, so a
      // retry after a dropped connection cannot produce visible duplicates.
      const { data } = await api.post('/university-portal/my-university/gallery', {
        images: uploaded,
      });

      setImages(data.galleryImages || []);
      toast.success(`Uploaded ${uploaded.length} photo${uploaded.length > 1 ? 's' : ''}.`);
      if (refreshUni) refreshUni();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload the photos');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (url) => {
    setDeleting(url);
    try {
      const { data } = await api.delete('/university-portal/my-university/gallery', {
        // axios sends a DELETE body under `data`.
        data: { imageUrl: url },
      });

      setImages(data.galleryImages || []);
      setConfirmUrl(null);
      toast.success('Photo removed.');
      if (refreshUni) refreshUni();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not remove the photo');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-light-text dark:text-dark-text">Photo gallery</h1>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-1">
            {images.length} of {MAX_IMAGES} photos · campus, labs, hostels and events
          </p>
        </div>

        <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold cursor-pointer hover:bg-primary/90 transition-colors">
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading…' : 'Upload photos'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading || images.length >= MAX_IMAGES}
          />
        </label>
      </div>

      {images.length === 0 ? (
        <div className="p-12 rounded-xl bg-white dark:bg-dark-card border border-dashed border-light-border dark:border-dark-border text-center">
          <div className="w-11 h-11 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border flex items-center justify-center mx-auto">
            <ImageIcon className="w-5 h-5 text-light-muted dark:text-dark-muted" />
          </div>
          <h2 className="font-semibold text-light-text dark:text-dark-text mt-4">No photos yet</h2>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-2">
            Students look at photos before anything else. Add your campus, labs and hostels.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((url) => (
            <div
              key={url}
              className="group relative rounded-xl overflow-hidden bg-white dark:bg-dark-card border border-light-border dark:border-dark-border aspect-[4/3]"
            >
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setPreviewUrl(url)}
                  className="p-2 rounded-lg bg-white/90 text-slate-800 hover:bg-white transition-colors"
                  title="Preview"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmUrl(url)}
                  className="p-2 rounded-lg bg-white/90 text-rose-600 hover:bg-white transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-5 right-5 p-2 rounded-lg bg-white/90 text-slate-800"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewUrl}
            alt=""
            className="max-h-[85vh] max-w-full rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {/* Delete confirmation */}
      {confirmUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="max-w-sm w-full p-6 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
            <h3 className="font-semibold text-light-text dark:text-dark-text">Remove this photo?</h3>
            <p className="text-sm text-light-muted dark:text-dark-muted mt-2">
              It will disappear from your public page straight away.
            </p>

            <img src={confirmUrl} alt="" className="w-full h-32 object-cover rounded-lg mt-4" />

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmUrl(null)}
                className="flex-1 py-2.5 rounded-lg border border-light-border dark:border-dark-border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmUrl)}
                disabled={deleting === confirmUrl}
                className="flex-1 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {deleting === confirmUrl ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
