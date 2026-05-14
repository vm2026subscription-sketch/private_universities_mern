import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Send, CheckCircle2, MessageSquare, Clock, Globe } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const officeLocations = [
  {
    city: 'PUNE',
    addresses: [
      'Raghunath Apartment, A-7, 4th Floor Opp. Yashwantrao Chavan NatyaGruha, Near Shivaji Maharaj Statue, Kothrud, Pune, Maharashtra 411038',
      '5, Tulsi Bhavan, 1194/14A, Modern College Road (Off F C Road), Shivaji Nagar, Pune (Maharashtra) - 411005',
    ],
    phones: ['+91 77200 25900', '+91 77200 81400'],
    emails: ['contact@vidyarthimitra.org', 'info@vidyarthimitra.org'],
    mapSrc:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3782.952432799!2d73.8190!3d18.5074!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2c06bc19c6abb%3A0x781b21bd4e24f2!2sVidyarthi%20Mitra!5e0!3m2!1sen!2sin!4v1683600000000!5m2!1sen!2sin',
  },
  {
    city: 'MUMBAI',
    addresses: [
      'Andhra Mahasabha, 10/C, Lakhamsi Napoo Road, Dadar(E), Mumbai (Maharashtra) - 400014',
    ],
    phones: ['+91 77200 25900', '+91 77200 81400'],
    emails: ['contact@vidyarthimitra.org', 'info@vidyarthimitra.org'],
    mapSrc:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3771.6!2d72.8477!3d19.0178!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7cf12c9b6c9a5%3A0xde9d4e63e5ef8b9b!2sDadar%2C%20Mumbai!5e0!3m2!1sen!2sin!4v1683600000000!5m2!1sen!2sin',
  },
];

