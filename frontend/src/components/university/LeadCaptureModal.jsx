import { useState } from 'react';
import { X, CheckCircle, Mail, Phone, MapPin, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function LeadCaptureModal({ isOpen, onClose, university, leadType = 'apply', onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    state: '',
    preferredCourse: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);

  if (!isOpen || !university) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) return toast.error('Please enter your name');
    if (!formData.email.trim()) return toast.error('Please enter your email');
    if (!formData.phone.trim()) return toast.error('Please enter your phone number');
    if (formData.phone.replace(/[^0-9]/g, '').length < 10) {
      return toast.error('Please enter a valid 10-digit phone number');
    }
    if (!formData.state) return toast.error('Please select your state');

    setIsSubmitting(true);
    try {
      await api.post('/leads/submit', {
        ...formData,
        universityId: university._id,
        leadType
      });
      setSubmittedSuccessfully(true);
      if (onSuccess) {
        onSuccess();
      }
      toast.success(
        leadType === 'apply' 
          ? 'Application initiated successfully!' 
          : 'Brochure download requested!'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state on close
    setFormData({ name: '', email: '', phone: '', state: '', preferredCourse: '', notes: '' });
    setSubmittedSuccessfully(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={handleClose} 
      />

      {/* Modal box */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-lg transition-all duration-300 transform scale-100 z-10">
        
        {/* Decorative Top Accent */}
        <div className="h-2 bg-gradient-to-r from-primary to-accent" />

        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-light-muted dark:text-dark-muted hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedSuccessfully ? (
          /* Success Screen */
          <div className="p-8 text-center space-y-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-light-text dark:text-dark-text">
                {leadType === 'apply' ? 'Application Received!' : 'Request Registered!'}
              </h3>
              <p className="text-sm text-light-muted dark:text-dark-muted max-w-sm">
                Thank you for choosing <strong>{university.name}</strong>. An admissions coordinator will contact you shortly at <strong>{formData.phone}</strong>.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="btn-primary w-full max-w-xs py-3 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              Continue Browsing <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Input Form Form */
          <div className="p-8 space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-link">
                {leadType === 'apply' ? 'Direct Application' : 'Request Official Brochure'}
              </span>
              <h3 className="text-2xl font-bold text-light-text dark:text-dark-text mt-1">
                {university.name}
              </h3>
              <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
                {university.city}, {university.state}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-light-muted dark:text-dark-muted">Full Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange}
                  placeholder="Student's Name"
                  className="w-full bg-light-bg dark:bg-dark-bg/60 border border-light-border dark:border-dark-border/80 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-light-muted dark:text-dark-muted">Email *</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange}
                    placeholder="student@example.com"
                    className="w-full bg-light-bg dark:bg-dark-bg/60 border border-light-border dark:border-dark-border/80 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-light-muted dark:text-dark-muted">Phone Number *</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange}
                    placeholder="10-digit mobile"
                    className="w-full bg-light-bg dark:bg-dark-bg/60 border border-light-border dark:border-dark-border/80 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-light-muted dark:text-dark-muted">Your State *</label>
                  <select 
                    name="state" 
                    value={formData.state} 
                    onChange={handleChange}
                    className="w-full bg-light-bg dark:bg-dark-bg/60 border border-light-border dark:border-dark-border/80 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45"
                    required
                  >
                    <option value="">Select State</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-light-muted dark:text-dark-muted">Preferred Course</label>
                  <input 
                    type="text" 
                    name="preferredCourse" 
                    value={formData.preferredCourse} 
                    onChange={handleChange}
                    placeholder="e.g. B.Tech CS, MBA"
                    className="w-full bg-light-bg dark:bg-dark-bg/60 border border-light-border dark:border-dark-border/80 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-light-muted dark:text-dark-muted">Notes / Questions (Optional)</label>
                <textarea 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleChange}
                  placeholder="Any specific queries or details..."
                  rows="2"
                  className="w-full bg-light-bg dark:bg-dark-bg/60 border border-light-border dark:border-dark-border/80 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-55"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Submitting Request...
                    </>
                  ) : (
                    <>
                      {leadType === 'apply' ? 'Apply Now' : 'Download Brochure'}
                    </>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-center text-light-muted dark:text-dark-muted">
                By submitting this form, you agree to receive communications regarding your inquiry from Vidyarthi Mitra & partner institutions.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
