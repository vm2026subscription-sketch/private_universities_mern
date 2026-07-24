import React, { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { isValidEmail, isValidPhone } from '../../utils/contactValidation';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    designation: '',
    feedback: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return toast.error('Image size must be less than 5 MB');
      }
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim();
    const mobile = formData.mobile.trim();
    const designation = formData.designation.trim();
    const feedback = formData.feedback.trim();

    if (!name) return toast.error('Please enter your name');
    if (!mobile || !isValidPhone(mobile)) return toast.error('Please enter a valid phone/mobile number');
    if (!email || !isValidEmail(email)) return toast.error('Please enter a valid email address');
    if (!designation) return toast.error('Please enter your designation');
    if (!feedback) return toast.error('Please enter your feedback');

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        email,
        mobile,
        role: designation,
        content: feedback,
        ...(avatarPreview ? { imageUrl: avatarPreview } : {}),
      };

      const res = await api.post('/testimonials', payload);
      toast.success(res.data?.message || 'Thank you! Your feedback has been submitted for review.');

      setFormData({
        name: '',
        mobile: '',
        email: '',
        designation: '',
        feedback: '',
      });
      setAvatarPreview(null);
      setIsOpen(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to submit feedback. Please try again.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Vertical Tab */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[100] bg-[#FF6B00] hover:bg-[#E65A00] text-white font-bold tracking-widest text-sm py-4 px-2 rounded-r-xl shadow-lg transition-colors flex items-center justify-center writing-vertical-rl"
        style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
      >
        FEEDBACK
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-dark-bg w-full max-w-4xl rounded-xl shadow-lg overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-[#FF6B00] px-6 py-4 flex items-center justify-between relative">
                <h2 className="text-2xl font-bold text-white w-full text-center uppercase tracking-wider">
                  Feedback Form
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  aria-label="Close feedback modal"
                  className="absolute right-4 text-white hover:text-white/80 transition-colors disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Body */}
              <div className="p-8">
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-10">
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                        placeholder="Enter your name"
                        className="w-full px-4 py-2 border border-slate-200 dark:border-dark-border rounded-md bg-white dark:bg-dark-card text-sm focus:outline-none focus:border-[#FF6B00] disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">
                        Mobile <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                        placeholder="10 Digit Number"
                        className="w-full px-4 py-2 border border-slate-200 dark:border-dark-border rounded-md bg-white dark:bg-dark-card text-sm focus:outline-none focus:border-[#FF6B00] disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">
                        Email Id <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                        placeholder="Enter your Email Id"
                        className="w-full px-4 py-2 border border-slate-200 dark:border-dark-border rounded-md bg-white dark:bg-dark-card text-sm focus:outline-none focus:border-[#FF6B00] disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                        placeholder="Enter your Designation"
                        className="w-full px-4 py-2 border border-slate-200 dark:border-dark-border rounded-md bg-white dark:bg-dark-card text-sm focus:outline-none focus:border-[#FF6B00] disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">
                        Feedback <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="feedback"
                        value={formData.feedback}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                        placeholder="Enter your Feedback"
                        rows="4"
                        className="w-full px-4 py-2 border border-slate-200 dark:border-dark-border rounded-md bg-white dark:bg-dark-card text-sm focus:outline-none focus:border-[#FF6B00] resize-none disabled:opacity-50"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-[#28A745] hover:bg-[#218838] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-8 rounded flex items-center justify-center gap-2 transition-colors shadow-sm"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>SUBMITTING...</span>
                          </>
                        ) : (
                          'SUBMIT'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Avatar Upload side */}
                  <div className="w-full md:w-64 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">
                      Avatar Upload
                    </label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <label className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs py-1 px-3 rounded cursor-pointer transition-colors">
                          Choose file
                          <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={isSubmitting} />
                        </label>
                        <span className="text-xs text-slate-500 truncate">
                          {avatarPreview ? 'Image chosen' : 'No file chosen'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">PNG, JPG, GIF, WEBP - Max 5 MB</p>
                    </div>

                    <div className="pt-4">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2">
                        Avatar Preview
                      </label>
                      <div className="w-48 h-48 bg-[#f8f9fa] dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded flex flex-col items-center justify-center text-slate-400 overflow-hidden relative">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mb-2 opacity-50" />
                            <span className="text-[10px]">No image selected</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
