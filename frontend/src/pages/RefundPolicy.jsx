import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

const sections = [
  {
    title: 'Refund and Cancellation Policy',
    content: `Our focus is absolute student's satisfaction. In the event of your inability to login to your mock tests or to any of our other products, because of technical faults from our end, or for any failed transactions, we will refund back the money, provided the reasons are genuine and proved after investigation.

We shall also refund your money if the products or the mock exams is/are not provided to you, for any reason, even on scheduled day or on any other allotted day. Please read the fine prints of each purchase, before buying it, as it provides all the details about the services or the products you purchase.

Our Policy for cancellations and refunds is as follows:

For Cancellations, please contact us via a mail to: support@vidyarthimitra.org.

Requests for cancellations received later than 7 business days prior to the end of the validity of the product or mock exam, will be treated as cancellation of services and no refund is allowed in such cases.

If paid by credit card, refunds will be issued to the original credit card provided at the time of purchase and in case of payment gateway name payments refund will be made to the same account.`,
  },
];

export default function RefundPolicy() {
  return (
    <div className="bg-[#f8fafc] dark:bg-dark-bg min-h-screen">
      <Helmet>
        <title>Refund & Cancellation Policy | Vidyarthi Mitra</title>
        <meta name="description" content="Read the Refund and Cancellation Policy for Vidyarthi Mitra's products and services." />
      </Helmet>

      {/* Hero */}
      <div className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary-dark/20 to-indigo-900/40" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-black uppercase tracking-widest mb-6">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Policy
            </span>
            <h1 className="text-4xl md:text-6xl font-serif font-black text-white">
              Refund &amp; <span className="text-accent italic">Cancellation</span>
            </h1>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#f8fafc] dark:from-dark-bg to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-dark-card rounded-[3rem] p-10 md:p-14 border border-slate-100 dark:border-white/5 shadow-sm"
        >
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-8 pb-4 border-b border-slate-100 dark:border-white/5">{s.title}</h2>
              <div className="space-y-5">
                {s.content.split('\n\n').map((para, i) => (
                  <p key={i} className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-[15px]">{para}</p>
                ))}
              </div>
            </div>
          ))}
          <p className="mt-10 text-xs text-slate-400 font-bold uppercase tracking-widest border-t border-slate-100 dark:border-white/5 pt-6">
            Last updated: 2024 · VidyarthiMitra.org
          </p>
        </motion.div>
      </div>
    </div>
  );
}
