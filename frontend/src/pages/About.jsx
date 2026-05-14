import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Rocket, TrendingUp, Award, Users, BookOpen, Globe } from 'lucide-react';

const teamMembers = [
  {
    name: 'Ravindra',
    role: 'Founder, Chairman & MD',
    qualifications: 'BE, MBA, MIE, GDMM',
    bio: [
      'Mr. Ravindra is a qualified Electrical Engineer from Walchand College of Engineering, a Government aided Autonomous engineering college in Maharashtra and an MBA graduate from India\'s then 3rd best (now in top 10) JBIMS, Mumbai. He has also completed a 2-year GDMM (Graduate Diploma in Materials Management) course. He is a MIE (Member of Institute of Engineers, India). He has an experience of more than 34 years of counselling students from all parts of Maharashtra and India. Most of the students counselled by him got enrolled into IITs, IIMs, top Medical Colleges and other prestigious colleges in India.',
      'He has an experience of counselling almost two generations of students. He has also guided them about entire admission procedure to Top Universities of USA, Canada, Europe, Australia, Singapore, Hong Kong and other major countries of the world. He has inculcated the habit of reading various English & Regional papers daily, since last 45 years, including weeklies & magazines like Employment News, India Today etc. He is well informed about all the national and international rankings of colleges, courses and streams.',
      'With the knowledge that he has acquired over the years, he has decided to aid the students all over the country by launching VidyarthiMitra.org and providing them the insight of current education scenario.',
    ],
    initial: 'R',
  },
  {
    name: 'Pawan Khamgaonkar',
    role: 'Head – Operations',
    qualifications: '',
    bio: [
      'Mr. Pawan is an avid enthusiast and a constant source of motivation. Along with being a resourceful and responsible Educational Researcher, he aims to bring positive change to the educational scenario in India and Abroad. He is known for his positive approach towards work and exceptional interpersonal communication skills. He is also recognized as one of the best team players with fast learning skills to adapt to diverse multicultural environment.',
      'During his days of teaching and guiding, he realized the dilemma students and parents face after entrance exams in choosing the best college, considering the number of colleges & universities available in Maharashtra. Thenceforth, he has contributed majorly in student-learning & educational development. He aspires to develop & identify creative educational resources in today\'s technological era and find meaningful interconnection that will help students to select colleges, courses, universities as per their interest, capacity, marks, category and other parameters and thus ease the admission process.',
    ],
    initial: 'P',
  },
];

const milestones = [
  { year: '1981–2014', label: 'Expert Advice', desc: 'More than 1 lakh students guided with data about various courses and careers.' },
  { year: '2015', label: 'Counselling Students', desc: 'Conducting seminars & one-on-one counselling all over India.' },
  { year: '2016', label: 'Inauguration', desc: 'By Hon. Shri Vinod Tawde, Minister of School, Higher & Technical Education, Maharashtra.' },
  { year: '2017', label: 'Launched Web Portal', desc: 'VidyarthiMitra.org — an extensive search engine for education, courses, colleges, cut-offs, scholarships, jobs & more.' },
  { year: '2018', label: 'Launched App & Aptitude Test', desc: 'Mobile application with college predictor based on cut-offs. Aptitude tests with counselling sessions.' },
  { year: '2019', label: 'Launched Online Mock Exam', desc: 'Mock exams for admission, MHT-CET, JEE and NEET. Huge response as Government converted all exams to online mode.' },
  { year: '2020', label: 'Free Online Mock Exams', desc: 'During the pandemic, VidyarthiMitra.org took initiative to conduct all free online exams and study classes across the state.' },
  { year: '2021', label: 'Career Assessment Test Portal', desc: 'VidyarthiMitra.org Career Assessment Test designed with the help of well-known senior professional psychologists & Artificial Intelligence.' },
];

const stats = [
  { icon: Users, value: '1L+', label: 'Students Counselled' },
  { icon: BookOpen, value: '700+', label: 'Universities Listed' },
  { icon: Globe, value: '35+', label: 'States Covered' },
  { icon: Award, value: '40+', label: 'Years of Experience' },
];

