const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const University = require('../models/University');
const Course = require('../models/Course');
const AuditLog = require('../models/AuditLog');
const path = require('path');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

// ========== CLEANING FUNCTIONS ==========
function clean(val) {
  if (val === null || val === undefined) return null;
  // Normalize non-breaking / zero-width spaces that silently break matching.
  const s = String(val).replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ').trim();
  const nullish = new Set([
    '', '-', '—', 'n/a', 'na', 'nan', 'none', 'null',
    'not specified', 'not applicable', 'not ranked', 'tbd', 'tba',
    'not available', '#n/a', '#null!', 'nil', 'not accredited',
  ]);
  if (nullish.has(s.toLowerCase())) return null;
  return s;
}

function toBool(val) {
  const s = clean(val);
  if (!s) return false;
  return ['yes', 'true', '1', 'y', 'approved', '2(f)', '2(f) & 12(b)', '12(b)'].includes(s.toLowerCase());
}

function toNumber(val, opts = {}) {
  const s = clean(val);
  if (!s) return null;
  const lower = s.toLowerCase().replace(/,/g, '');
  const crore = lower.match(/([\d.]+)\s*(?:cr(?:ore)?)\b/);
  if (crore) return parseFloat(crore[1]) * 1e7;
  const lakh = lower.match(/([\d.]+)\s*(?:l(?:akh|ac)?)\b/);
  if (lakh) return parseFloat(lakh[1]) * 1e5;
  const stripped = lower.replace(/[₹$£€~+]/g, '').trim();
  const range = stripped.match(/^([\d.]+)\s*[-–to]\s*([\d.]+)/);
  if (range) {
    const lo = parseFloat(range[1]);
    const hi = parseFloat(range[2]);
    return opts.rangeMid ? Math.round((lo + hi) / 2) : lo;
  }
  const num = stripped.match(/[\d.]+/);
  if (num) {
    const n = parseFloat(num[0]);
    return isNaN(n) ? null : n;
  }
  return null;
}

function toInt(val, opts = {}) {
  const n = toNumber(val, opts);
  return n !== null ? Math.round(n) : null;
}

function toFloat(val, opts = {}) {
  const n = toNumber(val, opts);
  return n !== null ? n : null;
}

function toPackageLPA(val) {
  const s = clean(val);
  if (!s) return null;
  const lower = s.toLowerCase().replace(/,/g, '');
  const crore = lower.match(/([\d.]+)\s*cr/);
  if (crore) return parseFloat(crore[1]) * 100;
  const num = lower.match(/[\d.]+/);
  return num ? parseFloat(num[0]) : null;
}

function toNIRF(val) {
  const s = clean(val);
  if (!s) return null;
  const m = s.match(/\d+/);
  return m ? parseInt(m[0]) : null;
}

