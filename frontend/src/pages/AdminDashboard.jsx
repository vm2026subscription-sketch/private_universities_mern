import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Copy, FileText, GraduationCap, Newspaper, Plus, Search, ShieldCheck, Trash2, Upload, Users, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const adminTabs = ['Overview', 'Universities', 'Courses', 'Exams', 'News', 'Users'];

const emptyScholarship = () => ({ name: '', eligibility: '', amount: '', deadline: '', link: '', description: '' });
const emptyNewsLink = () => ({ title: '', url: '' });
const emptySpecialization = () => ({ name: '', seats: '', feesPerYear: '' });

const UNIVERSITY_TEMPLATES = {
  multidisciplinary: {
    description: 'A multidisciplinary university offering career-focused academics, campus facilities, and placement support.',
    highlightsText: 'Industry-aligned curriculum\nModern campus infrastructure\nCareer support and internships',
    facilitiesText: 'Library\nHostel\nSports Complex\nCafeteria\nLabs\nWiFi\nTransport',
    topRecruitersText: 'TCS\nInfosys\nWipro\nAccenture',
    admissions: {
      overview: 'Admissions are open for undergraduate and postgraduate programmes across multiple disciplines.',
      processText: 'Submit online application\nUpload required documents\nPay application fee\nAttend counselling or interview if applicable\nReceive admission confirmation',
      acceptedExamsText: 'CUET\nState CET\nUniversity Entrance Test',
      documentsRequiredText: '10th marksheet\n12th marksheet\nGraduation marksheet if applicable\nPhoto ID proof\nPassport size photographs',
    },
    campus: {
      overview: 'The campus offers academics, student life, hostel, transport, and support services in one place.',
      hostelDetails: 'Separate hostel facilities for boys and girls.',
      libraryDetails: 'Central library with print and digital resources.',
      labDetails: 'Modern labs for practical and research work.',
      sportsDetails: 'Indoor and outdoor sports facilities.',
      transportDetails: 'Transport support available from major city routes.',
      medicalSupport: 'Basic medical support and tie-up with nearby hospitals.',
      wifiAvailable: true,
    },
  },
  engineering: {
    description: 'An engineering-focused university known for technology programmes, labs, internships, and placements.',
    highlightsText: 'Strong engineering curriculum\nAdvanced labs and workshops\nPlacement-focused training',
    facilitiesText: 'Library\nHostel\nInnovation Lab\nCoding Labs\nWiFi\nTransport',
    topRecruitersText: 'TCS\nInfosys\nWipro\nCapgemini\nAccenture',
    admissions: {
      overview: 'Admissions are available for B.Tech, M.Tech, and allied technology programmes.',
      processText: 'Apply online\nSubmit PCM academic records\nUpload entrance exam score if required\nAttend counselling\nConfirm admission',
      acceptedExamsText: 'JEE Main\nState CET\nGATE',
      documentsRequiredText: '10th marksheet\n12th PCM marksheet\nEntrance exam scorecard\nPhoto ID proof',
    },
    campus: {
      overview: 'Campus is designed to support engineering academics, labs, project work, and student clubs.',
      hostelDetails: 'Hostel options available near academic blocks.',
      libraryDetails: 'Engineering journals, digital learning resources, and project references.',
      labDetails: 'Department labs, computer centres, and workshop spaces.',
      sportsDetails: 'Sports and club activities for student engagement.',
      transportDetails: 'Bus connectivity from nearby cities and towns.',
      medicalSupport: 'Medical room and emergency assistance available.',
      wifiAvailable: true,
    },
  },
  medical: {
    description: 'A health sciences university focused on clinical education, medical infrastructure, and hospital-linked training.',
    highlightsText: 'Hospital-linked training\nClinical exposure\nHealth sciences ecosystem',
    facilitiesText: 'Hospital\nLibrary\nHostel\nLabs\nWiFi\nMedical Support\nTransport',
    topRecruitersText: 'Hospital Networks\nDiagnostic Chains\nHealthcare Providers',
    admissions: {
      overview: 'Admissions are available for medical, nursing, pharmacy, and allied health programmes.',
      processText: 'Register online\nSubmit required academic documents\nUpload NEET or relevant scorecard\nAttend counselling\nComplete reporting formalities',
      acceptedExamsText: 'NEET UG\nNEET PG\nUniversity Entrance Test',
      documentsRequiredText: '10th marksheet\n12th PCB marksheet\nNEET scorecard\nPhoto ID proof\nCaste certificate if applicable',
    },
    campus: {
      overview: 'Campus combines academics with hospital, labs, library, hostel, and student support.',
      hostelDetails: 'Hostels are available with essential amenities for health sciences students.',
      libraryDetails: 'Medical library with journals, textbooks, and digital learning access.',
      labDetails: 'Clinical, pathology, nursing, and pharmacy labs.',
      sportsDetails: 'Basic sports and wellness facilities available.',
      transportDetails: 'Transport available for clinical and campus mobility.',
      medicalSupport: 'On-campus hospital and emergency care support.',
      wifiAvailable: true,
    },
  },
  management: {
    description: 'A management-focused university with emphasis on business education, industry exposure, and leadership development.',
    highlightsText: 'Industry-focused pedagogy\nCorporate guest sessions\nPlacement and internship support',
    facilitiesText: 'Library\nHostel\nSeminar Halls\nWiFi\nCafeteria\nTransport',
    topRecruitersText: 'Deloitte\nEY\nKPMG\nHDFC Bank\nICICI Bank',
    admissions: {
      overview: 'Admissions are open for BBA, MBA, and allied management programmes.',
      processText: 'Apply online\nSubmit academic documents\nUpload entrance score if applicable\nAttend GD/PI if required\nComplete fee payment',
      acceptedExamsText: 'CAT\nMAT\nCMAT\nCUET',
      documentsRequiredText: '10th marksheet\n12th marksheet\nGraduation marksheet if applicable\nEntrance exam scorecard\nPhoto ID proof',
    },
    campus: {
      overview: 'Campus is built around classrooms, seminar spaces, student activities, and placement support.',
      hostelDetails: 'Hostel accommodation available for outstation students.',
      libraryDetails: 'Management library with case studies and business databases.',
      labDetails: 'Computer labs for analytics and finance tools.',
      sportsDetails: 'Student clubs, events, and sports participation support.',
      transportDetails: 'Transport and city connectivity options available.',
      medicalSupport: 'Basic campus health support available.',
      wifiAvailable: true,
    },
  },
};

const UNIVERSITY_IMPORT_SAMPLE = `universityCode,name,type,state,city,establishedYear,naacGrade,nirfRank,description,logoUrl,bannerImageUrl,website,address,phone,email,ugcApproved,aicteApproved,nmcApproved,bciApproved,coaApproved,pciApproved,totalStudents,campusSizeAcres,avgPackageLPA,highestPackageLPA,placementPercentage,highlights,topRecruiters,facilities,admissionLink,brochureLink,placementReportLink,scholarshipLink,hostelLink,mapLink,admissionsOverview,admissionProcess,applicationStartDate,applicationEndDate,counsellingInfo,acceptedExams,documentsRequired,applicationFee,admissionsContactEmail,admissionsContactPhone,campusOverview,hostelDetails,libraryDetails,labDetails,sportsDetails,transportDetails,medicalSupport,wifiAvailable,virtualTourLink,galleryImages
PEOPLES_BHOPAL,People's University,private,Madhya Pradesh,Bhopal,2011,B++,,Health sciences and professional university.,https://logo.png,https://banner.png,https://example.com,"People's Campus, Bhopal",+91-755-4040400,admissions@example.com,TRUE,TRUE,TRUE,FALSE,FALSE,TRUE,6000,75,3.5,12,72,"Hospital-linked learning|Career support","TCS|Wipro|HCL","Library|Hostel|Labs|WiFi",https://example.com/apply,https://example.com/brochure,https://example.com/placements,https://example.com/scholarships,https://example.com/hostel,https://maps.google.com/...,"Admissions open for 2026","Apply online|Upload documents|Attend counselling",2026-03-01,2026-07-31,"Counselling updates will be shared on the portal","NEET UG|CUET","10th Marksheet|12th Marksheet|Photo ID",1500,admissions@example.com,+91-755-4040400,"Integrated campus environment","Separate hostels","Central library","Medical labs","Sports facilities","Bus facility","Hospital support",TRUE,https://example.com/virtual-tour,"https://img1.com|https://img2.com"`;