export default function About() {
  return (
    <div className="bg-[#f8fafc] dark:bg-dark-bg min-h-screen">
      <Helmet>
        <title>About Us | Vidyarthi Mitra – Our Mission, Team & Story</title>
        <meta name="description" content="Learn about Vidyarthi Mitra — India's trusted education portal. Our mission, vision, founding team, and milestones since 1981." />
      </Helmet>

      {/* Hero */}
      <div className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary-dark/20 to-indigo-900/40" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(99,102,241,0.12) 0%, transparent 55%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 py-28 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-black uppercase tracking-widest mb-6">
              <Rocket className="w-3.5 h-3.5 text-accent" /> Est. 1981
            </span>
            <h1 className="text-5xl md:text-7xl font-serif font-black text-white mb-4">
              About <span className="text-accent italic">Vidyarthi Mitra</span>
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mx-auto font-medium leading-relaxed">
              India's most trusted education platform — empowering students with precise, authentic, and up-to-date information on courses, colleges, admissions, and careers.
            </p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#f8fafc] dark:from-dark-bg to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16 space-y-24">

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((s) => (
            <div key={s.label} className="bg-white dark:bg-dark-card rounded-[2rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm text-center group hover:-translate-y-1 transition-transform">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <s.icon className="w-7 h-7 text-primary" />
              </div>
              <p className="text-3xl font-serif font-black text-slate-900 dark:text-white mb-1">{s.value}</p>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* About Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white dark:bg-dark-card rounded-[3rem] p-10 md:p-16 border border-slate-100 dark:border-white/5 shadow-sm"
        >
          <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-8">
            About <span className="text-primary">VidyarthiMitra.org</span>
          </h2>
          <div className="space-y-5 text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-[15px]">
            <p>
              <span className="text-primary font-bold">VidyarthiMitra.org</span> is a search engine for precise, authentic, and up-to-date information on education, skills, and careers. We cover everything from Courses, Schools, and Colleges to admission procedures, Entrance Exams, College &amp; Rank predictors, Govt. &amp; Private Scholarships &amp; Schemes, Education Loans, and Jobs, both in India and abroad.
            </p>
            <p>
              We believe that with the right guidance, every student can succeed. That's why VidyarthiMitra.org serves as a one-stop solution for students and parents seeking the latest educational and career information. Our platform is designed to help you secure admission to top colleges, careers, or courses that align with your aspirations.
            </p>
            <p>
              Our comprehensive services include <strong>Option Form Filling Assistance</strong> for courses like BE/BTech, BPharm, MBBS, BDS, BAMS, BHMS, MBA, and more. <strong>Admission Guidance</strong> with insights on cut-offs and required documents. <strong>Regular Updates</strong> on admission schedules, and <strong>Post-Admission Support</strong> including help with hostel arrangements and classes in Nominal Fees. We also offer <strong>Counselling &amp; Information</strong> from KG to PG, <strong>Career Aptitude Tests &amp; Mock Exams</strong>, <strong>Job &amp; Skill Training</strong>, and <strong>Study Abroad Guidance</strong>.
            </p>
            <p>
              Additionally, we are proud to introduce our <strong>Career Book</strong> and <strong>E-Paper</strong>, designed to benefit the student community by providing valuable insights and information on career planning and opportunities.
            </p>
            <p className="text-sm text-slate-400 italic">
              www.vidyarthimitra.org is the property of <span className="font-bold text-primary">Sankshemam Foundation &amp; Sankshemam Seva Private Ltd.</span>
            </p>
          </div>
        </motion.div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              icon: Rocket,
              title: 'MISSION',
              color: 'from-primary to-primary-dark',
              text: 'We believe to provide students, parents, teachers and all other interested segments of the society with the most authentic, precise and up-to-date information about education & career in India and Abroad — genuine educational updates, career counselling and unmitigated news — thereby empowering them to make wiser decisions.',
            },
            {
              icon: TrendingUp,
              title: 'VISION',
              color: 'from-accent to-yellow-500',
              text: 'We aim to transform the current educational scenario and to empower students to reach their maximum potential and make lifelong, responsible and meaningful career choices in a global and dynamic world.',
            },
          ].map((item) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className={`bg-gradient-to-br ${item.color} rounded-[3rem] p-10 md:p-12 text-white shadow-xl`}
            >
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
                <item.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-serif font-black uppercase tracking-widest mb-5">{item.title}</h3>
              <p className="text-white/85 font-medium leading-relaxed text-[15px]">{item.text}</p>
            </motion.div>
          ))}
        </div>

        {/* Our Team */}
        <div>
          <div className="text-center mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest mb-4">The People Behind It</span>
            <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-white">
              Our <span className="text-primary italic">Team</span>
            </h2>
          </div>

          <div className="space-y-10">
            {teamMembers.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}
                className="bg-white dark:bg-dark-card rounded-[3rem] p-10 md:p-14 border border-slate-100 dark:border-white/5 shadow-sm"
              >
                <div className="flex flex-col md:flex-row gap-10">
                  {/* Avatar */}
                  <div className="shrink-0 flex flex-col items-center gap-4">
                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-xl shadow-primary/30">
                      <span className="text-4xl font-serif font-black text-white">{member.initial}</span>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-lg text-slate-900 dark:text-white">{member.name}</p>
                      <p className="text-primary font-bold text-sm">{member.role}</p>
                      {member.qualifications && (
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{member.qualifications}</p>
                      )}
                    </div>
                  </div>
                  {/* Bio */}
                  <div className="space-y-4">
                    {member.bio.map((para, j) => (
                      <p key={j} className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-[15px]">{para}</p>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Milestones Timeline */}
        <div>
          <div className="text-center mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-accent/10 text-amber-600 text-xs font-black uppercase tracking-widest mb-4">Our Journey</span>
            <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-white">
              Milestones &amp; <span className="text-accent italic">Achievements</span>
            </h2>
          </div>

          <div className="relative">
            {/* Center line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary to-accent/20 -translate-x-1/2" />

            <div className="space-y-10">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.year}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                  className={`relative flex flex-col md:flex-row gap-6 items-center ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  {/* Card */}
                  <div className="w-full md:w-[45%] bg-white dark:bg-dark-card rounded-[2rem] p-7 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-lg transition-shadow">
                    <span className="inline-block px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-3">{m.label}</span>
                    <p className="text-slate-600 dark:text-slate-300 font-medium text-sm leading-relaxed">{m.desc}</p>
                  </div>

                  {/* Year bubble — center */}
                  <div className="shrink-0 z-10 w-20 h-20 rounded-full border-4 border-white dark:border-dark-bg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-xl shadow-primary/30 text-white font-black text-xs text-center leading-tight px-1">
                    {m.year}
                  </div>

                  {/* Spacer */}
                  <div className="hidden md:block w-[45%]" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