const infoCards = [
  {
    icon: Phone,
    title: 'Call Us',
    lines: ['+91 77200 25900', '+91 77200 81400'],
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    icon: Mail,
    title: 'Email Us',
    lines: ['contact@vidyarthimitra.org', 'info@vidyarthimitra.org'],
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Clock,
    title: 'Working Hours',
    lines: ['Mon – Sat: 9:00 AM – 7:00 PM', 'Sunday: Closed'],
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    icon: Globe,
    title: 'Website',
    lines: ['vidyarthimitra.org'],
    color: 'bg-emerald-500/10 text-emerald-600',
  },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error('Please fill name, email, subject and message.');
      return;
    }
    setSending(true);
    try {
      await api.post('/public/contact', form);
      setSent(true);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      toast.success('Message sent! We\'ll get back to you soon.');
    } catch {
      toast.error('Failed to send. Please try again or call us directly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#f8fafc] dark:bg-dark-bg min-h-screen">
      <Helmet>
        <title>Contact Us | Vidyarthi Mitra – Pune & Mumbai Office</title>
        <meta name="description" content="Get in touch with Vidyarthi Mitra. Visit our Pune or Mumbai offices, call us, or send a message. We're here to help you find the right career path." />
      </Helmet>

      {/* Hero */}
      <div className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary-dark/20 to-indigo-900/40" />
        <div className="absolute inset-0" style={{backgroundImage:'radial-gradient(circle at 20% 50%, rgba(var(--color-primary-rgb),0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.1) 0%, transparent 50%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-black uppercase tracking-widest mb-6">
              <MessageSquare className="w-3.5 h-3.5 text-accent" /> We're here to help
            </span>
            <h1 className="text-5xl md:text-7xl font-serif font-black text-white mb-4">
              Contact <span className="text-accent italic">Us</span>
            </h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto font-medium">
              Have questions about admissions, courses, or our services? Reach out and our team will respond promptly.
            </p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#f8fafc] dark:from-dark-bg to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16 space-y-20">

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {infoCards.map((card) => (
            <div key={card.title} className="bg-white dark:bg-dark-card rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-sm text-center group hover:-translate-y-1 transition-transform">
              <div className={`w-14 h-14 rounded-2xl ${card.color} flex items-center justify-center mx-auto mb-4`}>
                <card.icon className="w-6 h-6" />
              </div>
              <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-widest mb-3">{card.title}</h3>
              {card.lines.map((l) => (
                <p key={l} className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed break-all">{l}</p>
              ))}
            </div>
          ))}
        </motion.div>

        {/* Office Cards + Map */}
        <div className="space-y-12">
          <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white text-center">
            Our <span className="text-primary">Offices</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {officeLocations.map((office, i) => (
              <motion.div
                key={office.city}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                className="bg-white dark:bg-dark-card rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/5 shadow-lg"
              >
                {/* Map */}
                <div className="h-52 overflow-hidden">
                  <iframe
                    src={office.mapSrc}
                    width="100%" height="100%" style={{ border: 0 }}
                    allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    title={`${office.city} office map`}
                  />
                </div>
                <div className="p-8 space-y-5">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                    <MapPin className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-black uppercase tracking-widest text-accent">{office.city}</span>
                  </div>
                  <div className="space-y-2">
                    {office.addresses.map((addr, ai) => (
                      <div key={ai} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <span>{addr}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-white/5">
                    {office.phones.map((p) => (
                      <a key={p} href={`tel:${p.replace(/\s/g, '')}`} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 hover:text-primary transition-colors font-medium">
                        <Phone className="w-4 h-4 text-primary shrink-0" /> {p}
                      </a>
                    ))}
                    {office.emails.map((em) => (
                      <a key={em} href={`mailto:${em}`} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 hover:text-primary transition-colors font-medium break-all">
                        <Mail className="w-4 h-4 text-primary shrink-0" /> {em}
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-dark-card rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-lg overflow-hidden"
        >
          <div className="grid md:grid-cols-5">
            {/* Left panel */}
            <div className="md:col-span-2 bg-slate-900 p-10 md:p-14 flex flex-col justify-between">
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent text-xs font-black uppercase tracking-widest mb-8">Send a Message</span>
                <h3 className="text-3xl font-serif font-bold text-white mb-4">Let's talk about your future</h3>
                <p className="text-white/60 text-sm font-medium leading-relaxed">
                  Whether you need help choosing a course, understanding admission processes, or finding the right university — we're just a message away.
                </p>
              </div>
              <div className="mt-12 space-y-4">
                {[
                  { icon: Phone, text: '+91 77200 25900' },
                  { icon: Mail, text: 'contact@vidyarthimitra.org' },
                  { icon: MapPin, text: 'Pune & Mumbai, Maharashtra' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-white/70 text-sm font-medium">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right form */}
            <div className="md:col-span-3 p-10 md:p-14">
              {sent ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-3">Message Sent!</h3>
                  <p className="text-slate-500 font-medium mb-8">Our team will get back to you within 24 hours.</p>
                  <button onClick={() => setSent(false)} className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-sm hover:bg-primary-dark transition-colors">
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Full Name *</label>
                      <input
                        name="name" value={form.name} onChange={handleChange} required
                        placeholder="Your name"
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Email *</label>
                      <input
                        name="email" value={form.email} onChange={handleChange} required type="email"
                        placeholder="your@email.com"
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Phone</label>
                      <input
                        name="phone" value={form.phone} onChange={handleChange}
                        placeholder="+91 00000 00000"
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Subject *</label>
                      <select
                        name="subject" value={form.subject} onChange={handleChange} required
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                      >
                        <option value="" disabled>Select a topic *</option>
                        <option>Admission Enquiry</option>
                        <option>Course Information</option>
                        <option>Rank Predictor</option>
                        <option>Scholarship Information</option>
                        <option>Technical Support</option>
                        <option>Partnership / Advertisement</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Message *</label>
                    <textarea
                      name="message" value={form.message} onChange={handleChange} required rows={5}
                      placeholder="Tell us how we can help you..."
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
                    />
                  </div>
                  <button
                    type="submit" disabled={sending}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-primary to-primary-light text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity shadow-xl shadow-primary/30 disabled:opacity-60"
                  >
                    {sending ? (
                      <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send Message</>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
