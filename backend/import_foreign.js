/**
 * PROPER Foreign University Import
 * - Parses metadata from structured rows (Country, Address, Email, etc.)
 * - Only imports actual course rows (where Sr. is a number)
 * - Imports both File1 (Application Details) and File2 (Seat Intake)
 */
const path = require('path');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const slugify = require('slugify');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const University = require('./src/models/University');
const Course = require('./src/models/Course');

const FILE1 = path.resolve(__dirname, 'data/Foreign Univeristies Application Details.xlsx');
const FILE2 = path.resolve(__dirname, 'data/extracted_clean/Private universities data/soham/Foreign_Universities_India_Seat_Intake_2024_25 (1).xlsx');

// Parse the metadata string: "Country: X | City: Y | Established: Z | Website: W"
function parseMetaString(str) {
  const result = {};
  if (!str) return result;
  const parts = String(str).split('|').map(p => p.trim());
  for (const part of parts) {
    const [key, ...valParts] = part.split(':');
    const val = valParts.join(':').trim();
    if (!key || !val || val === 'N/A (Foreign University)') continue;
    const k = key.trim().toLowerCase();
    if (k.includes('country')) result.country = val;
    else if (k.includes('city')) result.cityRaw = val;
    else if (k.includes('established')) {
      const yr = parseInt(val);
      if (yr > 1800 && yr < 2030) result.establishedYear = yr;
    } else if (k.includes('website')) result.website = val.startsWith('http') ? val : `https://${val}`;
    else if (k.includes('naac')) result.naacGrade = val;
    else if (k.includes('nirf')) {
      const n = parseInt(val);
      if (n > 0) result.nirfRank = n;
    }
  }
  return result;
}

// Parse city/state from a city string
function parseCityState(cityRaw) {
  if (!cityRaw) return { city: 'India', state: 'Unknown' };
  const parts = cityRaw.split(',').map(p => p.trim());
  
  const stateKeywords = {
    'gujarat': 'Gujarat', 'gift city': 'Gujarat', 'gandhinagar': 'Gujarat',
    'haryana': 'Haryana', 'gurugram': 'Haryana', 'gurgaon': 'Haryana',
    'karnataka': 'Karnataka', 'bengaluru': 'Karnataka', 'bangalore': 'Karnataka',
    'maharashtra': 'Maharashtra', 'mumbai': 'Maharashtra', 'navi mumbai': 'Maharashtra', 'pune': 'Maharashtra',
    'uttar pradesh': 'Uttar Pradesh', 'noida': 'Uttar Pradesh', 'greater noida': 'Uttar Pradesh',
    'delhi': 'Delhi NCR', 'new delhi': 'Delhi NCR',
    'tamil nadu': 'Tamil Nadu', 'chennai': 'Tamil Nadu',
    'rajasthan': 'Rajasthan', 'jaipur': 'Rajasthan',
    'telangana': 'Telangana', 'hyderabad': 'Telangana',
  };
  
  let state = 'Unknown';
  const rawLower = cityRaw.toLowerCase();
  for (const [kw, st] of Object.entries(stateKeywords)) {
    if (rawLower.includes(kw)) { state = st; break; }
  }
  
  const city = parts[0] || cityRaw;
  return { city, state };
}

// Detect country from university name
function detectCountry(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('deakin') || n.includes('wollongong') || n.includes('la trobe') || 
      n.includes('victoria university') || n.includes('western sydney') || n.includes('western australia')) return 'Australia';
  if (n.includes('southampton') || n.includes("queen's") || n.includes('coventry') || 
      n.includes('liverpool') || n.includes('york') || n.includes('bristol') || 
      n.includes('aberdeen') || n.includes('lancaster')) return 'United Kingdom';
  if (n.includes('illinois')) return 'United States';
  if (n.includes('istituto') || n.includes('ied')) return 'Italy';
  return 'International';
}

// Normalize "Not Available" values to null
function clean(val) {
  if (!val) return null;
  const s = String(val).trim();
  const bad = ['not available', 'n/a', 'na', '-', '—', '--', '', 'tbd', 'to be determined'];
  if (bad.includes(s.toLowerCase())) return null;
  return s;
}

