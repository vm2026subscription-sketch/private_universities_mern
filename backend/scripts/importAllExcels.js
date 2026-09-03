/**
 * Bulk import script — reads all state Excel files and inserts into MongoDB.
 * Usage: node scripts/importAllExcels.js
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const connectDB = require('../src/config/db');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

// ─── Reuse all parsing helpers from uploadExcel.js ───────────────────────
// (inlined to avoid router-level side effects)

const XLSX = require('xlsx');

function clean(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ').trim();
  const nullish = new Set(['', '-', '—', 'n/a', 'na', 'nan', 'none', 'null', 'not specified', 'not applicable', 'not ranked', 'tbd', 'tba', 'not available', '#n/a', '#null!', 'nil', 'not accredited']);
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
  if (range) return opts.rangeMid ? Math.round((parseFloat(range[1]) + parseFloat(range[2])) / 2) : parseFloat(range[1]);
  const num = stripped.match(/[\d.]+/);
  if (num) { const n = parseFloat(num[0]); return isNaN(n) ? null : n; }
  return null;
}

function toInt(val, opts = {}) { const n = toNumber(val, opts); return n !== null ? Math.round(n) : null; }
function toFloat(val, opts = {}) { return toNumber(val, opts); }
function toPackageLPA(val) {
  const s = clean(val); if (!s) return null;
  const lower = s.toLowerCase().replace(/,/g, '');
  const crore = lower.match(/([\d.]+)\s*cr/);
  if (crore) return parseFloat(crore[1]) * 100;
  const num = lower.match(/[\d.]+/);
  return num ? parseFloat(num[0]) : null;
}
function toNIRF(val) { const s = clean(val); if (!s) return null; const m = s.match(/\d+/); return m ? parseInt(m[0]) : null; }
function toPercent(val) { const s = clean(val); if (!s) return null; const stripped = s.replace('%', ''); const range = stripped.match(/([\d.]+)\s*[-–]\s*([\d.]+)/); if (range) return parseFloat(range[1]); const num = stripped.match(/[\d.]+/); return num ? parseFloat(num[0]) : null; }
function toList(val, extraSeps = []) {
  const s = clean(val); if (!s) return [];
  const seps = ['\n', ';', '|', ...extraSeps];
  for (const sep of seps) { if (s.includes(sep)) return [...new Set(s.split(sep).map(x => x.trim()).filter(Boolean))]; }
  const commaCount = (s.match(/,/g) || []).length;
  if (commaCount >= 1) return [...new Set(s.split(',').map(x => x.trim()).filter(Boolean))];
  return [s];
}
function toExamList(val) { const s = clean(val); if (!s) return []; return [...new Set(s.split(/[/,;\n|]/).map(x => x.trim()).filter(Boolean))]; }
function slugify(text) {
  if (!text) return null;
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}
function makeSlugFactory(existingSlugs = []) {
  const taken = new Set(existingSlugs.filter(Boolean));
  return function uniqueSlug(name) {
    const base = slugify(name) || 'university';
    if (!taken.has(base)) { taken.add(base); return base; }
    let n = 2; let candidate = `${base}-${n}`;
    while (taken.has(candidate)) { n++; candidate = `${base}-${n}`; }
    taken.add(candidate); return candidate;
  };
}
const STATE_FIXES = { 'maharastra': 'Maharashtra', 'maharashta': 'Maharashtra', 'karnatka': 'Karnataka', 'karnata': 'Karnataka', 'tamilnadu': 'Tamil Nadu', 'tamil-nadu': 'Tamil Nadu', 'up': 'Uttar Pradesh', 'u.p': 'Uttar Pradesh', 'mp': 'Madhya Pradesh', 'm.p': 'Madhya Pradesh', 'ap': 'Andhra Pradesh', 'wb': 'West Bengal' };
function normalizeState(val) { const s = clean(val); if (!s) return s; return STATE_FIXES[s.toLowerCase()] || s; }
function classifyUniversity(segmentRaw, typeRaw) {
  const seg = (clean(segmentRaw) || '').toLowerCase();
  const typ = (clean(typeRaw) || '').toLowerCase();
  if (seg.includes('foreign') || typ.includes('foreign')) return { segment: 'foreign', institutionKind: null, type: 'foreign' };
  if (seg.includes('twinning') || typ.includes('twinning')) return { segment: 'twinning', institutionKind: null, type: 'twinning' };
  if (typ.includes('deemed') || seg.includes('deemed')) return { segment: 'normal', institutionKind: 'deemed', type: 'deemed' };
  return { segment: 'normal', institutionKind: 'private', type: 'private' };
}
const STREAM_CANONICAL = { 'engineering': 'Engineering', 'technology': 'Engineering', 'management': 'Management', 'business': 'Management', 'commerce': 'Commerce', 'medical': 'Medical & Health Sciences', 'pharmacy': 'Medical & Health Sciences', 'law': 'Law', 'design': 'Design & Architecture', 'science': 'Science', 'arts': 'Arts & Humanities', 'education': 'Education' };
function canonicalStream(raw) { const c = clean(raw); if (!c) return 'Others'; const lower = c.toLowerCase(); for (const [key, val] of Object.entries(STREAM_CANONICAL)) { if (lower.includes(key)) return val; } return c || 'Others'; }
const LEVEL_MAP = { 'ug': 'UG', 'undergraduate': 'UG', 'bachelor': 'UG', 'pg': 'PG', 'postgraduate': 'PG', 'master': 'PG', 'phd': 'PhD', 'doctorate': 'PhD', 'diploma': 'Diploma', 'certificate': 'Certificate' };
function canonicalLevel(raw) { const c = clean(raw); if (!c) return 'UG'; const lower = c.toLowerCase().trim(); for (const [key, val] of Object.entries(LEVEL_MAP)) { if (lower.startsWith(key) || lower === key) return val; } return c.trim().toUpperCase(); }
function cellAt(row, i) { return (i === undefined || i === null) ? null : (row[i] === undefined ? null : row[i]); }

// ─── HEADER DETECTION ──────────────────────────────────────────────────
const UNI_ALIASES = {
  name: ['university name', 'name', 'college name', 'institution name', 'university/college name'],
  universityCode: ['university code', 'code', 'uni code'],
  segment: ['university segment', 'segment'],
  type: ['university type', 'type', 'institution type'],
  state: ['state'], city: ['city'], district: ['district'],
  address: ['full address', 'address'],
  establishedYear: ['established year', 'year established', 'establishment year', 'estd year', 'estd.', 'est. year'],
  naacGrade: ['naac grade', 'naac', 'naac accreditation'],
  nirfRank: ['nirf rank', 'nirf ranking', 'nirf'],
  website: ['website', 'official website', 'url'],
  logoUrl: ['logo url', 'logo'], bannerImageUrl: ['banner image url', 'banner'],
  description: ['description', 'about'],
  email: ['email', 'contact email'], phone: ['phone', 'contact phone', 'contact number'],
  totalStudents: ['total students'], campusAcres: ['campus acres', 'campus size'],
  avgPackage: ['avg package lpa', 'average package', 'avg package'],
  highestPackage: ['highest package lpa', 'highest package'],
  placement: ['placement %', 'placement percentage', 'placement'],
  highlights: ['highlights'], topRecruiters: ['top recruiters'], facilities: ['facilities'],
  admissionLink: ['admission link'], brochureLink: ['brochure link'],
  placementReportLink: ['placement report link'], scholarshipLink: ['scholarship link'],
  hostelLink: ['hostel link'], mapLink: ['map link'],
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

function normHeader(s) { return String(s == null ? '' : s).replace(/[\u00A0\u200B\uFEFF]/g, ' ').toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim(); }
function isHintCell(s) { return /^ui[:\s]/i.test(String(s == null ? '' : s).trim()); }
function buildAliasLookup(aliasMap) { const lut = {}; for (const field of Object.keys(aliasMap)) { for (const alias of aliasMap[field]) lut[alias] = field; } return lut; }
function sheetToMatrix(sheet) { const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }); return raw.filter(r => Array.isArray(r) && r.some(v => v !== null && String(v).trim() !== '')); }

function detectHeaderRow(rows, aliasMap) {
  const lut = buildAliasLookup(aliasMap);
  let best = { idx: -1, score: 0 };
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i]; if (!row || !Array.isArray(row)) continue;
    const cells = row.map(c => String(c == null ? '' : c));
    const hintCount = cells.filter(isHintCell).length;
    if (hintCount >= 2) continue;
    const joined = cells.join(' ').toLowerCase();
    if (joined.includes('maps to the') || joined.includes('one row per')) continue;
    const matched = new Set();
    for (const c of cells) { const key = normHeader(c); if (lut[key]) matched.add(lut[key]); }
    if (matched.size > best.score) best = { idx: i, score: matched.size };
  }
  return best.score >= 2 ? best.idx : -1;
}

function buildFieldIndex(headerRow, aliasMap) {
  const lut = buildAliasLookup(aliasMap);
  const idx = {};
  headerRow.forEach((h, i) => { const key = normHeader(h); if (lut[key] && idx[lut[key]] === undefined) idx[lut[key]] = i; });
  return idx;
}

// ─── ROW PARSERS ───────────────────────────────────────────────────────
function parseUniversityRow(row, idx) {
  const name = clean(cellAt(row, idx.name));
  if (!name) return null;
  const { segment, institutionKind, type } = classifyUniversity(cellAt(row, idx.segment), cellAt(row, idx.type));
  const code = clean(cellAt(row, idx.universityCode));
  return {
    name, state: normalizeState(cellAt(row, idx.state)), city: clean(cellAt(row, idx.city)),
    segment, institutionKind, type,
    establishedYear: toInt(cellAt(row, idx.establishedYear)),
    naacGrade: clean(cellAt(row, idx.naacGrade)), nirfRank: toNIRF(cellAt(row, idx.nirfRank)),
    description: clean(cellAt(row, idx.description)), website: clean(cellAt(row, idx.website)),
    logoUrl: clean(cellAt(row, idx.logoUrl)), bannerImageUrl: clean(cellAt(row, idx.bannerImageUrl)),
    email: clean(cellAt(row, idx.email)), phone: clean(cellAt(row, idx.phone)),
    address: clean(cellAt(row, idx.address)),
    approvals: { ugc: toBool(cellAt(row, idx.approvalUGC)), aicte: toBool(cellAt(row, idx.approvalAICTE)), nmc: toBool(cellAt(row, idx.approvalNMC)), bci: toBool(cellAt(row, idx.approvalBCI)), coa: toBool(cellAt(row, idx.approvalCOA)), pci: toBool(cellAt(row, idx.approvalPCI)) },
    stats: { totalStudents: toInt(cellAt(row, idx.totalStudents)), campusSizeAcres: toFloat(cellAt(row, idx.campusAcres)), avgPackageLPA: toPackageLPA(cellAt(row, idx.avgPackage)), highestPackageLPA: toPackageLPA(cellAt(row, idx.highestPackage)), placementPercentage: toPercent(cellAt(row, idx.placement)), totalCoursesCount: 0, avgFees: null, rating: 0 },
    highlights: toList(cellAt(row, idx.highlights), ['/']), topRecruiters: toList(cellAt(row, idx.topRecruiters), ['/']), facilities: toList(cellAt(row, idx.facilities), ['/']),
    links: { admissionLink: clean(cellAt(row, idx.admissionLink)), brochureLink: clean(cellAt(row, idx.brochureLink)), placementReportLink: clean(cellAt(row, idx.placementReportLink)), scholarshipLink: clean(cellAt(row, idx.scholarshipLink)), hostelLink: clean(cellAt(row, idx.hostelLink)), mapLink: clean(cellAt(row, idx.mapLink)) },
    universityCode: code || undefined,
  };
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
    universityName: uniName, name, category: level, stream,
    baseCourse: base, specializationName: spec || null,
    duration: toInt(cellAt(row, idx.duration)) || (level === 'UG' ? 4 : level === 'PG' ? 2 : 3),
    totalSeats: seats, feesPerYear: fees,
    entranceExams: toExamList(cellAt(row, idx.entranceExams)),
    eligibility: clean(cellAt(row, idx.eligibility)) || 'Check official brochure',
    specializations: spec ? [{ name: spec, seats: seats || 60, feesPerYear: fees || 0 }] : [],
  };
}

// ─── MAIN IMPORT LOGIC ─────────────────────────────────────────────────
async function importAll() {
  await connectDB();
  console.log('[import] Connected to MongoDB');

  // Load existing universities for slug uniqueness and course linking
  const existingUnis = await University.find().select('name slug').lean();
  const uniSlugFactory = makeSlugFactory(existingUnis.map(u => u.slug));

  // Build name -> id map
  const uniNameMap = new Map();
  existingUnis.forEach(u => uniNameMap.set(u.name.toLowerCase(), u._id.toString()));

  const baseDir = 'C:\\Users\\ghadi\\Downloads\\drive-download-20260903T093404Z-1-001';
  const stateFolders = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());

  let totalCreated = 0, totalUpdated = 0, totalSkipped = 0;
  let totalCourses = 0;

  for (const folder of stateFolders) {
    const folderPath = path.join(baseDir, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

    if (files.length === 0) {
      console.log(`[skip] ${folder}: no Excel files`);
      continue;
    }

    // For each state folder, process ALL xlsx files (some have Final versions, etc.)
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      console.log(`\n[import] ${folder}/${file}`);

      try {
        const wb = XLSX.readFile(filePath);
        let uniCreated = 0, uniUpdated = 0, coursesCreated = 0;

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows = sheetToMatrix(ws);
          if (rows.length < 2) continue;

          // Try university sheet
          const uniHeaderIdx = detectHeaderRow(rows, UNI_ALIASES);
          const courseHeaderIdx = detectHeaderRow(rows, COURSE_ALIASES);

          if (uniHeaderIdx >= 0) {
            const uniIdx = buildFieldIndex(rows[uniHeaderIdx], UNI_ALIASES);
            for (let i = uniHeaderIdx + 1; i < rows.length; i++) {
              const data = parseUniversityRow(rows[i], uniIdx);
              if (!data || !data.name) continue;

              const existingId = uniNameMap.get(data.name.toLowerCase());
              if (existingId) {
                // Update existing
                delete data.universityCode; // avoid duplicate key on update
                await University.findByIdAndUpdate(existingId, { $set: data });
                uniUpdated++;
              } else {
                // Create new — skip universityCode if it already exists
                const slug = uniSlugFactory(data.name);
                if (data.universityCode) {
                  const codeExists = await University.findOne({ universityCode: data.universityCode }).lean();
                  if (codeExists) delete data.universityCode;
                }
                const created = await University.create({ ...data, slug, status: 'published', views: 0 });
                uniNameMap.set(data.name.toLowerCase(), created._id.toString());
                uniCreated++;
              }
            }
          }

          if (courseHeaderIdx >= 0) {
            const courseIdx = buildFieldIndex(rows[courseHeaderIdx], COURSE_ALIASES);
            for (let i = courseHeaderIdx + 1; i < rows.length; i++) {
              const data = parseCourseRow(rows[i], courseIdx);
              if (!data || !data.universityName) continue;

              const uniId = uniNameMap.get(data.universityName.toLowerCase());
              if (!uniId) continue;

              // Check for duplicate course name at this university
              const existingCourse = await Course.findOne({ universityId: uniId, name: data.name });
              if (existingCourse) continue;

              const course = await Course.create({ ...data, universityId: uniId });
              await University.findByIdAndUpdate(uniId, { $push: { courses: course._id } });
              coursesCreated++;
            }
          }
        }

        totalCreated += uniCreated;
        totalUpdated += uniUpdated;
        totalCourses += coursesCreated;
        console.log(`  → ${uniCreated} created, ${uniUpdated} updated, ${coursesCreated} courses`);
      } catch (err) {
        console.error(`  [error] ${file}: ${err.message}`);
        totalSkipped++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`[DONE] Universities: ${totalCreated} created, ${totalUpdated} updated`);
  console.log(`[DONE] Courses: ${totalCourses} created`);
  console.log(`[DONE] Files with errors: ${totalSkipped}`);

  // Update course counts on universities
  console.log('\n[post] Updating course counts...');
  const uniCursor = University.find().cursor();
  for await (const uni of uniCursor) {
    const count = await Course.countDocuments({ universityId: uni._id });
    if (count !== (uni.stats?.totalCoursesCount || 0)) {
      await University.findByIdAndUpdate(uni._id, { 'stats.totalCoursesCount': count });
    }
  }
  console.log('[post] Course counts updated');

  await mongoose.disconnect();
  console.log('[import] Done!');
}

importAll().catch(e => { console.error('[FATAL]', e); process.exit(1); });