function toPercent(val) {
  const s = clean(val);
  if (!s) return null;
  const stripped = s.replace('%', '');
  const range = stripped.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (range) return parseFloat(range[1]);
  const m = stripped.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function toList(val, extraSeps = []) {
  const s = clean(val);
  if (!s) return [];
  const seps = ['\n', ';', '|', ...extraSeps];
  for (const sep of seps) {
    if (s.includes(sep)) {
      return [...new Set(s.split(sep).map(x => x.trim()).filter(Boolean))];
    }
  }
  const commaCount = (s.match(/,/g) || []).length;
  if (commaCount >= 1) {
    return [...new Set(s.split(',').map(x => x.trim()).filter(Boolean))];
  }
  return [s];
}

function toExamList(val) {
  const s = clean(val);
  if (!s) return [];
  return [...new Set(s.split(/[/,;\n|]/).map(x => x.trim()).filter(Boolean))];
}

function slugify(text) {
  if (!text) return null;
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Hands back a unique slug for each university name across the whole import,
// disambiguating distinct universities that would otherwise collide on the
// University.slug unique index. Seeded with slugs already in the database.
function makeSlugFactory(existingSlugs = []) {
  const taken = new Set(existingSlugs.filter(Boolean));
  return function uniqueSlug(name) {
    const base = slugify(name) || 'university';
    if (!taken.has(base)) { taken.add(base); return base; }
    let n = 2;
    let candidate = `${base}-${n}`;
    while (taken.has(candidate)) { n += 1; candidate = `${base}-${n}`; }
    taken.add(candidate);
    return candidate;
  };
}

const STATE_FIXES = {
  'maharastra': 'Maharashtra', 'maharashta': 'Maharashtra',
  'karnatka': 'Karnataka', 'karnata': 'Karnataka',
  'tamilnadu': 'Tamil Nadu', 'tamil-nadu': 'Tamil Nadu',
  'up': 'Uttar Pradesh', 'u.p': 'Uttar Pradesh',
  'mp': 'Madhya Pradesh', 'm.p': 'Madhya Pradesh',
  'ap': 'Andhra Pradesh', 'wb': 'West Bengal',
};

function normalizeState(val) {
  const s = clean(val);
  if (!s) return s;
  return STATE_FIXES[s.toLowerCase()] || s;
}

function classifyUniversity(segmentRaw, typeRaw) {
  const seg = (clean(segmentRaw) || '').toLowerCase();
  const typ = (clean(typeRaw) || '').toLowerCase();
  if (seg.includes('foreign') || typ.includes('foreign'))
    return { segment: 'foreign', institutionKind: null, type: 'foreign' };
  if (seg.includes('twinning') || typ.includes('twinning'))
    return { segment: 'twinning', institutionKind: null, type: 'twinning' };
  if (typ.includes('deemed') || seg.includes('deemed'))
    return { segment: 'normal', institutionKind: 'deemed', type: 'deemed' };
  return { segment: 'normal', institutionKind: 'private', type: 'private' };
}

const STREAM_CANONICAL = {
  'engineering': 'Engineering', 'technology': 'Engineering',
  'management': 'Management', 'business': 'Management',
  'commerce': 'Commerce', 'medical': 'Medical & Health Sciences',
  'pharmacy': 'Medical & Health Sciences', 'law': 'Law',
  'design': 'Design & Architecture', 'science': 'Science',
  'arts': 'Arts & Humanities', 'education': 'Education',
};

function canonicalStream(raw) {
  const c = clean(raw);
  if (!c) return 'Others';
  const lower = c.toLowerCase();
  for (const [key, val] of Object.entries(STREAM_CANONICAL)) {
    if (lower.includes(key)) return val;
  }
  return c || 'Others';
}

const LEVEL_MAP = {
  'ug': 'UG', 'undergraduate': 'UG', 'bachelor': 'UG',
  'pg': 'PG', 'postgraduate': 'PG', 'master': 'PG',
  'phd': 'PhD', 'doctorate': 'PhD',
  'diploma': 'Diploma', 'certificate': 'Certificate',
};

function canonicalLevel(raw) {
  const c = clean(raw);
  if (!c) return 'UG';
  const lower = c.toLowerCase().trim();
  for (const [key, val] of Object.entries(LEVEL_MAP)) {
    if (lower.startsWith(key) || lower === key) return val;
  }
  return c.trim().toUpperCase();
}

const DEFAULT_ELIGIBILITY = 'Check official brochure';

// ========== HEADER ALIAS MAPS ==========
// Canonical field -> accepted header labels (normalized lowercase). Add new
// variants here whenever a spreadsheet uses a different column name.
const UNI_ALIASES = {
  name: ['university name', 'name', 'college name', 'institution name', 'university/college name'],
  universityCode: ['university code', 'code', 'uni code'],
  segment: ['university segment', 'segment'],
  type: ['university type', 'type', 'institution type'],
  state: ['state'],
  city: ['city'],
  district: ['district'],
  address: ['full address', 'address'],
  establishedYear: ['established year', 'year established', 'establishment year', 'estd year', 'estd.', 'est. year'],
  naacGrade: ['naac grade', 'naac', 'naac accreditation'],
  nirfRank: ['nirf rank', 'nirf ranking', 'nirf'],
  website: ['website', 'official website', 'url'],
  logoUrl: ['logo url', 'logo'],
  bannerImageUrl: ['banner image url', 'banner'],
  description: ['description', 'about'],
  email: ['email', 'contact email'],
  phone: ['phone', 'contact phone', 'contact number'],
  totalStudents: ['total students'],
  campusAcres: ['campus acres', 'campus size'],
  avgPackage: ['avg package lpa', 'average package', 'avg package'],
  highestPackage: ['highest package lpa', 'highest package'],
  placement: ['placement %', 'placement percentage', 'placement'],
  highlights: ['highlights'],
  topRecruiters: ['top recruiters'],
  facilities: ['facilities'],
  admissionLink: ['admission link'],
  brochureLink: ['brochure link'],
  placementReportLink: ['placement report link'],
  scholarshipLink: ['scholarship link'],
  hostelLink: ['hostel link'],
  mapLink: ['map link'],
  approvalUGC: ['approval: ugc', 'ugc approval', 'ugc'],
  approvalAICTE: ['approval: aicte', 'aicte approval', 'aicte'],
  approvalNMC: ['approval: nmc', 'nmc approval', 'nmc'],
  approvalBCI: ['approval: bci', 'bci approval', 'bci'],
  approvalCOA: ['approval: coa', 'coa approval', 'coa'],
  approvalPCI: ['approval: pci', 'approval: ici', 'pci approval', 'pci'],
};

const COURSE_ALIASES = {
  universityName: ['university name', 'university', 'college name', 'institution name', 'college/university'],
  baseCourse: ['base course', 'course name', 'course', 'programme', 'program', 'programme name', 'program name'],
  specialization: ['specialization', 'specialisation', 'branch'],
  courseLevel: ['course level', 'degree level', 'level', 'programme level', 'program level'],
  stream: ['stream', 'discipline'],
  duration: ['duration (years)', 'duration', 'course duration', 'duration (yrs)'],
  totalSeats: ['total seats', 'seats', 'intake', 'sanctioned intake'],
  feesPerYear: ['fees per year', 'fee per year', 'annual fees', 'annual fee', 'fees/year', 'fees', 'tuition fee per year'],
  entranceExams: ['entrance exams', 'entrance exam', 'entrance test', 'exams accepted', 'accepted exams'],
  eligibility: ['eligibility', 'eligibility criteria'],
};

// ========== HEADER DETECTION (alias + score based) ==========

function normHeader(s) {
  return String(s == null ? '' : s)
    .replace(/[\u00A0\u200B\uFEFF]/g, ' ')
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// A "UI hint" cell looks like "UI: University Code" or "UI Course: Base Course".
function isHintCell(s) {
  const t = String(s == null ? '' : s).trim();
  return /^ui[:\s]/i.test(t);
}

function buildAliasLookup(aliasMap) {
  const lut = {};
  for (const field of Object.keys(aliasMap)) {
    for (const alias of aliasMap[field]) lut[alias] = field;
  }
  return lut;
}

function sheetToMatrix(sheet) {
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
  return raw.filter(r => Array.isArray(r) && r.some(v => v !== null && String(v).trim() !== ''));
}

// Pick the row that best matches the canonical aliases, ignoring UI-hint rows,
// title banners, and instruction rows. Returns the row index or -1.
function detectHeaderRow(rows, aliasMap) {
  const lut = buildAliasLookup(aliasMap);
  let best = { idx: -1, score: 0 };
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    const cells = row.map(c => String(c == null ? '' : c));
    const hintCount = cells.filter(isHintCell).length;
    if (hintCount >= 2) continue;
    const joined = cells.join(' ').toLowerCase();
    if (joined.includes('maps to the') || joined.includes('one row per')) continue;

    const matched = new Set();
    for (const c of cells) {
      const key = normHeader(c);
      if (lut[key]) matched.add(lut[key]);
    }
    if (matched.size > best.score) best = { idx: i, score: matched.size };
  }
  return best.score >= 2 ? best.idx : -1;
}

function buildFieldIndex(headerRow, aliasMap) {
  const lut = buildAliasLookup(aliasMap);
  const idx = {};
  headerRow.forEach((h, i) => {
    const key = normHeader(h);
    if (lut[key] && idx[lut[key]] === undefined) idx[lut[key]] = i;
  });
  return idx;
}

function cellAt(row, i) {
  if (i === undefined || i === null) return null;
  return row[i] === undefined ? null : row[i];
}

// ========== UNIVERSITY-NAME MATCHING ==========

// Normalize a university name into a comparison key so the same institution
// matches across sheets despite punctuation / "(ABBR)" / "The " differences.
function normNameKey(name) {
  return String(name || '')
    .replace(/[\u00A0\u200B\uFEFF]/g, ' ')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[.,\-–—'’"`]/g, ' ')
    .replace(/\b(the|of)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAbbr(name) {
  const m = String(name || '').match(/\(([A-Za-z][A-Za-z.&\s]{1,12})\)/);
  if (!m) return null;
  return m[1].replace(/[.\s]/g, '').toLowerCase();
}

const MIN_FUZZY_LEN = 5;

// Registry that indexes universities by several keys and resolves a name to a
// match with an explicit status: 'exact' | 'fuzzy' | 'ambiguous' | 'none'.
function createUniversityRegistry() {
  const byName = new Map();
  const byKey = new Map();
  const byAbbr = new Map();
  const byCode = new Map();
  const entries = []; // { key, uni } for containment scans

  function add(uni) {
    if (!uni || !uni.name) return;
    byName.set(uni.name.toLowerCase(), uni);
    const key = normNameKey(uni.name);
    if (key && !byKey.has(key)) entries.push({ key, uni });
    byKey.set(key, uni);
    const ab = extractAbbr(uni.name);
    if (ab) byAbbr.set(ab, uni);
    if (uni.universityCode) byCode.set(String(uni.universityCode).toLowerCase(), uni);
  }

  function resolve(rawName) {
    if (!rawName) return { uni: null, status: 'none' };
    const lower = rawName.toLowerCase();
    if (byName.has(lower)) return { uni: byName.get(lower), status: 'exact' };
    if (byCode.has(lower)) return { uni: byCode.get(lower), status: 'exact' };
    const key = normNameKey(rawName);
    if (key && byKey.has(key)) return { uni: byKey.get(key), status: 'exact' };
    const ab = extractAbbr(rawName);
    if (ab && byAbbr.has(ab)) return { uni: byAbbr.get(ab), status: 'exact' };

    // Containment fallback — only accept when exactly ONE candidate matches,
    // so a course is never silently attached to the wrong university.
    if (!key || key.length < MIN_FUZZY_LEN) return { uni: null, status: 'none' };
    const seen = new Set();
    const cands = [];
    for (const { key: k, uni } of entries) {
      if (!k || k.length < MIN_FUZZY_LEN) continue;
      const hit = k === key || k.includes(key) || key.includes(k);
      if (hit && !seen.has(uni)) { seen.add(uni); cands.push(uni); }
    }
    if (cands.length === 1) return { uni: cands[0], status: 'fuzzy' };
    if (cands.length > 1) return { uni: null, status: 'ambiguous', candidates: cands.map(c => c.name) };
    return { uni: null, status: 'none' };
  }

  // Backwards-compatible convenience: returns the matched uni or null.
  function find(rawName) {
    const r = resolve(rawName);
    return (r.status === 'exact' || r.status === 'fuzzy') ? r.uni : null;
  }

  return { add, resolve, find };
}

// ========== ROW PARSERS (index based) ==========

function parseUniversityRow(row, idx) {
  const name = clean(cellAt(row, idx.name));
  if (!name) return null;

  const { segment, institutionKind, type } = classifyUniversity(
    cellAt(row, idx.segment),
    cellAt(row, idx.type),
  );

  const code = clean(cellAt(row, idx.universityCode));

  const university = {
    name,
    slug: slugify(name),
    state: normalizeState(cellAt(row, idx.state)),
    city: clean(cellAt(row, idx.city)),
    segment,
    institutionKind,
    type,
    establishedYear: toInt(cellAt(row, idx.establishedYear)),
    naacGrade: clean(cellAt(row, idx.naacGrade)),
    nirfRank: toNIRF(cellAt(row, idx.nirfRank)),
    description: clean(cellAt(row, idx.description)),
    website: clean(cellAt(row, idx.website)),
    logoUrl: clean(cellAt(row, idx.logoUrl)),
    bannerImageUrl: clean(cellAt(row, idx.bannerImageUrl)),
    email: clean(cellAt(row, idx.email)),
    phone: clean(cellAt(row, idx.phone)),
    address: clean(cellAt(row, idx.address)),
    approvals: {
      ugc: toBool(cellAt(row, idx.approvalUGC)),
      aicte: toBool(cellAt(row, idx.approvalAICTE)),
      nmc: toBool(cellAt(row, idx.approvalNMC)),
      bci: toBool(cellAt(row, idx.approvalBCI)),
      coa: toBool(cellAt(row, idx.approvalCOA)),
      pci: toBool(cellAt(row, idx.approvalPCI)),
    },
    stats: {
      totalStudents: toInt(cellAt(row, idx.totalStudents)),
      campusSizeAcres: toFloat(cellAt(row, idx.campusAcres)),
      avgPackageLPA: toPackageLPA(cellAt(row, idx.avgPackage)),
      highestPackageLPA: toPackageLPA(cellAt(row, idx.highestPackage)),
      placementPercentage: toPercent(cellAt(row, idx.placement)),
      totalCoursesCount: 0,
      avgFees: null,
      rating: 0,
    },
    highlights: toList(cellAt(row, idx.highlights), ['/']),
    topRecruiters: toList(cellAt(row, idx.topRecruiters), ['/']),
    facilities: toList(cellAt(row, idx.facilities), ['/']),
    links: {
      admissionLink: clean(cellAt(row, idx.admissionLink)),
      brochureLink: clean(cellAt(row, idx.brochureLink)),
      placementReportLink: clean(cellAt(row, idx.placementReportLink)),
      scholarshipLink: clean(cellAt(row, idx.scholarshipLink)),
      hostelLink: clean(cellAt(row, idx.hostelLink)),
      mapLink: clean(cellAt(row, idx.mapLink)),
    },
    admissions: {},
    campus: {},
    scholarships: [],
    newsLinks: [],
    views: 0,
  };

  // Only set a code when present. Writing an explicit `null` collides on the
  // sparse-unique index as soon as two rows lack a code (e.g. UGC files).
  if (code) university.universityCode = code;

  return university;
}

function parseCourseRow(row, idx) {
  const base = clean(cellAt(row, idx.baseCourse));
  if (!base) return null;

  const uniName = clean(cellAt(row, idx.universityName));
  const spec = clean(cellAt(row, idx.specialization));
  const level = canonicalLevel(cellAt(row, idx.courseLevel));
  const stream = canonicalStream(cellAt(row, idx.stream));

  const fees = toInt(cellAt(row, idx.feesPerYear));
  const seats = toInt(cellAt(row, idx.totalSeats));

  const name = spec ? `${base} in ${spec}` : base;

  return {
    _universityName: uniName,
    name,
    category: level,
    stream,
    baseCourse: base,
    specializationName: spec,
    duration: clean(cellAt(row, idx.duration)),
    totalSeats: seats,
    feesPerYear: fees,
    entranceExams: toExamList(cellAt(row, idx.entranceExams)),
    eligibility: clean(cellAt(row, idx.eligibility)) || DEFAULT_ELIGIBILITY,
    specializations: spec ? [{ name: spec, seats, feesPerYear: fees }] : [],
  };
}

// ========== VALIDATION ==========
// A university is only invalid (skipped) when it has no name. Missing State/City
// no longer discards the record — it imports as a draft so nothing is lost.
function validateUniversity(data, index) {
  const errors = [];
  const warnings = [];
  let status;

  if (!data.name) {
    errors.push(`Row ${index + 1}: University Name is required`);
  } else {
    const missing = [];
    if (!data.state) missing.push('State');
    if (!data.city) missing.push('City');
    if (missing.length) {
      status = 'draft';
      warnings.push(`Row ${index + 1}: "${data.name}" imported as draft (missing ${missing.join(' & ')}) — complete it to publish`);
    }
  }

  if (data.establishedYear && (data.establishedYear < 1800 || data.establishedYear > new Date().getFullYear())) {
    warnings.push(`Row ${index + 1}: Unusual established year (${data.establishedYear}) for ${data.name}`);
  }

  return { isValid: errors.length === 0, errors, warnings, status };
}

function validateCourse(data, index, registry) {
  const errors = [];
  const warnings = [];
  if (!data._universityName) {
    errors.push(`Row ${index + 1}: University Name is required for course`);
  } else {
    const m = registry.resolve(data._universityName);
    if (m.status === 'ambiguous') {
      errors.push(`Row ${index + 1}: University "${data._universityName}" is ambiguous (matches ${m.candidates.join(', ')}) — needs review`);
    } else if (m.status === 'none') {
      errors.push(`Row ${index + 1}: University "${data._universityName}" not found`);
    }
  }
  if (!data.baseCourse) errors.push(`Row ${index + 1}: Base Course is required`);
  return { isValid: errors.length === 0, errors, warnings };
}

// ========== SHEET HELPERS ==========

function pickUniversitySheet(workbook) {
  return workbook.SheetNames.find(s => /universit|overview/i.test(s)) || null;
}
function pickCourseSheet(workbook) {
  return workbook.SheetNames.find(s => /course/i.test(s)) || null;
}

function detectSheetKind(sheetName, rows, uploadType) {
  if (uploadType === 'universities') return 'universities';
  if (uploadType === 'courses') return 'courses';
  const lower = (sheetName || '').toLowerCase();
  if (/course/.test(lower)) return 'courses';
  if (/universit|overview/.test(lower)) return 'universities';
  const uHdr = detectHeaderRow(rows, UNI_ALIASES);
  const cHdr = detectHeaderRow(rows, COURSE_ALIASES);
  if (cHdr !== -1 && uHdr === -1) return 'courses';
  if (uHdr !== -1 && cHdr === -1) return 'universities';
  if (cHdr !== -1) {
    const cIdx = buildFieldIndex(rows[cHdr], COURSE_ALIASES);
    if (cIdx.baseCourse !== undefined && cIdx.universityName !== undefined && cIdx.state === undefined) {
      return 'courses';
    }
  }
  return 'universities';
}

function parseSheet(rows, kind) {
  const aliasMap = kind === 'universities' ? UNI_ALIASES : COURSE_ALIASES;
  const headerRowIndex = detectHeaderRow(rows, aliasMap);
  if (headerRowIndex === -1) return { headerRowIndex: -1, idx: {}, dataRows: [] };
  const idx = buildFieldIndex(rows[headerRowIndex], aliasMap);
  const dataRows = rows.slice(headerRowIndex + 1);
  return { headerRowIndex, idx, dataRows };
}

function dupKeyField(err) {
  if (err && err.keyPattern) return Object.keys(err.keyPattern)[0] || '';
  const m = err && err.message && err.message.match(/index:\s+(\w+)/i);
  return m ? m[1] : '';
}

async function findExistingUniversity(u) {
  const or = [{ name: u.name }];
  if (u.universityCode) or.push({ universityCode: u.universityCode });
  return University.findOne({ $or: or });
}

// Persist one university. insertMany (not create) is used so the unique slug we
// computed survives — create() would let the model's pre-save hook overwrite it.
async function persistUniversity(u, mode, slugFactory) {
  const existing = await findExistingUniversity(u);
  if (existing) {
    if (mode !== 'upsert') return { action: 'skipped' };
    const doc = await University.findByIdAndUpdate(existing._id, { $set: u }, { new: true });
    return { action: 'updated', doc };
  }

  u.slug = slugFactory(u.name);
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const docs = await University.insertMany([u]);
      return { action: 'created', doc: docs[0] };
    } catch (err) {
      if (err && err.code === 11000) {
        const field = dupKeyField(err).toLowerCase();
        if (field.includes('code')) {
          return { action: 'skipped', error: `Duplicate university code "${u.universityCode}" — already used by another university` };
        }
        // slug collision: force a fresh unique slug and retry
        u.slug = slugFactory(u.name);
        continue;
      }
      throw err;
    }
  }
  return { action: 'skipped', error: `Could not generate a unique slug for "${u.name}"` };
}

async function persistCourse(course, university, mode) {
  const courseData = {
    universityId: university._id,
    name: course.name,
    category: course.category,
    stream: course.stream,
    baseCourse: course.baseCourse,
    specializationName: course.specializationName,
    duration: course.duration,
    totalSeats: course.totalSeats,
    feesPerYear: course.feesPerYear,
    entranceExams: course.entranceExams,
    eligibility: course.eligibility,
    specializations: course.specializations,
  };

  const existing = await Course.findOne({
    universityId: university._id,
    baseCourse: course.baseCourse,
    specializationName: course.specializationName,
  });

  if (existing) {
    if (mode !== 'upsert') return { action: 'skipped' };
    await Course.findByIdAndUpdate(existing._id, { $set: courseData });
    return { action: 'updated' };
  }

  try {
    await Course.create([courseData]);
    return { action: 'created' };
  } catch (err) {
    if (err && err.code === 11000) {
      return { action: 'skipped', error: `Duplicate course slug for "${course.name}" — skipped` };
    }
    throw err;
  }
}

async function loadExistingSlugs() {
  const docs = await University.find({}, 'slug');
  return docs.map(d => d.slug).filter(Boolean);
}

// ========== GET SHEET NAMES ==========
router.post('/sheets', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    res.json({ success: true, sheets: workbook.SheetNames });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PREVIEW ENDPOINT ==========
router.post('/preview', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = req.body.sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = sheetToMatrix(sheet);

    const kind = detectSheetKind(sheetName, rows, req.body.uploadType);
    const { headerRowIndex, idx, dataRows } = parseSheet(rows, kind);

    if (headerRowIndex === -1) {
      return res.status(400).json({ error: 'Could not detect header row' });
    }

    const existingUniversities = await University.find({}, 'name slug universityCode');
    const registry = createUniversityRegistry();
    existingUniversities.forEach(u => registry.add(u));

    let parsedData = [];
    let allErrors = [];
    let allWarnings = [];
    let validCount = 0;

    if (kind === 'universities') {
      for (let i = 0; i < dataRows.length; i++) {
        const university = parseUniversityRow(dataRows[i], idx);
        if (!university) continue;
        const validation = validateUniversity(university, i);
        parsedData.push({ ...university, _validation: validation });
        allErrors.push(...validation.errors);
        allWarnings.push(...validation.warnings);
        if (validation.isValid) validCount++;
        registry.add(university);
      }
    } else {
      for (let i = 0; i < dataRows.length; i++) {
        const course = parseCourseRow(dataRows[i], idx);
        if (!course) continue;
        const validation = validateCourse(course, i, registry);
        parsedData.push({ ...course, _validation: validation });
        allErrors.push(...validation.errors);
        allWarnings.push(...validation.warnings);
        if (validation.isValid) validCount++;
      }
    }

    res.json({
      success: true,
      sheetType: kind,
      totalRows: parsedData.length,
      validCount,
      invalidCount: parsedData.length - validCount,
      errors: [...new Set(allErrors)],
      warnings: [...new Set(allWarnings)],
      preview: parsedData.slice(0, 10),
      fullData: parsedData,
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== SINGLE SHEET CONFIRM ENDPOINT ==========
router.post('/confirm', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { mode = 'upsert', validateOnly = 'false', sheetName: reqSheetName, uploadType } = req.body;
    const shouldValidateOnly = validateOnly === 'true';

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    let sheetName = reqSheetName;
    if (!sheetName) {
      if (uploadType === 'universities') sheetName = pickUniversitySheet(workbook) || workbook.SheetNames[0];
      else if (uploadType === 'courses') sheetName = pickCourseSheet(workbook) || workbook.SheetNames[0];
      else sheetName = workbook.SheetNames[0];
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = sheetToMatrix(sheet);

    const kind = detectSheetKind(sheetName, rows, uploadType);
    const { headerRowIndex, idx, dataRows } = parseSheet(rows, kind);

    if (headerRowIndex === -1) {
      return res.status(400).json({ error: 'Could not detect header row' });
    }

    const existingUniversities = await University.find({}, 'name slug universityCode');
    const registry = createUniversityRegistry();
    existingUniversities.forEach(u => registry.add(u));
    const slugFactory = makeSlugFactory(await loadExistingSlugs());

    let results = { created: 0, updated: 0, skipped: 0, ambiguous: 0, warnings: [], errors: [] };
    let processedData = [];

    if (kind === 'universities') {
      for (let i = 0; i < dataRows.length; i++) {
        try {
          const university = parseUniversityRow(dataRows[i], idx);
          if (!university || !university.name || university.name.length < 2) {
            results.skipped++;
            continue;
          }

          const validation = validateUniversity(university, i);
          if (!validation.isValid) {
            results.skipped++;
            results.errors.push({ row: i, error: validation.errors.join(', ') });
            continue;
          }
          if (validation.status) university.status = validation.status;
          if (validation.warnings.length) results.warnings.push(...validation.warnings);

          if (shouldValidateOnly) {
            processedData.push(university);
            results.created++;
            registry.add(university);
            continue;
          }

          const { action, doc, error } = await persistUniversity(university, mode, slugFactory);
          if (action === 'created') results.created++;
          else if (action === 'updated') results.updated++;
          else { results.skipped++; if (error) results.errors.push({ row: i, error }); }
          if (doc) { processedData.push(doc); registry.add(doc); }
        } catch (err) {
          results.errors.push({ row: i, error: err.message });
          results.skipped++;
        }
      }
    } else {
      for (let i = 0; i < dataRows.length; i++) {
        try {
          const course = parseCourseRow(dataRows[i], idx);
          if (!course) {
            results.skipped++;
            continue;
          }

          const match = registry.resolve(course._universityName);
          if (match.status === 'ambiguous') {
            results.ambiguous++;
            results.skipped++;
            results.errors.push({ row: i, error: `Ambiguous university "${course._universityName}" (matches ${match.candidates.join(', ')}) — needs review` });
            continue;
          }
          if (!match.uni) {
            results.skipped++;
            results.errors.push({ row: i, error: `University "${course._universityName}" not found` });
            continue;
          }

          if (shouldValidateOnly) {
            processedData.push(course);
            results.created++;
            continue;
          }

          const { action, error } = await persistCourse(course, match.uni, mode);
          if (action === 'created') results.created++;
          else if (action === 'updated') results.updated++;
          else { results.skipped++; if (error) results.errors.push({ row: i, error }); }
        } catch (err) {
          results.errors.push({ row: i, error: err.message });
          results.skipped++;
        }
      }
    }

    if (!shouldValidateOnly) {
      const universitiesWithCourses = await Course.aggregate([
        { $group: { _id: '$universityId', count: { $sum: 1 } } },
      ]);
      for (const { _id, count } of universitiesWithCourses) {
        await University.findByIdAndUpdate(_id, { 'stats.totalCoursesCount': count });
      }

      try {
        await AuditLog.create([{
          userId: req.user._id,
          action: 'bulk_import',
          resource: kind,
          description: `Import: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
          changes: { before: null, after: { summary: results } },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }]);
      } catch (auditError) {
        console.error('Audit log creation failed:', auditError.message);
      }
    }

    res.json({
      success: true,
      mode: shouldValidateOnly ? 'validation' : 'import',
      sheetType: kind,
      results,
      processedCount: processedData.length,
      sampleData: processedData.slice(0, 5),
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== BULK UPLOAD - Process Both Universities and Courses Together ==========
router.post('/bulk', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const { mode = 'upsert' } = req.body;

    console.log(`\nExcel file loaded. Sheets found: ${workbook.SheetNames.join(', ')}`);

    let results = {
      universities: { created: 0, updated: 0, skipped: 0, warnings: [], errors: [] },
      courses: { created: 0, updated: 0, skipped: 0, ambiguous: 0, errors: [] },
    };

    const registry = createUniversityRegistry();
    const slugFactory = makeSlugFactory(await loadExistingSlugs());

    // ========== 1. PROCESS UNIVERSITIES SHEET ==========
    const uniSheetName = pickUniversitySheet(workbook);
    if (uniSheetName) {
      console.log(`\nProcessing Universities sheet: "${uniSheetName}"`);
      const rows = sheetToMatrix(workbook.Sheets[uniSheetName]);
      const { headerRowIndex, idx, dataRows } = parseSheet(rows, 'universities');

      if (headerRowIndex === -1) {
        console.log('   Could not find header row in Universities sheet');
      } else {
        console.log(`   Header row at index ${headerRowIndex}. Found ${dataRows.length} rows`);
        for (let i = 0; i < dataRows.length; i++) {
          try {
            const university = parseUniversityRow(dataRows[i], idx);
            if (!university || !university.name || university.name.length < 2) {
              results.universities.skipped++;
              continue;
            }

            const validation = validateUniversity(university, i);
            if (!validation.isValid) {
              results.universities.skipped++;
              results.universities.errors.push({ row: i, error: validation.errors.join(', ') });
              continue;
            }
            if (validation.status) university.status = validation.status;
            if (validation.warnings.length) results.universities.warnings.push(...validation.warnings);

            const { action, doc, error } = await persistUniversity(university, mode, slugFactory);
            if (action === 'created') results.universities.created++;
            else if (action === 'updated') results.universities.updated++;
            else { results.universities.skipped++; if (error) results.universities.errors.push({ row: i, error }); }
            if (doc) registry.add(doc);
          } catch (err) {
            results.universities.errors.push({ row: i, error: err.message });
            results.universities.skipped++;
          }
        }
      }
    } else {
      console.log('No Universities sheet found');
    }

    // Seed registry with ALL existing universities so courses can also match
    // institutions that were imported in earlier runs.
    const allUnis = await University.find({}, 'name universityCode');
    allUnis.forEach(u => registry.add(u));
    console.log(`   Registry seeded with ${allUnis.length} total universities`);

    // ========== 2. PROCESS COURSES SHEET ==========
    const courseSheetName = pickCourseSheet(workbook);
    if (courseSheetName) {
      console.log(`\nProcessing Courses sheet: "${courseSheetName}"`);
      const rows = sheetToMatrix(workbook.Sheets[courseSheetName]);
      const { headerRowIndex, idx, dataRows } = parseSheet(rows, 'courses');

      if (headerRowIndex === -1) {
        console.log('   Could not detect header row in Courses sheet. Skipping courses.');
      } else {
        console.log(`   Header row at index ${headerRowIndex}. Field map: ${JSON.stringify(idx)}`);
        let matchedCount = 0;
        let unmatchedCount = 0;
        const unmatchedExamples = [];

        for (let i = 0; i < dataRows.length; i++) {
          try {
            const course = parseCourseRow(dataRows[i], idx);
            if (!course) {
              results.courses.skipped++;
              continue;
            }

            const uniName = course._universityName;
            if (!uniName || uniName.length < 2) {
              results.courses.skipped++;
              continue;
            }

            const match = registry.resolve(uniName);
            if (match.status === 'ambiguous') {
              results.courses.ambiguous++;
              results.courses.skipped++;
              results.courses.errors.push({ row: i, error: `Ambiguous university "${uniName}" (matches ${match.candidates.join(', ')}) — needs review` });
              continue;
            }
            if (!match.uni) {
              unmatchedCount++;
              if (unmatchedExamples.length < 20) unmatchedExamples.push(uniName);
              results.courses.skipped++;
              continue;
            }

            matchedCount++;
            const { action, error } = await persistCourse(course, match.uni, mode);
            if (action === 'created') {
              results.courses.created++;
              if (results.courses.created <= 10) console.log(`   "${course.name}" → ${match.uni.name}`);
            } else if (action === 'updated') {
              results.courses.updated++;
            } else {
              results.courses.skipped++;
              if (error) results.courses.errors.push({ row: i, error });
            }
          } catch (err) {
            results.courses.errors.push({ row: i, error: err.message });
            results.courses.skipped++;
          }
        }

        console.log(`   Match results: ${matchedCount} matched, ${unmatchedCount} unmatched, ${results.courses.ambiguous} ambiguous`);
        if (unmatchedExamples.length > 0) {
          console.log('   First unmatched university names:');
          unmatchedExamples.slice(0, 10).forEach(name => console.log(`     - "${name}"`));
        }
      }
    } else {
      console.log('No Courses sheet found');
    }

    // ========== 3. UPDATE COURSE COUNTS ==========
    const universitiesWithCourses = await Course.aggregate([
      { $group: { _id: '$universityId', count: { $sum: 1 } } },
    ]);
    for (const { _id, count } of universitiesWithCourses) {
      await University.findByIdAndUpdate(_id, { 'stats.totalCoursesCount': count });
    }

    // ========== 4. AUDIT LOG ==========
    try {
      await AuditLog.create([{
        userId: req.user._id,
        action: 'bulk_import',
        resource: 'both',
        description: `Bulk import: Universities: ${results.universities.created} created, ${results.universities.updated} updated. Courses: ${results.courses.created} created, ${results.courses.updated} updated.`,
        changes: { before: null, after: { summary: results } },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }]);
      console.log('Audit log created');
    } catch (auditError) {
      console.error('Audit log creation failed:', auditError.message);
    }

    console.log('\nBULK IMPORT COMPLETE');
    console.log(`   Universities: ${results.universities.created} created, ${results.universities.updated} updated, ${results.universities.skipped} skipped`);
    console.log(`   Courses: ${results.courses.created} created, ${results.courses.updated} updated, ${results.courses.skipped} skipped`);

    res.json({
      success: true,
      results,
      message: `Universities: ${results.universities.created} created, ${results.universities.updated} updated. Courses: ${results.courses.created} created, ${results.courses.updated} updated.`,
      summary: {
        universities: { created: results.universities.created, updated: results.universities.updated, skipped: results.universities.skipped },
        courses: { created: results.courses.created, updated: results.courses.updated, skipped: results.courses.skipped, ambiguous: results.courses.ambiguous },
      },
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;