async function importForeign() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Remove existing foreign universities + their courses
  const existing = await University.find({ type: 'foreign' });
  if (existing.length > 0) {
    const ids = existing.map(u => u._id);
    await Course.deleteMany({ universityId: { $in: ids } });
    await University.deleteMany({ type: 'foreign' });
    console.log(`Removed ${existing.length} existing foreign universities and their courses`);
  }

  const universities = new Map(); // slug -> { uniData, courses[] }

  // ============================================================
  // FILE 1: "Foreign Univeristies Application Details.xlsx"
  // Each row = one course at a university (after the header row)
  // ============================================================
  console.log('\n=== Processing File 1 ===');
  const wb1 = xlsx.readFile(FILE1);
  
  // Sheet 1: rows as arrays (raw)
  const s1Rows = xlsx.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], { defval: '', header: 1 });
  
  // Row 0 is the actual header (Institute Name, Courses, etc.)
  // Find header row index
  let headerIdx = -1;
  for (let i = 0; i < s1Rows.length; i++) {
    if (String(s1Rows[i][0]).toLowerCase().includes('institute')) {
      headerIdx = i;
      break;
    }
  }
  
  console.log(`  Sheet1 header at row ${headerIdx}:`, s1Rows[headerIdx]);

  // Col indices from header
  const h = s1Rows[headerIdx];
  const COL = {};
  h.forEach((v, i) => {
    const k = String(v).toLowerCase().trim();
    if (k.includes('institute')) COL.name = i;
    else if (k.includes('courses')) COL.course = i;
    else if (k.includes('application link')) COL.appLink = i;
    else if (k.includes('application fee')) COL.appFee = i;
    else if (k.includes('course duration') || k.includes('duration')) COL.duration = i;
    else if (k.includes('origin country') || k.includes('country')) COL.country = i;
    else if (k.includes('location state') || k.includes('state')) COL.state = i;
    else if (k.includes('location city') || k.includes('city')) COL.city = i;
    else if (k.includes('ranking')) COL.ranking = i;
    else if (k.includes('student intake') || k.includes('intake')) COL.seats = i;
    else if (k.includes('eligibility')) COL.eligibility = i;
    else if (k.includes('selection criteria')) COL.selection = i;
    else if (k.includes('annual tuition') || k.includes('fee')) COL.fee = i;
    else if (k.includes('refund')) COL.refund = i;
  });
  console.log('  Column map:', COL);

  for (let i = headerIdx + 1; i < s1Rows.length; i++) {
    const row = s1Rows[i];
    const name = clean(row[COL.name]);
    if (!name) continue;

    const slug = slugify(name, { lower: true, strict: true });
    
    if (!universities.has(slug)) {
      const country = clean(row[COL.country]) || detectCountry(name);
      const cityRaw = clean(row[COL.city]) || '';
      const stateRaw = clean(row[COL.state]) || '';
      const { city, state } = parseCityState(cityRaw + (stateRaw ? ', ' + stateRaw : ''));
      
      universities.set(slug, {
        uni: {
          name,
          slug,
          type: 'foreign',
          city: cityRaw || city,
          state: stateRaw || state,
          description: `${country} university with campus in India.`,
          approvals: { ugc: true },
          links: { admissionLink: clean(row[COL.appLink]) || '' },
          phone: null,
          email: null,
          address: null,
          website: null,
          establishedYear: null,
          country,
        },
        courses: [],
      });
    }

    const entry = universities.get(slug);
    
    // Update appLink if better
    const appLink = clean(row[COL.appLink]);
    if (appLink && !entry.uni.links.admissionLink) entry.uni.links.admissionLink = appLink;

    const courseName = clean(row[COL.course]);
    if (courseName) {
      const feeRaw = clean(row[COL.fee]);
      let feesPerYear = null;
      if (feeRaw) {
        const feeNum = parseInt(String(feeRaw).replace(/[^\d]/g, ''));
        if (feeNum > 0) feesPerYear = feeNum;
      }

      entry.courses.push({
        name: courseName,
        duration: clean(row[COL.duration]),
        totalSeats: parseInt(String(clean(row[COL.seats]) || '').replace(/[^\d]/g, '')) || null,
        eligibility: clean(row[COL.eligibility]),
        feesPerYear,
        entranceExams: clean(row[COL.selection]) ? [row[COL.selection]] : [],
      });
    }
  }

  // Sheet 2: Application Links (just update existing university links)
  if (wb1.SheetNames.length > 1) {
    const s2Rows = xlsx.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[1]], { defval: '' });
    for (const row of s2Rows) {
      const uniName = clean(row['University Name']);
      const appLink = clean(row['Application Links']);
      if (!uniName || !appLink) continue;
      for (const [slug, entry] of universities) {
        if (entry.uni.name.toLowerCase().includes(uniName.toLowerCase()) || 
            uniName.toLowerCase().includes(entry.uni.name.toLowerCase())) {
          if (!entry.uni.links.admissionLink) entry.uni.links.admissionLink = appLink;
          break;
        }
      }
    }
  }

  console.log(`  File 1: ${universities.size} universities, ${[...universities.values()].reduce((s,e)=>s+e.courses.length,0)} courses`);

  // ============================================================
  // FILE 2: Per-sheet university data with rich metadata
  // Structure per sheet:
  //   Row 0: [University Name, ...]
  //   Row 1: [Metadata string (Country: | City: | ...), ...]
  //   Row 2: [Address:, actual address]
  //   Row 3: [Email:, email]
  //   Row 4: [Phone:, phone]
  //   Row 5: [UGC Status:, status]
  //   Row 6: [Type:, type]
  //   Row 7: [Seat summary string]
  //   Row 8: [Sr., Course Name, Level, Duration, Seats, Admission Basis, Fee, Remarks]
  //   Row 9: [── SECTION ──]
  //   Row 10+: [1, course, level, duration, seats, basis, fee, remarks]
  // ============================================================
  console.log('\n=== Processing File 2 ===');
  const wb2 = xlsx.readFile(FILE2);

  for (const sheetName of wb2.SheetNames) {
    if (sheetName.toLowerCase().includes('summary')) continue;
    
    const rows = xlsx.utils.sheet_to_json(wb2.Sheets[sheetName], { defval: '', header: 1 });
    if (rows.length < 2) continue;

    // Row 0: University name
    const uniName = clean(String(rows[0][0]));
    if (!uniName || uniName.includes('FOREIGN UNIVERSITIES')) continue;

    const slug = slugify(uniName, { lower: true, strict: true });

    // Row 1: metadata string
    const metaStr = String(rows[1][0] || '');
    const meta = parseMetaString(metaStr);
    const loc = parseCityState(meta.cityRaw || '');
    const country = meta.country || detectCountry(uniName);

    // Rows 2-6: address/email/phone/ugcStatus/type
    const address = clean(rows[2]?.[1]);
    const email = clean(rows[3]?.[1]);
    const phone = clean(rows[4]?.[1]);
    const ugcStatus = clean(rows[5]?.[1]);
    const uniType = clean(rows[6]?.[1]);

    if (!universities.has(slug)) {
      universities.set(slug, {
        uni: {
          name: uniName,
          slug,
          type: 'foreign',
          city: loc.city,
          state: loc.state,
          description: `${country} university with campus in India. ${ugcStatus || ''}`.trim(),
          approvals: { ugc: ugcStatus?.toLowerCase().includes('approved') || false },
          links: {},
          phone: null,
          email: null,
          address: null,
          website: null,
          establishedYear: null,
          country,
        },
        courses: [],
      });
    }

    const entry = universities.get(slug);
    
    // Enrich with metadata from File2 (more accurate)
    if (email && email.toLowerCase() !== 'not available') entry.uni.email = email;
    if (address && address.toLowerCase() !== 'not available') entry.uni.address = address;
    if (phone && phone.toLowerCase() !== 'not available') entry.uni.phone = phone;
    if (meta.website) entry.uni.website = meta.website;
    if (meta.establishedYear) entry.uni.establishedYear = meta.establishedYear;
    if (meta.country) entry.uni.country = meta.country;
    if (ugcStatus) entry.uni.description = `${country} university with campus in India. ${ugcStatus}`.trim();
    if (uniType) entry.uni.description += ` Type: ${uniType}`;

    // Find the header row (row with "Course Name")
    let courseHeaderRow = -1;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][1] || '').toLowerCase().includes('course name')) {
        courseHeaderRow = i;
        break;
      }
    }
    if (courseHeaderRow === -1) continue;

    // Parse course rows: Sr. is a number in col 0
    for (let i = courseHeaderRow + 1; i < rows.length; i++) {
      const row = rows[i];
      const sr = row[0];
      const courseName = clean(row[1]);
      
      // Skip section headers (── PROGRAMMES ──) and empty rows
      if (!courseName || isNaN(parseInt(sr))) continue;
      
      const level = clean(row[2]) || 'UG';
      const duration = clean(row[3]);
      const seatsRaw = clean(row[4]);
      const admissionBasis = clean(row[5]);
      const feeRaw = clean(row[6]);
      const remarks = clean(row[7]);

      let feesPerYear = null;
      if (feeRaw) {
        const feeNum = parseInt(String(feeRaw).replace(/[^\d]/g, ''));
        if (feeNum > 0) feesPerYear = feeNum;
      }

      // Avoid duplicates within same university
      const isDup = entry.courses.some(c => c.name === courseName);
      if (!isDup) {
        entry.courses.push({
          name: courseName,
          level: level.toUpperCase(),
          duration: duration,
          totalSeats: parseInt(String(seatsRaw || '').replace(/[^\d]/g, '')) || null,
          eligibility: admissionBasis,
          feesPerYear,
          remarks,
          entranceExams: admissionBasis ? [admissionBasis] : [],
        });
      }
    }
  }

  console.log(`  File 2: Total ${universities.size} universities`);

  // ============================================================
  // Save all to MongoDB
  // ============================================================
  console.log('\n=== Saving to MongoDB ===');
  let uniCount = 0, courseCount = 0;

  for (const [slug, entry] of universities) {
    const { uni: uniData, courses: coursesData } = entry;
    
    // Normalize category from level
    const normalizeCategory = (level, name) => {
      const l = (level || '').toLowerCase();
      const n = (name || '').toLowerCase();
      if (l.includes('phd') || l.includes('doctor') || n.includes('phd')) return 'PhD';
      if (l === 'pg' || l.includes('post') || l.includes('master') || l.includes('mba') || l.includes('msc')) return 'PG';
      if (l.includes('diploma') || l.includes('certificate')) return 'Diploma';
      return 'UG';
    };

    // Create the university
    const uni = await University.create({
      name: uniData.name,
      slug: uniData.slug,
      type: 'foreign',
      city: uniData.city || 'India',
      state: uniData.state || 'Unknown',
      description: uniData.description || '',
      approvals: uniData.approvals,
      links: uniData.links || {},
      email: uniData.email || '',
      phone: uniData.phone || '',
      address: uniData.address || '',
      website: uniData.website || '',
      establishedYear: uniData.establishedYear || null,
    });
    uniCount++;

    // Create courses
    const createdCourseIds = [];
    for (const c of coursesData) {
      const category = normalizeCategory(c.level, c.name);
      const stream = (() => {
        const n = (c.name || '').toLowerCase();
        if (n.includes('mba') || n.includes('business') || n.includes('management') || n.includes('commerce')) return 'Management';
        if (n.includes('engineering') || n.includes('b.tech') || n.includes('btech') || n.includes('beng') || n.includes('b.eng')) return 'Engineering';
        if (n.includes('science') || n.includes('msc') || n.includes('bsc') || n.includes('b.sc')) return 'Science';
        if (n.includes('law') || n.includes('llb') || n.includes('llm')) return 'Law';
        if (n.includes('design') || n.includes('ied')) return 'Design';
        if (n.includes('data') || n.includes('cs') || n.includes('computer') || n.includes('information technology')) return 'IT & Computer Science';
        if (n.includes('finance') || n.includes('accounting') || n.includes('economics')) return 'Commerce';
        if (n.includes('arts') || n.includes('ba') || n.includes('humanities')) return 'Arts';
        return 'Others';
      })();

      const created = await Course.create({
        universityId: uni._id,
        name: c.name,
        category,
        stream,
        baseCourse: c.name,
        specializationName: 'General',
        duration: c.duration || '',
        totalSeats: c.totalSeats || null,
        feesPerYear: c.feesPerYear || null,
        eligibility: c.eligibility || '',
        entranceExams: c.entranceExams || [],
      });
      createdCourseIds.push(created._id);
      courseCount++;
    }

    // Link courses to university
    uni.courses = createdCourseIds;
    await uni.save();

    console.log(`  ✓ ${uni.name} (${coursesData.length} courses, ${uniData.email ? 'email' : ''} ${uniData.website ? 'website' : ''})`);
  }

  console.log(`\n=== SUCCESS ===`);
  console.log(`${uniCount} foreign universities | ${courseCount} courses`);

  // Final count
  const total = await University.countDocuments({ type: 'foreign' });
  console.log(`Total foreign in DB: ${total}`);

  process.exit(0);
}

importForeign().catch(e => { console.error(e); process.exit(1); });