const COURSE_IMPORT_SAMPLE = `universityCode,courseName,category,durationYears,totalSeats,feesPerYear,eligibility,entranceExams,specializations,specializationSeats,specializationFeesPerYear
PEOPLES_BHOPAL,BBA,Management,3,90,150000,10+2 with 50%,"CUET","General|Finance","60|30","150000|160000"
PEOPLES_BHOPAL,MBA,Management,2,150,300000,Bachelor's with 50%,"CAT|MAT|CMAT","Marketing|Finance|HR","60|60|30","300000|320000|280000"`;

const createUniversityForm = () => ({
  universityCode: '',
  name: '',
  type: 'private',
  state: '',
  city: '',
  establishedYear: '',
  naacGrade: '',
  nirfRank: '',
  description: '',
  logoUrl: '',
  bannerImageUrl: '',
  website: '',
  address: '',
  phone: '',
  email: '',
  approvals: { ugc: false, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  stats: { totalStudents: '', campusSizeAcres: '', avgPackageLPA: '', highestPackageLPA: '', placementPercentage: '' },
  highlightsText: '',
  topRecruitersText: '',
  facilitiesText: '',
  links: { admissionLink: '', brochureLink: '', placementReportLink: '', scholarshipLink: '', hostelLink: '', mapLink: '' },
  admissions: {
    overview: '',
    processText: '',
    applicationStartDate: '',
    applicationEndDate: '',
    counsellingInfo: '',
    acceptedExamsText: '',
    documentsRequiredText: '',
    applicationFee: '',
    contactEmail: '',
    contactPhone: '',
  },
  campus: {
    overview: '',
    hostelDetails: '',
    libraryDetails: '',
    labDetails: '',
    sportsDetails: '',
    transportDetails: '',
    medicalSupport: '',
    wifiAvailable: false,
    virtualTourLink: '',
    galleryImagesText: '',
  },
  scholarships: [emptyScholarship()],
  newsLinks: [emptyNewsLink()],
});

const createCourseForm = () => ({
  universityId: '',
  name: '',
  category: 'Engineering',
  duration: '',
  totalSeats: '',
  feesPerYear: '',
  eligibility: '',
  entranceExamsText: '',
  specializations: [emptySpecialization()],
});

const createExamForm = () => ({
  name: '',
  shortName: '',
  conductingBody: '',
  examDate: '',
  registrationDeadline: '',
  eligibility: '',
  pattern: '',
  officialUrl: '',
  logoUrl: '',
  participatingUniversities: '',
  category: 'others',
});

const createNewsForm = () => ({
  title: '',
  summary: '',
  content: '',
  category: 'general',
  source: '',
  publishedAt: '',
  imageUrl: '',
  isFeatured: false,
  tagsText: '',
});

const contentLabels = {
  universities: 'University',
  courses: 'Course',
  exams: 'Exam',
  news: 'News article',
};

const splitLines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
const toNumberOrUndefined = (value) => value === '' ? undefined : Number(value);
const toDateOrUndefined = (value) => value || undefined;

const parseDelimitedLine = (line, delimiter) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, '').trim());
};

const parseSpreadsheetText = (text) => {
  const normalized = String(text || '').replace(/\r/g, '').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = parseDelimitedLine(lines[0], delimiter).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || '';
      return acc;
    }, {});
  }).filter((row) => Object.values(row).some(Boolean));
};

const convertUniversityToForm = (university) => ({
  universityCode: university.universityCode || '',
  name: university.name || '',
  type: university.type || 'private',
  state: university.state || '',
  city: university.city || '',
  establishedYear: university.establishedYear || '',
  naacGrade: university.naacGrade || '',
  nirfRank: university.nirfRank || '',
  description: university.description || '',
  logoUrl: university.logoUrl || '',
  bannerImageUrl: university.bannerImageUrl || '',
  website: university.website || '',
  address: university.address || '',
  phone: university.phone || '',
  email: university.email || '',
  approvals: {
    ugc: !!university.approvals?.ugc,
    aicte: !!university.approvals?.aicte,
    nmc: !!university.approvals?.nmc,
    bci: !!university.approvals?.bci,
    coa: !!university.approvals?.coa,
    pci: !!university.approvals?.pci,
  },
  stats: {
    totalStudents: university.stats?.totalStudents || '',
    campusSizeAcres: university.stats?.campusSizeAcres || '',
    avgPackageLPA: university.stats?.avgPackageLPA || '',
    highestPackageLPA: university.stats?.highestPackageLPA || '',
    placementPercentage: university.stats?.placementPercentage || '',
  },
  highlightsText: (university.highlights || []).join('\n'),
  topRecruitersText: (university.topRecruiters || []).join('\n'),
  facilitiesText: (university.facilities || []).join('\n'),
  links: {
    admissionLink: university.links?.admissionLink || '',
    brochureLink: university.links?.brochureLink || '',
    placementReportLink: university.links?.placementReportLink || '',
    scholarshipLink: university.links?.scholarshipLink || '',
    hostelLink: university.links?.hostelLink || '',
    mapLink: university.links?.mapLink || '',
  },
  admissions: {
    overview: university.admissions?.overview || '',
    processText: (university.admissions?.process || []).join('\n'),
    applicationStartDate: university.admissions?.applicationStartDate ? new Date(university.admissions.applicationStartDate).toISOString().slice(0, 10) : '',
    applicationEndDate: university.admissions?.applicationEndDate ? new Date(university.admissions.applicationEndDate).toISOString().slice(0, 10) : '',
    counsellingInfo: university.admissions?.counsellingInfo || '',
    acceptedExamsText: (university.admissions?.acceptedExams || []).join('\n'),
    documentsRequiredText: (university.admissions?.documentsRequired || []).join('\n'),
    applicationFee: university.admissions?.applicationFee || '',
    contactEmail: university.admissions?.contactEmail || '',
    contactPhone: university.admissions?.contactPhone || '',
  },
  campus: {
    overview: university.campus?.overview || '',
    hostelDetails: university.campus?.hostelDetails || '',
    libraryDetails: university.campus?.libraryDetails || '',
    labDetails: university.campus?.labDetails || '',
    sportsDetails: university.campus?.sportsDetails || '',
    transportDetails: university.campus?.transportDetails || '',
    medicalSupport: university.campus?.medicalSupport || '',
    wifiAvailable: !!university.campus?.wifiAvailable,
    virtualTourLink: university.campus?.virtualTourLink || '',
    galleryImagesText: (university.campus?.galleryImages || []).join('\n'),
  },
  scholarships: university.scholarships?.length ? university.scholarships.map((item) => ({
    name: item.name || '',
    eligibility: item.eligibility || '',
    amount: item.amount || '',
    deadline: item.deadline ? new Date(item.deadline).toISOString().slice(0, 10) : '',
    link: item.link || '',
    description: item.description || '',
  })) : [emptyScholarship()],
  newsLinks: university.newsLinks?.length ? university.newsLinks.map((item) => ({
    title: item.title || '',
    url: item.url || '',
  })) : [emptyNewsLink()],
});

