import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

const sections = [
  {
    title: 'Agreement to Terms',
    content: 'By using our platform VidyarthiMitra.org (the "Site"), you confirm that you are at least 13 years of age, you have read and understood these Terms and Conditions, and that you agree to be bound by them. If you do not agree to these terms, please do not use this Site.',
  },
  {
    title: 'Use of the Site',
    content: 'VidyarthiMitra.org is a search engine and educational information portal. You agree to use this Site only for lawful purposes and in a manner that does not infringe the rights of others. You must not misuse our site by knowingly introducing viruses or other malicious material. You must not attempt to gain unauthorized access to our site, the server on which our site is stored, or any server, computer or database connected to our site.',
  },
  {
    title: 'Intellectual Property',
    content: 'All content on this site — including text, graphics, logos, images, and software — is the property of Sankshemam Foundation & Sankshemam Seva Private Ltd. and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works from any content on this site without our express written permission.',
  },
  {
    title: 'User Accounts',
    content: 'When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party.',
  },
  {
    title: 'Disclaimer of Warranties',
    content: 'The information on this site is provided "as is" without any guarantees, conditions or warranties as to its accuracy. VidyarthiMitra.org makes every effort to ensure the accuracy of information published on the portal but cannot guarantee that all information is completely up to date at all times. University rankings, cut-offs, fees, and admission data may change without notice.',
  },
  {
    title: 'Limitation of Liability',
    content: 'To the maximum extent permitted by applicable law, VidyarthiMitra.org shall not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from your access to or use of (or inability to access or use) the service.',
  },
  {
    title: 'Links to Other Sites',
    content: 'Our Service may contain links to third-party web sites or services that are not owned or controlled by VidyarthiMitra.org. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third party web sites or services. We strongly advise you to read the terms and conditions and privacy policy of any third-party web site that you visit.',
  },
  {
    title: 'Governing Law',
    content: 'These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Pune, Maharashtra.',
  },
  {
    title: 'Changes to Terms',
    content: 'We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms.',
  },
  {
    title: 'Contact Us',
    content: 'If you have any questions about these Terms, please contact us:\nEmail: support@vidyarthimitra.org\nPhone: +91 77200 25900\nAddress: Raghunath Apartment, A-7, 4th Floor, Kothrud, Pune, Maharashtra 411038',
  },
];

export default function TermsAndConditions() {
  return (
    <div className="bg-[#f8fafc] dark:bg-dark-bg min-h-screen">
      <Helmet>
        <title>Terms and Conditions | Vidyarthi Mitra</title>
        <meta name="description" content="Read the Terms and Conditions governing your use of Vidyarthi Mitra's website and services." />
      </Helmet>

      {/* Hero */}
      <div className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary-dark/20 to-indigo-900/40" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-black uppercase tracking-widest mb-6">
              <FileText className="w-3.5 h-3.5 text-accent" /> Legal
            </span>
            <h1 className="text-4xl md:text-6xl font-serif font-black text-white">
              Terms &amp; <span className="text-accent italic">Conditions</span>
            </h1>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#f8fafc] dark:from-dark-bg to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-dark-card rounded-[3rem] p-10 md:p-14 border border-slate-100 dark:border-white/5 shadow-sm space-y-10"
        >
          {sections.map((s, i) => (
            <div key={s.title} className={i > 0 ? 'border-t border-slate-100 dark:border-white/5 pt-8' : ''}>
              <h2 className="text-lg font-black text-primary uppercase tracking-wider mb-4">{s.title}</h2>
              <div className="space-y-3">
                {s.content.split('\n').map((para, j) => (
                  <p key={j} className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-[15px]">{para}</p>
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest border-t border-slate-100 dark:border-white/5 pt-6">
            Last updated: 2024 · VidyarthiMitra.org
          </p>
        </motion.div>
      </div>
    </div>
  );
}
