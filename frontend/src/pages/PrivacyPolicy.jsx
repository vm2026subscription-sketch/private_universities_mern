import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

const sections = [
  {
    title: 'Privacy Policy',
    intro: 'This Privacy Policy ("Privacy Policy") explains how www.vidyarthimitra.org ("VidyarthiMitra," "we" or "us") collect, use and share personally identifiable information of visitors of our website (the "Site") and users of our products and services (the "Services"). Please note that the primary purpose of our Site and the Services is to allow you to enroll in and take (both free and paid) online courses / exams / counselling sessions / expert advise or similar and all our other products, on a variety of topics (the "Courses").',
  },
  { title: 'Personally Identifiable Information We Collect and How We Use It', content: 'You can generally visit the Site without revealing any personally identifiable information about yourself. We do not collect personal information from our Site visitors without the Site visitor providing us with this information as set forth in this Privacy Policy.\n\nIf you request to receive company or product information, or request information about specific Services, or provide comments about Services, you will be asked to provide contact information so that we can complete your request. We use this Site Information to fulfil your request. We may also use this Site Information to send you additional information about our Services or Courses on the Site that you may be interested in.\n\nSome of the Services require that you become a registered user and create a user account. This will require that you provide certain personally identifiable information, including, without limitation, enrolment information for Courses.\n\nYou also consent to our providing this personally identifiable information to Instructors as part of the Course Information when you enroll in a Course. Instructors will use this Course Information to provide the Course to you.' },
  { title: 'Other Information We Collect and How We Use It', content: 'VidyarthiMitra may also automatically collect and analyse Site Information about your general usage of the Site, Services and Courses. We might track your usage patterns to identify features of the Site, Services and Courses you commonly visit. We traffic volumes, frequency of visits, type and time of transactions, number of links clicked, browser language, IP address and operating system, and statistical information about how you use the Services and Courses. We only collect, track and analyse such Site Information in an aggregate manner that does not personally identify you. This aggregate data may be used to assist us in operating and constantly improve and update the Site and the Services and provided to other third parties to enable them to better understand the operation of the Services, and improve their Courses offerings, but such information will be in aggregate form only and it will not contain personally identifiable data.' },
  { title: 'Children', content: 'We recognize the privacy interests of children and we encourage parents and guardians to take an active role in their children\'s online activities and interests. We do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will delete such information. Children under the age of 13 may not register for an account or register for or purchase Courses. Individuals under the age of 18 may only use the Site with the involvement, supervision, and approval of a parent or legal guardian.' },
  { title: 'Disclosure of Information', content: 'We will share your personally identifiable Site Information with third parties only in the ways that are described in this privacy policy. These include, but are not limited to, sharing Site Information with service providers to allow them to fulfil your requests, to Instructors (in which case this will become Course Information), and to your employer if you are enrolled through the VidyarthiMitra for Business program as an employee. We do not sell your personal information to third parties.' },
  { title: 'Security', content: 'The security of your personal information is important to us. VidyarthiMitra employs procedural and technological measures to protect your personally identifiable information. These measures are reasonably designed to help protect your personal identifiable information from loss, unauthorized access, disclosure, alteration or destruction. We may use software, secure socket layer technology (SSL) encryption, password protection, firewalls, internal restrictions and other security measures to help prevent unauthorized access to your personally identifiable information.' },
  { title: 'Contact Us', content: 'We welcome your comments or questions concerning our Privacy Policy. If you would like to contact VidyarthiMitra regarding this Privacy Policy, please contact us by emailing us at info@VidyarthiMitra.org, or at our latest address updated on our website.' },
  { title: 'Information Security', content: 'We take appropriate security measures to protect against unauthorized access to or unauthorized alteration, disclosure or destruction of data. We restrict access to your personally identifying information to employees who need to know that information in order to operate, develop or improve our services.' },
  { title: 'Updating Your Information', content: 'We provide mechanisms for updating and correcting your personally identifying information for many of our services.' },
  { title: 'Confidentiality and Security', content: 'We limit access to personal information about you to employees who we believe reasonably need to come into contact with that information to provide products or services to you or in order to do their jobs.\n\nWe have physical, electronic, and procedural safeguards that comply with the laws prevalent in India to protect personal information about you. We seek to ensure compliance with the requirements of the Information Technology Act, 2000 and Rules made there under to ensure the protection and preservation of your privacy.' },
];

export default function PrivacyPolicy() {
  return (
    <div className="bg-[#f8fafc] dark:bg-dark-bg min-h-screen">
      <Helmet>
        <title>Privacy Policy | Vidyarthi Mitra</title>
        <meta name="description" content="Read the Privacy Policy of Vidyarthi Mitra. Learn how we collect, use and protect your personal information." />
      </Helmet>

      {/* Hero */}
      <div className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary-dark/20 to-indigo-900/40" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-black uppercase tracking-widest mb-6">
              <Lock className="w-3.5 h-3.5 text-accent" /> Legal
            </span>
            <h1 className="text-4xl md:text-6xl font-serif font-black text-white">
              Privacy <span className="text-accent italic">Policy</span>
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
          {/* Intro */}
          <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-[15px]">{sections[0].intro}</p>

          {/* Sections */}
          {sections.slice(1).map((s) => (
            <div key={s.title} className="border-t border-slate-100 dark:border-white/5 pt-8">
              <h2 className="text-lg font-black text-primary uppercase tracking-wider mb-4">{s.title}</h2>
              <div className="space-y-4">
                {(s.content || '').split('\n\n').map((para, i) => (
                  <p key={i} className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-[15px]">{para}</p>
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
