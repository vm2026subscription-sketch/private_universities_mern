const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const University = require('../models/University');
const Course = require('../models/Course');
const AuditLog = require('../models/AuditLog');
const path = require('path');
const { protect, admin } = require('../middleware/auth');  // <-- ADDED

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
  }
});
// ========== CLEANING FUNCTIONS ==========
function clean(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  const nullish = new Set([
    '', '-', '—', 'n/a', 'na', 'nan', 'none', 'null',
    'not specified', 'not applicable', 'not ranked', 'tbd', 'tba',
    'not available', '#n/a', '#null!', 'nil',
  ]);
  if (nullish.has(s.toLowerCase())) return null;
  return s;
}

function toBool(val) {
  const s = clean(val);
  if (!s) return false;
  return ['yes', 'true', '1', 'y', 'approved'].includes(s.toLowerCase());
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
  if (!raw) return 'Others';
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(STREAM_CANONICAL)) {
    if (lower.includes(key)) return val;
  }
  return clean(raw) || 'Others';
}

const LEVEL_MAP = {
  'ug': 'UG', 'undergraduate': 'UG', 'bachelor': 'UG',
  'pg': 'PG', 'postgraduate': 'PG', 'master': 'PG',
  'phd': 'PhD', 'doctorate': 'PhD',
  'diploma': 'Diploma', 'certificate': 'Certificate',
};

function canonicalLevel(raw) {
  if (!raw) return 'UG';
  const lower = raw.toLowerCase().trim();
  for (const [key, val] of Object.entries(LEVEL_MAP)) {
    if (lower.startsWith(key) || lower === key) return val;
  }
  return raw.trim().toUpperCase();
}

const DEFAULT_ELIGIBILITY = 'Check official brochure';

// ========== HEADER DETECTION ==========

const UNI_ANCHORS = ['university name', 'university code', 'state', 'city'];
const COURSE_ANCHORS = ['university name', 'base course', 'stream', 'course level'];

function findHeaderRow(rows, anchors) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    
    const rowStr = String(row).toLowerCase();
    if (rowStr.includes('ui:') || rowStr.includes('maps to the') || rowStr.includes('one row per')) {
      continue;
    }
    
    const lowerVals = row.map(v => String(v || '').toLowerCase().trim());
    const matchCount = anchors.filter(a => lowerVals.some(v => v.includes(a))).length;
    const hasData = lowerVals.some(v => v.length > 0 && !v.includes('ui:'));
    
    if (matchCount >= 2 && hasData) {
      return i;
    }
  }
  return -1;
}

function sheetToObjects(sheet) {
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
  const rows = raw.filter(r => r && Array.isArray(r) && r.some(v => v !== null && String(v).trim() !== ''));
  return rows;
}

// ========== PARSERS ==========

function parseUniversity(row) {
  const name = clean(row['University Name'] || row['Name']);
  if (!name) return null;

  const { segment, institutionKind, type } = classifyUniversity(
    row['University Segment'] || row['Segment'],
    row['University Type'] || row['Type']
  );

  return {
    universityCode: clean(row['University Code'] || row['Code']),
    name,
    slug: slugify(name),
    state: normalizeState(row['State']),
    city: clean(row['City']),
    segment,
    institutionKind,
    type,
    establishedYear: toInt(row['Established Year']),
    naacGrade: clean(row['NAAC Grade'] || row['NAAC']),
    nirfRank: toNIRF(row['NIRF Rank'] || row['NIRF']),
    description: clean(row['Description']),
    website: clean(row['Website']),
    logoUrl: clean(row['Logo URL']),
    bannerImageUrl: clean(row['Banner Image URL']),
    email: clean(row['Email']),
    phone: clean(row['Phone']),
    address: clean(row['Address']),
    approvals: {
      ugc: toBool(row['Approval: UGC']),
      aicte: toBool(row['Approval: AICTE']),
      nmc: toBool(row['Approval: NMC']),
      bci: toBool(row['Approval: BCI']),
      coa: toBool(row['Approval: COA']),
      pci: toBool(row['Approval: ICI'] || row['Approval: PCI'])
    },
    stats: {
      totalStudents: toInt(row['Total Students']),
      campusSizeAcres: toFloat(row['Campus Acres']),
      avgPackageLPA: toPackageLPA(row['Avg Package LPA']),
      highestPackageLPA: toPackageLPA(row['Highest Package LPA']),
      placementPercentage: toPercent(row['Placement %']),
      totalCoursesCount: 0,
      avgFees: null,
      rating: 0
    },
    highlights: toList(row['Highlights'], ['/']),
    topRecruiters: toList(row['Top Recruiters'], ['/']),
    facilities: toList(row['Facilities'], ['/']),
    links: {
      admissionLink: clean(row['Admission Link']),
      brochureLink: clean(row['Brochure Link']),
      placementReportLink: clean(row['Placement Report Link']),
      scholarshipLink: clean(row['Scholarship Link']),
      hostelLink: clean(row['Hostel Link']),
      mapLink: clean(row['Map Link'])
    },
    admissions: {},
    campus: {},
    scholarships: [],
    newsLinks: [],
    views: 0
  };
}