const convertUniversityPayload = (form) => ({
  universityCode: form.universityCode || undefined,
  name: form.name,
  type: form.type,
  state: form.state,
  city: form.city,
  establishedYear: toNumberOrUndefined(form.establishedYear),
  naacGrade: form.naacGrade || undefined,
  nirfRank: toNumberOrUndefined(form.nirfRank),
  description: form.description,
  logoUrl: form.logoUrl || undefined,
  bannerImageUrl: form.bannerImageUrl || undefined,
  website: form.website || undefined,
  address: form.address || undefined,
  phone: form.phone || undefined,
  email: form.email || undefined,
  approvals: { ...form.approvals },
  stats: {
    totalStudents: toNumberOrUndefined(form.stats.totalStudents),
    campusSizeAcres: toNumberOrUndefined(form.stats.campusSizeAcres),
    avgPackageLPA: toNumberOrUndefined(form.stats.avgPackageLPA),
    highestPackageLPA: toNumberOrUndefined(form.stats.highestPackageLPA),
    placementPercentage: toNumberOrUndefined(form.stats.placementPercentage),
  },
  highlights: splitLines(form.highlightsText),
  topRecruiters: splitLines(form.topRecruitersText),
  facilities: splitLines(form.facilitiesText),
  links: { ...form.links },
  admissions: {
    overview: form.admissions.overview || undefined,
    process: splitLines(form.admissions.processText),
    applicationStartDate: toDateOrUndefined(form.admissions.applicationStartDate),
    applicationEndDate: toDateOrUndefined(form.admissions.applicationEndDate),
    counsellingInfo: form.admissions.counsellingInfo || undefined,
    acceptedExams: splitLines(form.admissions.acceptedExamsText),
    documentsRequired: splitLines(form.admissions.documentsRequiredText),
    applicationFee: toNumberOrUndefined(form.admissions.applicationFee),
    contactEmail: form.admissions.contactEmail || undefined,
    contactPhone: form.admissions.contactPhone || undefined,
  },
  campus: {
    overview: form.campus.overview || undefined,
    hostelDetails: form.campus.hostelDetails || undefined,
    libraryDetails: form.campus.libraryDetails || undefined,
    labDetails: form.campus.labDetails || undefined,
    sportsDetails: form.campus.sportsDetails || undefined,
    transportDetails: form.campus.transportDetails || undefined,
    medicalSupport: form.campus.medicalSupport || undefined,
    wifiAvailable: !!form.campus.wifiAvailable,
    virtualTourLink: form.campus.virtualTourLink || undefined,
    galleryImages: splitLines(form.campus.galleryImagesText),
  },
  scholarships: form.scholarships
    .filter((item) => item.name || item.eligibility || item.amount || item.link || item.description || item.deadline)
    .map((item) => ({
      name: item.name || undefined,
      eligibility: item.eligibility || undefined,
      amount: item.amount || undefined,
      deadline: toDateOrUndefined(item.deadline),
      link: item.link || undefined,
      description: item.description || undefined,
    })),
  newsLinks: form.newsLinks
    .filter((item) => item.title || item.url)
    .map((item) => ({ title: item.title || undefined, url: item.url || undefined })),
});

const convertCourseToForm = (course) => ({
  universityId: course.universityId?._id || course.universityId || '',
  name: course.name || '',
  category: course.category || 'Engineering',
  duration: course.duration || '',
  totalSeats: course.totalSeats || '',
  feesPerYear: course.feesPerYear || '',
  eligibility: course.eligibility || '',
  entranceExamsText: (course.entranceExams || []).join('\n'),
  specializations: course.specializations?.length ? course.specializations.map((item) => ({
    name: item.name || '',
    seats: item.seats || '',
    feesPerYear: item.feesPerYear || '',
  })) : [emptySpecialization()],
});

const convertCoursePayload = (form) => ({
  universityId: form.universityId,
  name: form.name,
  category: form.category,
  duration: toNumberOrUndefined(form.duration),
  totalSeats: toNumberOrUndefined(form.totalSeats),
  feesPerYear: toNumberOrUndefined(form.feesPerYear),
  eligibility: form.eligibility || undefined,
  entranceExams: splitLines(form.entranceExamsText),
  specializations: form.specializations
    .filter((item) => item.name || item.seats || item.feesPerYear)
    .map((item) => ({
      name: item.name || undefined,
      seats: toNumberOrUndefined(item.seats),
      feesPerYear: toNumberOrUndefined(item.feesPerYear),
    })),
});

const convertExamToForm = (exam) => ({
  name: exam.name || '',
  shortName: exam.shortName || '',
  conductingBody: exam.conductingBody || '',
  examDate: exam.examDate ? new Date(exam.examDate).toISOString().slice(0, 10) : '',
  registrationDeadline: exam.registrationDeadline ? new Date(exam.registrationDeadline).toISOString().slice(0, 10) : '',
  eligibility: exam.eligibility || '',
  pattern: exam.pattern || '',
  officialUrl: exam.officialUrl || '',
  logoUrl: exam.logoUrl || '',
  participatingUniversities: exam.participatingUniversities || '',
  category: exam.category || 'others',
});

const convertExamPayload = (form) => ({
  name: form.name,
  shortName: form.shortName || undefined,
  conductingBody: form.conductingBody || undefined,
  examDate: toDateOrUndefined(form.examDate),
  registrationDeadline: toDateOrUndefined(form.registrationDeadline),
  eligibility: form.eligibility || undefined,
  pattern: form.pattern || undefined,
  officialUrl: form.officialUrl || undefined,
  logoUrl: form.logoUrl || undefined,
  participatingUniversities: toNumberOrUndefined(form.participatingUniversities),
  category: form.category,
});

const convertNewsToForm = (article) => ({
  title: article.title || '',
  summary: article.summary || '',
  content: article.content || '',
  category: article.category || 'general',
  source: article.source || '',
  publishedAt: article.publishedAt ? new Date(article.publishedAt).toISOString().slice(0, 10) : '',
  imageUrl: article.imageUrl || '',
  isFeatured: !!article.isFeatured,
  tagsText: (article.tags || []).join('\n'),
});

const convertNewsPayload = (form) => ({
  title: form.title,
  summary: form.summary || undefined,
  content: form.content || undefined,
  category: form.category || undefined,
  source: form.source || undefined,
  publishedAt: toDateOrUndefined(form.publishedAt),
  imageUrl: form.imageUrl || undefined,
  isFeatured: !!form.isFeatured,
  tags: splitLines(form.tagsText),
});

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-2">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className={`input-field ${props.className || ''}`.trim()} />;
}

function TextArea(props) {
  return <textarea {...props} className={`input-field min-h-[110px] ${props.className || ''}`.trim()} />;
}