function parseCourse(row) {
  const base = clean(row['Base Course'] || row['Course']);
  if (!base) return null;

  const uniName = clean(row['University Name'] || row['University']);
  const spec = clean(row['Specialization']);
  const level = canonicalLevel(row['Course Level'] || row['Level']);
  const stream = canonicalStream(row['Stream']);

  const feesRaw = row['Fees Per Year'] || row['Annual Fees'] || row['Fees'];
  const fees = toInt(feesRaw);
  const seats = toInt(row['Total Seats'] || row['Seats']);

  const name = spec ? `${base} in ${spec}` : base;

  return {
    _universityName: uniName,
    name,
    category: level,
    stream,
    baseCourse: base,
    specializationName: spec,
    duration: clean(row['Duration (Years)'] || row['Duration']),
    totalSeats: seats,
    feesPerYear: fees,
    entranceExams: toExamList(row['Entrance Exams']),
    eligibility: clean(row['Eligibility']) || DEFAULT_ELIGIBILITY,
    specializations: spec ? [{ name: spec, seats, feesPerYear: fees }] : []
  };
}

// ========== VALIDATION ==========

function validateUniversity(data, index) {
  const errors = [];
  const warnings = [];

  if (!data.name) {
    errors.push(`Row ${index + 1}: University Name is required`);
  }
  if (!data.state) {
    errors.push(`Row ${index + 1}: State is required for ${data.name || 'unknown university'}`);
  }
  if (!data.city) {
    errors.push(`Row ${index + 1}: City is required for ${data.name || 'unknown university'}`);
  }
  if (data.establishedYear && (data.establishedYear < 1800 || data.establishedYear > new Date().getFullYear())) {
    warnings.push(`Row ${index + 1}: Unusual established year (${data.establishedYear}) for ${data.name}`);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

function validateCourse(data, index, universityMap) {
  const errors = [];
  const warnings = [];

  if (!data._universityName) {
    errors.push(`Row ${index + 1}: University Name is required for course`);
  } else if (!universityMap.has(data._universityName.toLowerCase()) && 
             !universityMap.has(slugify(data._universityName))) {
    errors.push(`Row ${index + 1}: University "${data._universityName}" not found`);
  }

  if (!data.baseCourse) {
    errors.push(`Row ${index + 1}: Base Course is required`);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ========== GET SHEET NAMES ==========
router.post('/sheets', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    res.json({ success: true, sheets: workbook.SheetNames });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PREVIEW ENDPOINT ==========
router.post('/preview', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = req.body.sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = sheetToObjects(sheet);

    const isUniversitySheet = sheetName.toLowerCase().includes('universit') || 
                              rows.slice(0, 5).some(row => 
                                String(row).toLowerCase().includes('university name'));
    
    const anchors = isUniversitySheet ? UNI_ANCHORS : COURSE_ANCHORS;
    const headerRowIndex = findHeaderRow(rows, anchors);
    
    if (headerRowIndex === -1) {
      return res.status(400).json({ error: 'Could not detect header row' });
    }

    const headers = rows[headerRowIndex].map(v => String(v || '').trim());
    const dataRows = rows.slice(headerRowIndex + 1);
    
    const objects = dataRows.map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? null; });
      return obj;
    });

    const existingUniversities = await University.find({}, 'name slug');
    const universityMap = new Map();
    existingUniversities.forEach(u => {
      universityMap.set(u.name.toLowerCase(), u);
      universityMap.set(u.slug, u);
    });

    let parsedData = [];
    let allErrors = [];
    let allWarnings = [];
    let validCount = 0;

    if (isUniversitySheet) {
      for (let i = 0; i < objects.length; i++) {
        const university = parseUniversity(objects[i]);
        if (!university) continue;
        
        const validation = validateUniversity(university, i);
        parsedData.push({
          ...university,
          _validation: { errors: validation.errors, warnings: validation.warnings, isValid: validation.isValid }
        });
        allErrors.push(...validation.errors);
        allWarnings.push(...validation.warnings);
        if (validation.isValid) validCount++;
      }
    } else {
      for (let i = 0; i < objects.length; i++) {
        const course = parseCourse(objects[i]);
        if (!course) continue;
        
        const validation = validateCourse(course, i, universityMap);
        parsedData.push({
          ...course,
          _validation: { errors: validation.errors, warnings: validation.warnings, isValid: validation.isValid }
        });
        allErrors.push(...validation.errors);
        allWarnings.push(...validation.warnings);
        if (validation.isValid) validCount++;
      }
    }

    res.json({
      success: true,
      sheetType: isUniversitySheet ? 'universities' : 'courses',
      totalRows: objects.length,
      validCount,
      invalidCount: objects.length - validCount,
      errors: [...new Set(allErrors)],
      warnings: [...new Set(allWarnings)],
      preview: parsedData.slice(0, 10),
      fullData: parsedData
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== SINGLE SHEET CONFIRM ENDPOINT ==========
router.post('/confirm', protect, admin, upload.single('file'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { mode = 'upsert', validateOnly = 'false', sheetName: reqSheetName, uploadType } = req.body;
    const shouldValidateOnly = validateOnly === 'true';

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    
    let sheetName = reqSheetName;
    if (!sheetName) {
      if (uploadType === 'universities') {
        sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('universit')) || workbook.SheetNames[0];
      } else if (uploadType === 'courses') {
        sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('course')) || workbook.SheetNames[0];
      } else {
        sheetName = workbook.SheetNames[0];
      }
    }
    
    const sheet = workbook.Sheets[sheetName];
    const rows = sheetToObjects(sheet);

    const isUniversitySheet = sheetName.toLowerCase().includes('universit') || uploadType === 'universities';
    const anchors = isUniversitySheet ? UNI_ANCHORS : COURSE_ANCHORS;
    const headerRowIndex = findHeaderRow(rows, anchors);
    
    if (headerRowIndex === -1) {
      return res.status(400).json({ error: 'Could not detect header row' });
    }

    const headers = rows[headerRowIndex].map(v => String(v || '').trim());
    const dataRows = rows.slice(headerRowIndex + 1);
    const objects = dataRows.map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? null; });
      return obj;
    });

    const existingUniversities = await University.find({}, 'name slug universityCode');
    const universityMap = new Map();
    existingUniversities.forEach(u => {
      universityMap.set(u.name.toLowerCase(), u);
      universityMap.set(u.universityCode?.toLowerCase(), u);
    });

    let results = { created: 0, updated: 0, skipped: 0, errors: [] };
    let processedData = [];

    if (isUniversitySheet) {
      for (let i = 0; i < objects.length; i++) {
        try {
          const university = parseUniversity(objects[i]);
          if (!university) {
            results.skipped++;
            continue;
          }

          const validation = validateUniversity(university, i);
          if (!validation.isValid) {
            results.skipped++;
            results.errors.push({ row: i, error: validation.errors.join(', ') });
            continue;
          }

          if (shouldValidateOnly) {
            processedData.push(university);
            results.created++;
            continue;
          }

          const existing = await University.findOne({
            $or: [
              { universityCode: university.universityCode },
              { name: university.name }
            ]
          }).session(session);

          let saved;
          if (existing && mode === 'upsert') {
            saved = await University.findByIdAndUpdate(
              existing._id,
              { $set: university },
              { new: true, session }
            );
            results.updated++;
          } else if (!existing) {
            saved = await University.create([university], { session });
            results.created++;
          } else {
            results.skipped++;
            continue;
          }

          processedData.push(saved);
          universityMap.set(saved.name.toLowerCase(), saved);
          if (saved.universityCode) {
            universityMap.set(saved.universityCode.toLowerCase(), saved);
          }

        } catch (err) {
          results.errors.push({ row: i, error: err.message });
          results.skipped++;
        }
      }
    } else {
      for (let i = 0; i < objects.length; i++) {
        try {
          const course = parseCourse(objects[i]);
          if (!course) {
            results.skipped++;
            continue;
          }

          const uniName = course._universityName;
          let university = universityMap.get(uniName.toLowerCase());
          
          if (!university) {
            const slugged = slugify(uniName);
            university = universityMap.get(slugged);
          }

          if (!university) {
            results.errors.push({ row: i, error: `University "${uniName}" not found` });
            results.skipped++;
            continue;
          }

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
            specializations: course.specializations
          };

          const existing = await Course.findOne({
            universityId: university._id,
            baseCourse: course.baseCourse,
            specializationName: course.specializationName
          }).session(session);

          let saved;
          if (existing && mode === 'upsert') {
            saved = await Course.findByIdAndUpdate(
              existing._id,
              { $set: courseData },
              { new: true, session }
            );
            results.updated++;
          } else if (!existing) {
            saved = await Course.create([courseData], { session });
            results.created++;
          } else {
            results.skipped++;
            continue;
          }

          processedData.push(saved);

        } catch (err) {
          results.errors.push({ row: i, error: err.message });
          results.skipped++;
        }
      }
    }

    if (!shouldValidateOnly) {
      const universitiesWithCourses = await Course.aggregate([
        { $group: { _id: '$universityId', count: { $sum: 1 } } }
      ]);
      
      for (const { _id, count } of universitiesWithCourses) {
        await University.findByIdAndUpdate(_id, { 'stats.totalCoursesCount': count }, { session });
      }

      // Admin is always logged in now, so we can create audit log directly
      try {
        await AuditLog.create([{
          userId: req.user._id,
          action: 'bulk_import',
          resource: isUniversitySheet ? 'universities' : 'courses',
          description: `Import: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
          changes: { before: null, after: { summary: results } },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }], { session });
      } catch (auditError) {
        console.error('⚠️ Audit log creation failed:', auditError.message);
      }

      await session.commitTransaction();
    } else {
      await session.abortTransaction();
    }

    res.json({
      success: true,
      mode: shouldValidateOnly ? 'validation' : 'import',
      results,
      processedCount: processedData.length,
      sampleData: processedData.slice(0, 5)
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// ========== BULK UPLOAD - Process Both Universities and Courses Together ==========
router.post('/bulk', protect, admin, upload.single('file'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const { mode = 'upsert' } = req.body;
    
    console.log(`\n📊 Excel file loaded. Sheets found: ${workbook.SheetNames.join(', ')}`);
    
    let results = {
      universities: { created: 0, updated: 0, skipped: 0, errors: [] },
      courses: { created: 0, updated: 0, skipped: 0, errors: [] }
    };
    
    const universityMap = new Map();

    // ========== 1. PROCESS UNIVERSITIES SHEET ==========
    const uniSheetName = workbook.SheetNames.find(s => 
      s.toLowerCase().includes('universit') || s.toLowerCase() === 'universities'
    );
    
    if (uniSheetName) {
      console.log(`\n📚 Processing Universities sheet: "${uniSheetName}"`);
      const sheet = workbook.Sheets[uniSheetName];
      const rows = sheetToObjects(sheet);
      const headerRowIndex = findHeaderRow(rows, UNI_ANCHORS);
      
      if (headerRowIndex === -1) {
        console.log(`   ❌ Could not find header row in Universities sheet`);
      } else {
        const headers = rows[headerRowIndex].map(v => String(v || '').trim());
        const dataRows = rows.slice(headerRowIndex + 1);
        
        const objects = dataRows.map(row => {
          const obj = {};
          headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? null; });
          return obj;
        });

        console.log(`   Found ${objects.length} university records`);
        
        for (let i = 0; i < objects.length; i++) {
          try {
            const university = parseUniversity(objects[i]);
            if (!university) {
              results.universities.skipped++;
              continue;
            }

            // Skip empty rows
            if (!university.name || university.name === 'null' || university.name.length < 2) {
              results.universities.skipped++;
              continue;
            }

            const validation = validateUniversity(university, i);
            if (!validation.isValid) {
              results.universities.skipped++;
              results.universities.errors.push({ row: i, error: validation.errors.join(', ') });
              continue;
            }

            const existing = await University.findOne({
              $or: [
                { universityCode: university.universityCode },
                { name: university.name }
              ]
            }).session(session);

            let saved;
            if (existing && mode === 'upsert') {
              saved = await University.findByIdAndUpdate(
                existing._id,
                { $set: university },
                { new: true, session }
              );
              results.universities.updated++;
              console.log(`   ✅ Updated: ${university.name}`);
            } else if (!existing) {
              saved = await University.create([university], { session });
              results.universities.created++;
              console.log(`   ✅ Created: ${university.name}`);
            } else {
              results.universities.skipped++;
              continue;
            }

            universityMap.set(saved.name.toLowerCase(), saved);
            if (saved.universityCode) {
              universityMap.set(saved.universityCode.toLowerCase(), saved);
            }

          } catch (err) {
            results.universities.errors.push({ row: i, error: err.message });
            results.universities.skipped++;
          }
        }
      }
    } else {
      console.log('⚠️ No Universities sheet found');
    }

    // ========== 2. PROCESS COURSES SHEET (Hardened Header Detection) ==========
    const courseSheetName = workbook.SheetNames.find(s => 
      s.toLowerCase().includes('course') || s.toLowerCase() === 'courses'
    );

    if (courseSheetName) {
      console.log(`\n📖 Processing Courses sheet: "${courseSheetName}"`);
      const sheet = workbook.Sheets[courseSheetName];
      const rows = sheetToObjects(sheet);
      
      // Find header row by scanning for "University Name" and ensuring it's not a UI row
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const hasUniversityName = row.some(cell => 
          String(cell).trim().toLowerCase() === 'university name'
        );
        const hasUIPrefix = row.some(cell => 
          String(cell).trim().toLowerCase().startsWith('ui:')
        );
        if (hasUniversityName && !hasUIPrefix) {
          headerRowIndex = i;
          console.log(`   ✅ Found correct header row at index ${i}`);
          break;
        }
      }
      
      // Fallback: try the standard findHeaderRow if still not found
      if (headerRowIndex === -1) {
        console.log(`   ⚠️ Using fallback header detection...`);
        headerRowIndex = findHeaderRow(rows, COURSE_ANCHORS);
        if (headerRowIndex !== -1) {
          console.log(`   ⚠️ Fallback found row ${headerRowIndex}, but may be incorrect.`);
        }
      }
      
      if (headerRowIndex === -1) {
        console.log(`   ❌ Could not detect header row in Courses sheet. Skipping courses.`);
      } else {
        const headers = rows[headerRowIndex].map(v => String(v || '').trim());
        const dataRows = rows.slice(headerRowIndex + 1);
        
        const objects = dataRows.map(row => {
          const obj = {};
          headers.forEach((h, i) => { if (h && row[i] !== undefined && row[i] !== null) obj[h] = row[i]; });
          return obj;
        }).filter(obj => Object.keys(obj).length > 0 && obj['University Name']);

        console.log(`   Found ${objects.length} course records (after filtering empty rows)`);
        
        if (objects.length === 0) {
          console.log(`   ⚠️ No course records parsed. Check header row.`);
        } else {
          console.log(`   Sample: University Name = "${objects[0]['University Name']}"`);
          
          // Build lookup maps
          const exactMatchMap = new Map();
          const lowerMatchMap = new Map();
          for (const [key, uni] of universityMap) {
            exactMatchMap.set(uni.name, uni);
            lowerMatchMap.set(uni.name.toLowerCase(), uni);
          }
          
          let matchedCount = 0;
          let unmatchedCount = 0;
          const unmatchedExamples = [];
          
          for (let i = 0; i < objects.length; i++) {
            try {
              const course = parseCourse(objects[i]);
              if (!course) {
                results.courses.skipped++;
                continue;
              }

              const uniName = course._universityName;
              if (!uniName || uniName === 'null' || uniName.length < 2) {
                results.courses.skipped++;
                continue;
              }
              
              let university = null;
              
              // Try exact match
              university = exactMatchMap.get(uniName);
              if (!university) university = lowerMatchMap.get(uniName.toLowerCase());
              
              // Try stripping suffix
              if (!university && uniName.includes(' - ')) {
                const mainPart = uniName.split(' - ')[0];
                university = lowerMatchMap.get(mainPart.toLowerCase());
              }
              
              // Try contains
              if (!university) {
                for (const [uniKey, uni] of universityMap) {
                  if (uniName.toLowerCase().includes(uniKey.toLowerCase()) || 
                      uniKey.toLowerCase().includes(uniName.toLowerCase())) {
                    university = uni;
                    break;
                  }
                }
              }

              if (!university) {
                unmatchedCount++;
                if (unmatchedExamples.length < 20) unmatchedExamples.push(uniName);
                results.courses.skipped++;
                continue;
              }
              
              matchedCount++;

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
                specializations: course.specializations
              };

              const existing = await Course.findOne({
                universityId: university._id,
                baseCourse: course.baseCourse,
                specializationName: course.specializationName
              }).session(session);

              if (existing && mode === 'upsert') {
                await Course.findByIdAndUpdate(existing._id, { $set: courseData }, { session });
                results.courses.updated++;
              } else if (!existing) {
                await Course.create([courseData], { session });
                results.courses.created++;
                if (results.courses.created <= 10) {
                  console.log(`   ✅ "${course.name}" → ${university.name}`);
                }
              } else {
                results.courses.skipped++;
              }

            } catch (err) {
              results.courses.errors.push({ row: i, error: err.message });
              results.courses.skipped++;
            }
          }
          
          console.log(`   📊 Match results: ${matchedCount} matched, ${unmatchedCount} unmatched`);
          if (unmatchedExamples.length > 0) {
            console.log(`   ⚠️ First 10 unmatched university names:`);
            unmatchedExamples.slice(0, 10).forEach(name => console.log(`     - "${name}"`));
          }
        }
      }
    } else {
      console.log('⚠️ No Courses sheet found');
    }

    // ========== 3. UPDATE COURSE COUNTS ==========
    const universitiesWithCourses = await Course.aggregate([
      { $group: { _id: '$universityId', count: { $sum: 1 } } }
    ]);
    
    for (const { _id, count } of universitiesWithCourses) {
      await University.findByIdAndUpdate(_id, { 'stats.totalCoursesCount': count }, { session });
    }

    // ========== 4. AUDIT LOG (Admin is always logged in) ==========
    try {
      await AuditLog.create([{
        userId: req.user._id,
        action: 'bulk_import',
        resource: 'both',
        description: `Bulk import: Universities: ${results.universities.created} created, ${results.universities.updated} updated. Courses: ${results.courses.created} created, ${results.courses.updated} updated.`,
        changes: { before: null, after: { summary: results } },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }], { session });
      console.log('📝 Audit log created');
    } catch (auditError) {
      console.error('⚠️ Audit log creation failed:', auditError.message);
    }

    await session.commitTransaction();

    console.log('\n✅ BULK IMPORT COMPLETE');
    console.log(`   Universities: ${results.universities.created} created, ${results.universities.updated} updated, ${results.universities.skipped} skipped`);
    console.log(`   Courses: ${results.courses.created} created, ${results.courses.updated} updated, ${results.courses.skipped} skipped`);

    res.json({
      success: true,
      results,
      message: `✅ Universities: ${results.universities.created} created, ${results.universities.updated} updated. Courses: ${results.courses.created} created, ${results.courses.updated} updated.`,
      summary: {
        universities: { created: results.universities.created, updated: results.universities.updated, skipped: results.universities.skipped },
        courses: { created: results.courses.created, updated: results.courses.updated, skipped: results.courses.skipped }
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Bulk upload error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;