function ImportCard({ title, target, sample, bulkImport, onTextChange, onFileChange, onImport }) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-light-muted dark:text-dark-muted">
        Upload a CSV file exported from Excel, or paste rows copied directly from Excel/Google Sheets.
      </p>
      <div className="rounded-2xl bg-light-card dark:bg-dark-card p-4 text-xs overflow-x-auto">
        <pre>{sample}</pre>
      </div>
      <input
        type="file"
        accept=".csv,.txt"
        onChange={(event) => onFileChange(target, event.target.files?.[0])}
        className="block w-full text-sm"
      />
      {bulkImport.fileName && <p className="text-xs text-light-muted dark:text-dark-muted">Loaded file: {bulkImport.fileName}</p>}
      <Field label="Paste CSV / Excel rows">
        <TextArea value={bulkImport.text} onChange={(e) => onTextChange(target, e.target.value)} className="min-h-[180px]" />
      </Field>
      {bulkImport.rows.length > 0 && (
        <div className="rounded-2xl border border-light-border dark:border-dark-border p-4 text-sm">
          <p className="font-medium mb-2">Preview: {bulkImport.rows.length} rows ready</p>
          <div className="space-y-1 text-light-muted dark:text-dark-muted">
            {bulkImport.rows.slice(0, 3).map((row, index) => <p key={index}>{row.name || row.courseName || row.title || `Row ${index + 1}`}</p>)}
          </div>
        </div>
      )}
      <button type="button" onClick={() => onImport(target)} className="btn-primary" disabled={!bulkImport.rows.length}>Import Rows</button>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [content, setContent] = useState({ universities: [], courses: [], exams: [], news: [] });
  const [loading, setLoading] = useState(true);

  const [editingUniversityId, setEditingUniversityId] = useState(null);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editingExamId, setEditingExamId] = useState(null);
  const [editingNewsId, setEditingNewsId] = useState(null);

  const [universityForm, setUniversityForm] = useState(createUniversityForm());
  const [courseForm, setCourseForm] = useState(createCourseForm());
  const [examForm, setExamForm] = useState(createExamForm());
  const [newsForm, setNewsForm] = useState(createNewsForm());

  const [cloneSourceUniversityId, setCloneSourceUniversityId] = useState('');
  const [bulkImports, setBulkImports] = useState({
    universities: { text: '', rows: [], fileName: '' },
    courses: { text: '', rows: [], fileName: '' },
  });

  const [universitySearch, setUniversitySearch] = useState('');
  const [universityTypeFilter, setUniversityTypeFilter] = useState('all');
  const [universityStateFilter, setUniversityStateFilter] = useState('all');
  const [courseSearch, setCourseSearch] = useState('');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState('all');
  const [courseUniversityFilter, setCourseUniversityFilter] = useState('all');
  const [examSearch, setExamSearch] = useState('');
  const [examCategoryFilter, setExamCategoryFilter] = useState('all');
  const [newsSearch, setNewsSearch] = useState('');
  const [newsCategoryFilter, setNewsCategoryFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [dashboardResponse, usersResponse, contentResponse] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users'),
        api.get('/admin/content'),
      ]);
      setDashboard(dashboardResponse.data.data);
      setUsers(usersResponse.data.data || []);
      setContent(contentResponse.data.data || { universities: [], courses: [], exams: [], news: [] });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Admin data load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const universityStates = useMemo(() => [...new Set(content.universities.map((item) => item.state).filter(Boolean))].sort(), [content.universities]);
  const courseCategories = useMemo(() => [...new Set(content.courses.map((item) => item.category).filter(Boolean))].sort(), [content.courses]);
  const examCategories = useMemo(() => [...new Set(content.exams.map((item) => item.category).filter(Boolean))].sort(), [content.exams]);
  const newsCategories = useMemo(() => [...new Set(content.news.map((item) => item.category).filter(Boolean))].sort(), [content.news]);

  const filteredUniversities = useMemo(() => content.universities.filter((university) => {
    const matchesSearch = [university.name, university.universityCode, university.city, university.state].join(' ').toLowerCase().includes(universitySearch.toLowerCase());
    const matchesType = universityTypeFilter === 'all' || university.type === universityTypeFilter;
    const matchesState = universityStateFilter === 'all' || university.state === universityStateFilter;
    return matchesSearch && matchesType && matchesState;
  }), [content.universities, universitySearch, universityTypeFilter, universityStateFilter]);

  const filteredCourses = useMemo(() => content.courses.filter((course) => {
    const matchesSearch = [course.name, course.category, course.universityId?.name].join(' ').toLowerCase().includes(courseSearch.toLowerCase());
    const matchesCategory = courseCategoryFilter === 'all' || course.category === courseCategoryFilter;
    const matchesUniversity = courseUniversityFilter === 'all' || course.universityId?._id === courseUniversityFilter;
    return matchesSearch && matchesCategory && matchesUniversity;
  }), [content.courses, courseSearch, courseCategoryFilter, courseUniversityFilter]);

  const filteredExams = useMemo(() => content.exams.filter((exam) => {
    const matchesSearch = [exam.name, exam.shortName, exam.conductingBody].join(' ').toLowerCase().includes(examSearch.toLowerCase());
    const matchesCategory = examCategoryFilter === 'all' || exam.category === examCategoryFilter;
    return matchesSearch && matchesCategory;
  }), [content.exams, examSearch, examCategoryFilter]);

  const filteredNews = useMemo(() => content.news.filter((article) => {
    const matchesSearch = [article.title, article.source, article.summary].join(' ').toLowerCase().includes(newsSearch.toLowerCase());
    const matchesCategory = newsCategoryFilter === 'all' || article.category === newsCategoryFilter;
    return matchesSearch && matchesCategory;
  }), [content.news, newsSearch, newsCategoryFilter]);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const matchesSearch = [user.name, user.email].join(' ').toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
    return matchesSearch && matchesRole;
  }), [users, userSearch, userRoleFilter]);

  const updateUser = async (id, payload) => {
    try {
      await api.patch(`/admin/users/${id}`, payload);
      toast.success('User updated');
      loadAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'User update failed');
    }
  };

  const deleteQuestion = async (id) => {
    try {
      await api.delete(`/admin/questions/${id}`);
      toast.success('Question deleted');
      loadAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const updateUniversityField = (field, value) => setUniversityForm((current) => ({ ...current, [field]: value }));
  const updateUniversityNestedField = (section, field, value) => setUniversityForm((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  const updateUniversityApproval = (field, value) => setUniversityForm((current) => ({ ...current, approvals: { ...current.approvals, [field]: value } }));
  const updateUniversityStat = (field, value) => setUniversityForm((current) => ({ ...current, stats: { ...current.stats, [field]: value } }));
  const updateScholarship = (index, field, value) => setUniversityForm((current) => ({ ...current, scholarships: current.scholarships.map((item, i) => i === index ? { ...item, [field]: value } : item) }));
  const updateNewsLink = (index, field, value) => setUniversityForm((current) => ({ ...current, newsLinks: current.newsLinks.map((item, i) => i === index ? { ...item, [field]: value } : item) }));

  const updateCourseField = (field, value) => setCourseForm((current) => ({ ...current, [field]: value }));
  const updateCourseSpecialization = (index, field, value) => setCourseForm((current) => ({ ...current, specializations: current.specializations.map((item, i) => i === index ? { ...item, [field]: value } : item) }));

  const updateExamField = (field, value) => setExamForm((current) => ({ ...current, [field]: value }));
  const updateNewsField = (field, value) => setNewsForm((current) => ({ ...current, [field]: value }));

  const resetUniversityForm = () => {
    setEditingUniversityId(null);
    setCloneSourceUniversityId('');
    setUniversityForm(createUniversityForm());
  };

  const resetCourseForm = () => {
    setEditingCourseId(null);
    setCourseForm(createCourseForm());
  };

  const resetExamForm = () => {
    setEditingExamId(null);
    setExamForm(createExamForm());
  };

  const resetNewsForm = () => {
    setEditingNewsId(null);
    setNewsForm(createNewsForm());
  };

  const applyTemplate = (templateKey) => {
    const template = UNIVERSITY_TEMPLATES[templateKey];
    if (!template) return;

    setUniversityForm((current) => ({
      ...current,
      description: current.description || template.description,
      highlightsText: current.highlightsText || template.highlightsText,
      facilitiesText: current.facilitiesText || template.facilitiesText,
      topRecruitersText: current.topRecruitersText || template.topRecruitersText,
      admissions: {
        ...current.admissions,
        overview: current.admissions.overview || template.admissions.overview,
        processText: current.admissions.processText || template.admissions.processText,
        acceptedExamsText: current.admissions.acceptedExamsText || template.admissions.acceptedExamsText,
        documentsRequiredText: current.admissions.documentsRequiredText || template.admissions.documentsRequiredText,
      },
      campus: {
        ...current.campus,
        overview: current.campus.overview || template.campus.overview,
        hostelDetails: current.campus.hostelDetails || template.campus.hostelDetails,
        libraryDetails: current.campus.libraryDetails || template.campus.libraryDetails,
        labDetails: current.campus.labDetails || template.campus.labDetails,
        sportsDetails: current.campus.sportsDetails || template.campus.sportsDetails,
        transportDetails: current.campus.transportDetails || template.campus.transportDetails,
        medicalSupport: current.campus.medicalSupport || template.campus.medicalSupport,
        wifiAvailable: current.campus.wifiAvailable || template.campus.wifiAvailable,
      },
    }));

    toast.success('Template applied');
  };

  const cloneUniversity = () => {
    if (!cloneSourceUniversityId) return;
    const source = content.universities.find((item) => item._id === cloneSourceUniversityId);
    if (!source) return;

    const cloned = convertUniversityToForm(source);
    setEditingUniversityId(null);
    setUniversityForm({
      ...cloned,
      universityCode: '',
      name: '',
      state: '',
      city: '',
      logoUrl: '',
      bannerImageUrl: '',
      website: '',
      address: '',
      phone: '',
      email: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('University data cloned into the form');
  };

  const saveUniversity = async (event) => {
    event.preventDefault();
    try {
      const payload = convertUniversityPayload(universityForm);
      if (editingUniversityId) {
        await api.put(`/admin/universities/${editingUniversityId}`, payload);
        toast.success('University updated');
      } else {
        await api.post('/admin/universities', payload);
        toast.success('University created');
      }
      resetUniversityForm();
      loadAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save university');
    }
  };

  const saveCourse = async (event) => {
    event.preventDefault();
    try {
      const payload = convertCoursePayload(courseForm);
      if (editingCourseId) {
        await api.put(`/admin/courses/${editingCourseId}`, payload);
        toast.success('Course updated');
      } else {
        await api.post('/admin/courses', payload);
        toast.success('Course created');
      }
      resetCourseForm();
      loadAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save course');
    }
  };

  const saveExam = async (event) => {
    event.preventDefault();
    try {
      const payload = convertExamPayload(examForm);
      if (editingExamId) {
        await api.put(`/admin/exams/${editingExamId}`, payload);
        toast.success('Exam updated');
      } else {
        await api.post('/admin/exams', payload);
        toast.success('Exam created');
      }
      resetExamForm();
      loadAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save exam');
    }
  };

  const saveNews = async (event) => {
    event.preventDefault();
    try {
      const payload = convertNewsPayload(newsForm);
      if (editingNewsId) {
        await api.put(`/admin/news/${editingNewsId}`, payload);
        toast.success('News article updated');
      } else {
        await api.post('/admin/news', payload);
        toast.success('News article created');
      }
      resetNewsForm();
      loadAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save news article');
    }
  };

  const deleteContent = async (type, id) => {
    try {
      await api.delete(`/admin/${type}/${id}`);
      toast.success(`${contentLabels[type] || 'Item'} deleted`);
      loadAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const setImportText = (target, text) => {
    setBulkImports((current) => ({
      ...current,
      [target]: {
        ...current[target],
        text,
        rows: parseSpreadsheetText(text),
      },
    }));
  };

  const handleImportFile = async (target, file) => {
    if (!file) return;
    const text = await file.text();
    setBulkImports((current) => ({
      ...current,
      [target]: {
        text,
        rows: parseSpreadsheetText(text),
        fileName: file.name,
      },
    }));
  };

  const runBulkImport = async (target) => {
    const rows = bulkImports[target].rows;
    if (!rows.length) {
      toast.error('No rows ready for import');
      return;
    }

    try {
      const { data } = await api.post(`/admin/import/${target}`, { rows });
      toast.success(`Import complete: ${data.data.created} created, ${data.data.updated} updated, ${data.data.skipped} skipped`);
      setBulkImports((current) => ({ ...current, [target]: { text: '', rows: [], fileName: '' } }));
      loadAdminData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12">Loading admin dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-20 md:pb-12 space-y-8">
      <div>
        <span className="badge badge-orange mb-4 inline-flex">Admin Only</span>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Website Control Panel</h1>
        <p className="text-light-muted dark:text-dark-muted">
          Manage content, import bulk data, search through records, and use templates to fill full university profiles faster.
        </p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Object.entries(dashboard?.stats || {}).map(([key, value]) => (
          <div key={key} className="card p-5">
            <p className="text-sm capitalize text-light-muted dark:text-dark-muted">{key}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap gap-3">
        {adminTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === tab ? 'bg-primary text-white' : 'bg-light-card dark:bg-dark-card hover:bg-primary-50 dark:hover:bg-dark-border'}`}
          >
            {tab}
          </button>
        ))}
      </section>

      {activeTab === 'Overview' && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Recent Questions</h2>
              </div>
              <div className="space-y-4">
                {(dashboard?.recentQuestions || []).map((question) => (
                  <div key={question._id} className="border border-light-border dark:border-dark-border rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{question.title}</p>
                        <p className="text-sm text-light-muted dark:text-dark-muted">{question.userId?.name || 'Student'} | {question.category || 'general'}</p>
                        <p className="text-xs text-light-muted dark:text-dark-muted mt-1">{question.answers?.length || 0} answers</p>
                      </div>
                      <button onClick={() => deleteQuestion(question._id)} className="text-error hover:underline inline-flex items-center gap-1 text-sm">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-5">Recent News</h2>
              <div className="space-y-3">
                {(dashboard?.recentNews || []).map((article) => (
                  <div key={article._id} className="border border-light-border dark:border-dark-border rounded-2xl p-4">
                    <p className="font-medium">{article.title}</p>
                    <p className="text-sm text-light-muted dark:text-dark-muted">{article.source || 'Vidyarthi Mitra'} | {article.category || 'general'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-5">Content Readiness</h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-light-card dark:bg-dark-card px-4 py-3"><span>Universities</span><span className="font-semibold">{content.universities.length}</span></div>
                <div className="flex items-center justify-between rounded-2xl bg-light-card dark:bg-dark-card px-4 py-3"><span>Courses</span><span className="font-semibold">{content.courses.length}</span></div>
                <div className="flex items-center justify-between rounded-2xl bg-light-card dark:bg-dark-card px-4 py-3"><span>Exams</span><span className="font-semibold">{content.exams.length}</span></div>
                <div className="flex items-center justify-between rounded-2xl bg-light-card dark:bg-dark-card px-4 py-3"><span>News Articles</span><span className="font-semibold">{content.news.length}</span></div>
              </div>
            </div>
            <ImportCard
              title="Bulk University Import"
              target="universities"
              sample={UNIVERSITY_IMPORT_SAMPLE}
              bulkImport={bulkImports.universities}
              onTextChange={setImportText}
              onFileChange={handleImportFile}
              onImport={runBulkImport}
            />
          </div>
        </section>
      )}

      {activeTab === 'Universities' && (
        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8">
          <form onSubmit={saveUniversity} className="card p-6 space-y-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{editingUniversityId ? 'Edit University' : 'Create University'}</h2>
                <p className="text-sm text-light-muted dark:text-dark-muted mt-1">Use templates or clone an existing university to create complete profiles faster.</p>
              </div>
              {editingUniversityId && <button type="button" onClick={resetUniversityForm} className="btn-outline text-sm">Reset</button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-light-card dark:bg-dark-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">Quick Start Templates</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(UNIVERSITY_TEMPLATES).map((key) => (
                    <button key={key} type="button" onClick={() => applyTemplate(key)} className="px-3 py-2 rounded-xl bg-white dark:bg-dark-bg text-sm border border-light-border dark:border-dark-border">
                      {key.replace(/^\w/, (char) => char.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-light-card dark:bg-dark-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">Clone Existing University</p>
                </div>
                <select value={cloneSourceUniversityId} onChange={(e) => setCloneSourceUniversityId(e.target.value)} className="input-field">
                  <option value="">Select source university</option>
                  {content.universities.map((university) => <option key={university._id} value={university._id}>{university.name}</option>)}
                </select>
                <button type="button" onClick={cloneUniversity} className="btn-outline text-sm">Clone Into Form</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="University Code"><TextInput value={universityForm.universityCode} onChange={(e) => updateUniversityField('universityCode', e.target.value.toUpperCase())} placeholder="PEOPLES_BHOPAL" /></Field>
              <Field label="University Name"><TextInput value={universityForm.name} onChange={(e) => updateUniversityField('name', e.target.value)} required /></Field>
              <Field label="Type">
                <select value={universityForm.type} onChange={(e) => updateUniversityField('type', e.target.value)} className="input-field">
                  <option value="private">Private</option>
                  <option value="deemed">Deemed</option>
                </select>
              </Field>
              <Field label="State"><TextInput value={universityForm.state} onChange={(e) => updateUniversityField('state', e.target.value)} required /></Field>
              <Field label="City"><TextInput value={universityForm.city} onChange={(e) => updateUniversityField('city', e.target.value)} required /></Field>
              <Field label="Established Year"><TextInput type="number" value={universityForm.establishedYear} onChange={(e) => updateUniversityField('establishedYear', e.target.value)} /></Field>
              <Field label="NAAC Grade"><TextInput value={universityForm.naacGrade} onChange={(e) => updateUniversityField('naacGrade', e.target.value)} /></Field>
              <Field label="NIRF Rank"><TextInput type="number" value={universityForm.nirfRank} onChange={(e) => updateUniversityField('nirfRank', e.target.value)} /></Field>
              <Field label="Official Website"><TextInput value={universityForm.website} onChange={(e) => updateUniversityField('website', e.target.value)} /></Field>
              <Field label="Logo URL"><TextInput value={universityForm.logoUrl} onChange={(e) => updateUniversityField('logoUrl', e.target.value)} /></Field>
              <Field label="Banner Image URL"><TextInput value={universityForm.bannerImageUrl} onChange={(e) => updateUniversityField('bannerImageUrl', e.target.value)} /></Field>
              <Field label="Phone"><TextInput value={universityForm.phone} onChange={(e) => updateUniversityField('phone', e.target.value)} /></Field>
              <Field label="Email"><TextInput value={universityForm.email} onChange={(e) => updateUniversityField('email', e.target.value)} /></Field>
            </div>

            <Field label="Description"><TextArea value={universityForm.description} onChange={(e) => updateUniversityField('description', e.target.value)} /></Field>
            <Field label="Address"><TextArea value={universityForm.address} onChange={(e) => updateUniversityField('address', e.target.value)} /></Field>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Highlights (one per line)"><TextArea value={universityForm.highlightsText} onChange={(e) => updateUniversityField('highlightsText', e.target.value)} /></Field>
              <Field label="Facilities (one per line)"><TextArea value={universityForm.facilitiesText} onChange={(e) => updateUniversityField('facilitiesText', e.target.value)} /></Field>
              <Field label="Top Recruiters (one per line)"><TextArea value={universityForm.topRecruitersText} onChange={(e) => updateUniversityField('topRecruitersText', e.target.value)} /></Field>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Approvals</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {Object.entries(universityForm.approvals).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 rounded-xl bg-light-card dark:bg-dark-card px-3 py-2">
                    <input type="checkbox" checked={value} onChange={(e) => updateUniversityApproval(key, e.target.checked)} />
                    <span className="uppercase">{key}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                <Field label="Total Students"><TextInput type="number" value={universityForm.stats.totalStudents} onChange={(e) => updateUniversityStat('totalStudents', e.target.value)} /></Field>
                <Field label="Campus Size"><TextInput type="number" value={universityForm.stats.campusSizeAcres} onChange={(e) => updateUniversityStat('campusSizeAcres', e.target.value)} /></Field>
                <Field label="Avg Package"><TextInput type="number" value={universityForm.stats.avgPackageLPA} onChange={(e) => updateUniversityStat('avgPackageLPA', e.target.value)} /></Field>
                <Field label="Highest Package"><TextInput type="number" value={universityForm.stats.highestPackageLPA} onChange={(e) => updateUniversityStat('highestPackageLPA', e.target.value)} /></Field>
                <Field label="Placement %"><TextInput type="number" value={universityForm.stats.placementPercentage} onChange={(e) => updateUniversityStat('placementPercentage', e.target.value)} /></Field>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(universityForm.links).map(([key, value]) => (
                  <Field key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}>
                    <TextInput value={value} onChange={(e) => updateUniversityNestedField('links', key, e.target.value)} />
                  </Field>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Admissions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Admissions Overview"><TextArea value={universityForm.admissions.overview} onChange={(e) => updateUniversityNestedField('admissions', 'overview', e.target.value)} /></Field>
                <Field label="Admission Process (one step per line)"><TextArea value={universityForm.admissions.processText} onChange={(e) => updateUniversityNestedField('admissions', 'processText', e.target.value)} /></Field>
                <Field label="Application Start Date"><TextInput type="date" value={universityForm.admissions.applicationStartDate} onChange={(e) => updateUniversityNestedField('admissions', 'applicationStartDate', e.target.value)} /></Field>
                <Field label="Application End Date"><TextInput type="date" value={universityForm.admissions.applicationEndDate} onChange={(e) => updateUniversityNestedField('admissions', 'applicationEndDate', e.target.value)} /></Field>
                <Field label="Counselling Info"><TextArea value={universityForm.admissions.counsellingInfo} onChange={(e) => updateUniversityNestedField('admissions', 'counsellingInfo', e.target.value)} /></Field>
                <Field label="Accepted Exams (one per line)"><TextArea value={universityForm.admissions.acceptedExamsText} onChange={(e) => updateUniversityNestedField('admissions', 'acceptedExamsText', e.target.value)} /></Field>
                <Field label="Documents Required (one per line)"><TextArea value={universityForm.admissions.documentsRequiredText} onChange={(e) => updateUniversityNestedField('admissions', 'documentsRequiredText', e.target.value)} /></Field>
                <Field label="Application Fee"><TextInput type="number" value={universityForm.admissions.applicationFee} onChange={(e) => updateUniversityNestedField('admissions', 'applicationFee', e.target.value)} /></Field>
                <Field label="Admissions Contact Email"><TextInput value={universityForm.admissions.contactEmail} onChange={(e) => updateUniversityNestedField('admissions', 'contactEmail', e.target.value)} /></Field>
                <Field label="Admissions Contact Phone"><TextInput value={universityForm.admissions.contactPhone} onChange={(e) => updateUniversityNestedField('admissions', 'contactPhone', e.target.value)} /></Field>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Campus</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Campus Overview"><TextArea value={universityForm.campus.overview} onChange={(e) => updateUniversityNestedField('campus', 'overview', e.target.value)} /></Field>
                <Field label="Hostel Details"><TextArea value={universityForm.campus.hostelDetails} onChange={(e) => updateUniversityNestedField('campus', 'hostelDetails', e.target.value)} /></Field>
                <Field label="Library Details"><TextArea value={universityForm.campus.libraryDetails} onChange={(e) => updateUniversityNestedField('campus', 'libraryDetails', e.target.value)} /></Field>
                <Field label="Lab Details"><TextArea value={universityForm.campus.labDetails} onChange={(e) => updateUniversityNestedField('campus', 'labDetails', e.target.value)} /></Field>
                <Field label="Sports Details"><TextArea value={universityForm.campus.sportsDetails} onChange={(e) => updateUniversityNestedField('campus', 'sportsDetails', e.target.value)} /></Field>
                <Field label="Transport Details"><TextArea value={universityForm.campus.transportDetails} onChange={(e) => updateUniversityNestedField('campus', 'transportDetails', e.target.value)} /></Field>
                <Field label="Medical Support"><TextArea value={universityForm.campus.medicalSupport} onChange={(e) => updateUniversityNestedField('campus', 'medicalSupport', e.target.value)} /></Field>
                <Field label="Campus Gallery Image URLs (one per line)"><TextArea value={universityForm.campus.galleryImagesText} onChange={(e) => updateUniversityNestedField('campus', 'galleryImagesText', e.target.value)} /></Field>
                <Field label="Virtual Tour Link"><TextInput value={universityForm.campus.virtualTourLink} onChange={(e) => updateUniversityNestedField('campus', 'virtualTourLink', e.target.value)} /></Field>
              </div>
              <label className="flex items-center gap-2 mt-4 text-sm">
                <input type="checkbox" checked={universityForm.campus.wifiAvailable} onChange={(e) => updateUniversityNestedField('campus', 'wifiAvailable', e.target.checked)} />
                Wi-Fi Available
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Scholarships</h3>
                <button type="button" onClick={() => setUniversityForm((current) => ({ ...current, scholarships: [...current.scholarships, emptyScholarship()] }))} className="btn-outline text-sm inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Scholarship
                </button>
              </div>
              <div className="space-y-4">
                {universityForm.scholarships.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-light-border dark:border-dark-border p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Name"><TextInput value={item.name} onChange={(e) => updateScholarship(index, 'name', e.target.value)} /></Field>
                      <Field label="Amount"><TextInput value={item.amount} onChange={(e) => updateScholarship(index, 'amount', e.target.value)} /></Field>
                      <Field label="Eligibility"><TextArea value={item.eligibility} onChange={(e) => updateScholarship(index, 'eligibility', e.target.value)} /></Field>
                      <Field label="Description"><TextArea value={item.description} onChange={(e) => updateScholarship(index, 'description', e.target.value)} /></Field>
                      <Field label="Deadline"><TextInput type="date" value={item.deadline} onChange={(e) => updateScholarship(index, 'deadline', e.target.value)} /></Field>
                      <Field label="Apply Link"><TextInput value={item.link} onChange={(e) => updateScholarship(index, 'link', e.target.value)} /></Field>
                    </div>
                    {universityForm.scholarships.length > 1 && <button type="button" onClick={() => setUniversityForm((current) => ({ ...current, scholarships: current.scholarships.filter((_, i) => i !== index) }))} className="text-error text-sm mt-3">Remove Scholarship</button>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">News Links</h3>
                <button type="button" onClick={() => setUniversityForm((current) => ({ ...current, newsLinks: [...current.newsLinks, emptyNewsLink()] }))} className="btn-outline text-sm inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add News Link
                </button>
              </div>
              <div className="space-y-4">
                {universityForm.newsLinks.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-light-border dark:border-dark-border p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Title"><TextInput value={item.title} onChange={(e) => updateNewsLink(index, 'title', e.target.value)} /></Field>
                    <Field label="URL"><TextInput value={item.url} onChange={(e) => updateNewsLink(index, 'url', e.target.value)} /></Field>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary">{editingUniversityId ? 'Update University' : 'Create University'}</button>
          </form>

          <div className="space-y-6">
            <ImportCard
              title="Bulk University Import"
              target="universities"
              sample={UNIVERSITY_IMPORT_SAMPLE}
              bulkImport={bulkImports.universities}
              onTextChange={setImportText}
              onFileChange={handleImportFile}
              onImport={runBulkImport}
            />

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Manage Universities</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="relative md:col-span-2">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
                  <input value={universitySearch} onChange={(e) => setUniversitySearch(e.target.value)} placeholder="Search university, code, city..." className="input-field pl-11" />
                </div>
                <select value={universityTypeFilter} onChange={(e) => setUniversityTypeFilter(e.target.value)} className="input-field">
                  <option value="all">All types</option>
                  <option value="private">Private</option>
                  <option value="deemed">Deemed</option>
                </select>
                <select value={universityStateFilter} onChange={(e) => setUniversityStateFilter(e.target.value)} className="input-field md:col-span-3">
                  <option value="all">All states</option>
                  {universityStates.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
              </div>

              <div className="space-y-3 max-h-[900px] overflow-y-auto pr-1">
                {filteredUniversities.map((university) => (
                  <div key={university._id} className="border border-light-border dark:border-dark-border rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{university.name}</p>
                        <p className="text-sm text-light-muted dark:text-dark-muted">{university.city}, {university.state}</p>
                        {university.universityCode && <p className="text-xs text-light-muted dark:text-dark-muted mt-1">{university.universityCode}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setEditingUniversityId(university._id); setUniversityForm(convertUniversityToForm(university)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-3 py-2 rounded-xl bg-primary-50 text-primary text-sm font-medium">Edit</button>
                        <button type="button" onClick={() => deleteContent('universities', university._id)} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredUniversities.length === 0 && <p className="text-sm text-light-muted dark:text-dark-muted">No universities matched the current filters.</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'Courses' && (
        <section className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-8">
          <form onSubmit={saveCourse} className="card p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{editingCourseId ? 'Edit Course' : 'Create Course'}</h2>
                <p className="text-sm text-light-muted dark:text-dark-muted mt-1">Create course records mapped to a university with specializations, seats, and fees.</p>
              </div>
              {editingCourseId && <button type="button" onClick={resetCourseForm} className="btn-outline text-sm">Reset</button>}
            </div>
            <Field label="University">
              <select value={courseForm.universityId} onChange={(e) => updateCourseField('universityId', e.target.value)} className="input-field" required>
                <option value="">Select university</option>
                {content.universities.map((university) => <option key={university._id} value={university._id}>{university.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Course Name"><TextInput value={courseForm.name} onChange={(e) => updateCourseField('name', e.target.value)} required /></Field>
              <Field label="Category"><TextInput value={courseForm.category} onChange={(e) => updateCourseField('category', e.target.value)} required /></Field>
              <Field label="Duration (Years)"><TextInput type="number" value={courseForm.duration} onChange={(e) => updateCourseField('duration', e.target.value)} /></Field>
              <Field label="Total Seats"><TextInput type="number" value={courseForm.totalSeats} onChange={(e) => updateCourseField('totalSeats', e.target.value)} /></Field>
              <Field label="Fees Per Year"><TextInput type="number" value={courseForm.feesPerYear} onChange={(e) => updateCourseField('feesPerYear', e.target.value)} /></Field>
            </div>
            <Field label="Eligibility"><TextArea value={courseForm.eligibility} onChange={(e) => updateCourseField('eligibility', e.target.value)} /></Field>
            <Field label="Entrance Exams (one per line)"><TextArea value={courseForm.entranceExamsText} onChange={(e) => updateCourseField('entranceExamsText', e.target.value)} /></Field>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Specializations</h3>
                <button type="button" onClick={() => setCourseForm((current) => ({ ...current, specializations: [...current.specializations, emptySpecialization()] }))} className="btn-outline text-sm inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Specialization
                </button>
              </div>
              <div className="space-y-4">
                {courseForm.specializations.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-light-border dark:border-dark-border p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Name"><TextInput value={item.name} onChange={(e) => updateCourseSpecialization(index, 'name', e.target.value)} /></Field>
                    <Field label="Seats"><TextInput type="number" value={item.seats} onChange={(e) => updateCourseSpecialization(index, 'seats', e.target.value)} /></Field>
                    <Field label="Fees Per Year"><TextInput type="number" value={item.feesPerYear} onChange={(e) => updateCourseSpecialization(index, 'feesPerYear', e.target.value)} /></Field>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary">{editingCourseId ? 'Update Course' : 'Create Course'}</button>
          </form>

          <div className="space-y-6">
            <ImportCard
              title="Bulk Course Import"
              target="courses"
              sample={COURSE_IMPORT_SAMPLE}
              bulkImport={bulkImports.courses}
              onTextChange={setImportText}
              onFileChange={handleImportFile}
              onImport={runBulkImport}
            />

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Manage Courses</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="relative md:col-span-2">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
                  <input value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} placeholder="Search course or university..." className="input-field pl-11" />
                </div>
                <select value={courseCategoryFilter} onChange={(e) => setCourseCategoryFilter(e.target.value)} className="input-field">
                  <option value="all">All categories</option>
                  {courseCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <select value={courseUniversityFilter} onChange={(e) => setCourseUniversityFilter(e.target.value)} className="input-field">
                  <option value="all">All universities</option>
                  {content.universities.map((university) => <option key={university._id} value={university._id}>{university.name}</option>)}
                </select>
              </div>
              <div className="space-y-3 max-h-[780px] overflow-y-auto pr-1">
                {filteredCourses.map((course) => (
                  <div key={course._id} className="border border-light-border dark:border-dark-border rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{course.name}</p>
                        <p className="text-sm text-light-muted dark:text-dark-muted">{course.universityId?.name || 'University'} | {course.category}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setEditingCourseId(course._id); setCourseForm(convertCourseToForm(course)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-3 py-2 rounded-xl bg-primary-50 text-primary text-sm font-medium">Edit</button>
                        <button type="button" onClick={() => deleteContent('courses', course._id)} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCourses.length === 0 && <p className="text-sm text-light-muted dark:text-dark-muted">No courses matched the current filters.</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'Exams' && (
        <section className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-8">
          <form onSubmit={saveExam} className="card p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{editingExamId ? 'Edit Exam' : 'Create Exam'}</h2>
                <p className="text-sm text-light-muted dark:text-dark-muted mt-1">Manage exam pages, schedules, links, and eligibility details.</p>
              </div>
              {editingExamId && <button type="button" onClick={resetExamForm} className="btn-outline text-sm">Reset</button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Exam Name"><TextInput value={examForm.name} onChange={(e) => updateExamField('name', e.target.value)} required /></Field>
              <Field label="Short Name"><TextInput value={examForm.shortName} onChange={(e) => updateExamField('shortName', e.target.value)} /></Field>
              <Field label="Conducting Body"><TextInput value={examForm.conductingBody} onChange={(e) => updateExamField('conductingBody', e.target.value)} /></Field>
              <Field label="Category"><TextInput value={examForm.category} onChange={(e) => updateExamField('category', e.target.value)} /></Field>
              <Field label="Exam Date"><TextInput type="date" value={examForm.examDate} onChange={(e) => updateExamField('examDate', e.target.value)} /></Field>
              <Field label="Registration Deadline"><TextInput type="date" value={examForm.registrationDeadline} onChange={(e) => updateExamField('registrationDeadline', e.target.value)} /></Field>
              <Field label="Official URL"><TextInput value={examForm.officialUrl} onChange={(e) => updateExamField('officialUrl', e.target.value)} /></Field>
              <Field label="Logo URL"><TextInput value={examForm.logoUrl} onChange={(e) => updateExamField('logoUrl', e.target.value)} /></Field>
              <Field label="Participating Universities"><TextInput type="number" value={examForm.participatingUniversities} onChange={(e) => updateExamField('participatingUniversities', e.target.value)} /></Field>
            </div>
            <Field label="Eligibility"><TextArea value={examForm.eligibility} onChange={(e) => updateExamField('eligibility', e.target.value)} /></Field>
            <Field label="Pattern"><TextArea value={examForm.pattern} onChange={(e) => updateExamField('pattern', e.target.value)} /></Field>
            <button type="submit" className="btn-primary">{editingExamId ? 'Update Exam' : 'Create Exam'}</button>
          </form>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Manage Exams</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
                <input value={examSearch} onChange={(e) => setExamSearch(e.target.value)} placeholder="Search exam, short name, body..." className="input-field pl-11" />
              </div>
              <select value={examCategoryFilter} onChange={(e) => setExamCategoryFilter(e.target.value)} className="input-field md:col-span-2">
                <option value="all">All categories</option>
                {examCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {filteredExams.map((exam) => (
                <div key={exam._id} className="border border-light-border dark:border-dark-border rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{exam.name}</p>
                      <p className="text-sm text-light-muted dark:text-dark-muted">{exam.shortName || exam.category}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEditingExamId(exam._id); setExamForm(convertExamToForm(exam)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-3 py-2 rounded-xl bg-primary-50 text-primary text-sm font-medium">Edit</button>
                      <button type="button" onClick={() => deleteContent('exams', exam._id)} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredExams.length === 0 && <p className="text-sm text-light-muted dark:text-dark-muted">No exams matched the current filters.</p>}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'News' && (
        <section className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-8">
          <form onSubmit={saveNews} className="card p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{editingNewsId ? 'Edit News Article' : 'Create News Article'}</h2>
                <p className="text-sm text-light-muted dark:text-dark-muted mt-1">Publish and update home-page and listing-page news directly from admin.</p>
              </div>
              {editingNewsId && <button type="button" onClick={resetNewsForm} className="btn-outline text-sm">Reset</button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Title"><TextInput value={newsForm.title} onChange={(e) => updateNewsField('title', e.target.value)} required /></Field>
              <Field label="Category"><TextInput value={newsForm.category} onChange={(e) => updateNewsField('category', e.target.value)} /></Field>
              <Field label="Source"><TextInput value={newsForm.source} onChange={(e) => updateNewsField('source', e.target.value)} /></Field>
              <Field label="Published Date"><TextInput type="date" value={newsForm.publishedAt} onChange={(e) => updateNewsField('publishedAt', e.target.value)} /></Field>
              <Field label="Image URL"><TextInput value={newsForm.imageUrl} onChange={(e) => updateNewsField('imageUrl', e.target.value)} /></Field>
            </div>
            <Field label="Summary"><TextArea value={newsForm.summary} onChange={(e) => updateNewsField('summary', e.target.value)} /></Field>
            <Field label="Content"><TextArea value={newsForm.content} onChange={(e) => updateNewsField('content', e.target.value)} className="min-h-[180px]" /></Field>
            <Field label="Tags (one per line)"><TextArea value={newsForm.tagsText} onChange={(e) => updateNewsField('tagsText', e.target.value)} /></Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newsForm.isFeatured} onChange={(e) => updateNewsField('isFeatured', e.target.checked)} />
              Mark as featured
            </label>
            <button type="submit" className="btn-primary">{editingNewsId ? 'Update News' : 'Create News'}</button>
          </form>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Newspaper className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Manage News</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
                <input value={newsSearch} onChange={(e) => setNewsSearch(e.target.value)} placeholder="Search title, source, summary..." className="input-field pl-11" />
              </div>
              <select value={newsCategoryFilter} onChange={(e) => setNewsCategoryFilter(e.target.value)} className="input-field md:col-span-2">
                <option value="all">All categories</option>
                {newsCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {filteredNews.map((article) => (
                <div key={article._id} className="border border-light-border dark:border-dark-border rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{article.title}</p>
                      <p className="text-sm text-light-muted dark:text-dark-muted">{article.source || 'Vidyarthi Mitra'} | {article.category}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEditingNewsId(article._id); setNewsForm(convertNewsToForm(article)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-3 py-2 rounded-xl bg-primary-50 text-primary text-sm font-medium">Edit</button>
                      <button type="button" onClick={() => deleteContent('news', article._id)} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredNews.length === 0 && <p className="text-sm text-light-muted dark:text-dark-muted">No news matched the current filters.</p>}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'Users' && (
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">User Access Control</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search name or email..." className="input-field pl-11" />
            </div>
            <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} className="input-field">
              <option value="all">All roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user._id} className="border border-light-border dark:border-dark-border rounded-2xl p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-light-muted dark:text-dark-muted">{user.email}</p>
                    <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
                      Role: {user.role} | Verified: {user.isEmailVerified ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => updateUser(user._id, { role: user.role === 'admin' ? 'user' : 'admin' })} className="px-3 py-2 rounded-xl bg-primary-50 text-primary text-sm font-medium">
                      {user.role === 'admin' ? 'Make User' : 'Make Admin'}
                    </button>
                    <button onClick={() => updateUser(user._id, { isEmailVerified: !user.isEmailVerified })} className="px-3 py-2 rounded-xl bg-light-card dark:bg-dark-card text-sm font-medium">
                      {user.isEmailVerified ? 'Mark Unverified' : 'Mark Verified'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && <p className="text-sm text-light-muted dark:text-dark-muted">No users matched the current filters.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
