/**
 * MASTER FIX SCRIPT
 * 1. Remove duplicate courses (same name + universityId)
 * 2. Fix baseCourse & specializationName by properly parsing course names
 * 3. Merge duplicate foreign universities
 * 4. Fill missing university stats from Excel data
 */
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const xlsx = require('xlsx');
const slugify = require('slugify');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.client.db('vidyarthi-mitra');
  const courses = db.collection('courses');
  const universities = db.collection('universities');

  // ============================================================
  // STEP 1: Remove duplicate courses (same name + universityId)
  // ============================================================
  console.log('\n=== STEP 1: Removing duplicate courses ===');
  const dupePipeline = [
    { $group: { 
      _id: { name: '$name', universityId: '$universityId' }, 
      count: { $sum: 1 }, 
      ids: { $push: '$_id' } 
    }},
    { $match: { count: { $gt: 1 } } }
  ];
  const dupes = await courses.aggregate(dupePipeline).toArray();
  let removedCount = 0;
  for (const dupe of dupes) {
    // Keep the first, remove the rest
    const idsToRemove = dupe.ids.slice(1);
    await courses.deleteMany({ _id: { $in: idsToRemove } });
    removedCount += idsToRemove.length;
  }
  console.log(`  Removed ${removedCount} duplicate courses`);

  // ============================================================
  // STEP 2: Fix baseCourse + specializationName parsing
  // ============================================================
  console.log('\n=== STEP 2: Fixing baseCourse & specialization ===');
  
  // Patterns: [regex to match base, baseCourse name, stream]
  const BASE_PATTERNS = [
    // Engineering
    [/^B\.?\s*Tech\b/i, 'B.Tech', 'Engineering', 'UG'],
    [/^M\.?\s*Tech\b/i, 'M.Tech', 'Engineering', 'PG'],
    [/^B\.?\s*E\.?\s*[\(\-\s]/i, 'B.E.', 'Engineering', 'UG'],
    [/^M\.?\s*E\.?\s*[\(\-\s]/i, 'M.E.', 'Engineering', 'PG'],
    
    // Management
    [/^MBA\b/i, 'MBA', 'Management', 'PG'],
    [/^BBA\b/i, 'BBA', 'Management', 'UG'],
    [/^BMS\b/i, 'BMS', 'Management', 'UG'],
    [/^PGDM\b/i, 'PGDM', 'Management', 'PG'],
    [/^B\.?\s*B\.?\s*A\b.*Honors?\b/i, 'BBA', 'Management', 'UG'],
    
    // Medical
    [/^MBBS\b/i, 'MBBS', 'Medical', 'UG'],
    [/^BDS\b/i, 'BDS', 'Medical', 'UG'],
    [/^BHMS\b|^B\.?\s*H\.?\s*M\.?\s*S/i, 'BHMS', 'Medical', 'UG'],
    [/^BAMS\b/i, 'BAMS', 'Medical', 'UG'],
    [/^BUMS\b/i, 'BUMS', 'Medical', 'UG'],
    [/^MD\b/i, 'MD', 'Medical', 'PG'],
    [/^B\.?\s*Sc\.?\s*Nursing/i, 'B.Sc Nursing', 'Medical', 'UG'],
    [/^M\.?\s*Sc\.?\s*Nursing/i, 'M.Sc Nursing', 'Medical', 'PG'],
    [/^BPT\b/i, 'BPT', 'Medical', 'UG'],
    [/^MPT\b/i, 'MPT', 'Medical', 'PG'],
    [/^GNM\b/i, 'GNM', 'Medical', 'Diploma'],
    [/^ANM\b/i, 'ANM', 'Medical', 'Diploma'],
    
    // Pharmacy
    [/^B\.?\s*Pharm/i, 'B.Pharm', 'Pharmacy', 'UG'],
    [/^M\.?\s*Pharm/i, 'M.Pharm', 'Pharmacy', 'PG'],
    [/^D\.?\s*Pharm/i, 'D.Pharm', 'Pharmacy', 'Diploma'],
    [/^Pharm\.?\s*D\b/i, 'Pharm.D', 'Pharmacy', 'UG'],
    
    // Law
    [/^BA\.?\s*LL\.?B/i, 'BA LLB', 'Law', 'UG'],
    [/^BBA\.?\s*LL\.?B/i, 'BBA LLB', 'Law', 'UG'],
    [/^B\.?Com\.?\s*LL\.?B/i, 'B.Com LLB', 'Law', 'UG'],
    [/^LL\.?B\b/i, 'LLB', 'Law', 'UG'],
    [/^LL\.?M\b/i, 'LLM', 'Law', 'PG'],
    
    // Commerce
    [/^B\.?\s*Com\b/i, 'B.Com', 'Commerce', 'UG'],
    [/^M\.?\s*Com\b/i, 'M.Com', 'Commerce', 'PG'],
    
    // Arts
    [/^B\.?\s*A\.?\s*[\(\-\s\.]/i, 'BA', 'Arts', 'UG'],
    [/^BA$/i, 'BA', 'Arts', 'UG'],
    [/^M\.?\s*A\.?\s*[\(\-\s\.]/i, 'MA', 'Arts', 'PG'],
    [/^MA$/i, 'MA', 'Arts', 'PG'],
    [/^BFA\b/i, 'BFA', 'Arts', 'UG'],
    [/^MFA\b/i, 'MFA', 'Arts', 'PG'],
    
    // Science
    [/^B\.?\s*Sc\b/i, 'B.Sc', 'Science', 'UG'],
    [/^M\.?\s*Sc\b/i, 'M.Sc', 'Science', 'PG'],
    
    // IT
    [/^BCA\b|^B\.?\s*C\.?\s*A\b/i, 'BCA', 'IT & Computer Science', 'UG'],
    [/^MCA\b|^M\.?\s*C\.?\s*A\b/i, 'MCA', 'IT & Computer Science', 'PG'],
    
    // Design
    [/^B\.?\s*Des/i, 'B.Des', 'Design', 'UG'],
    [/^M\.?\s*Des/i, 'M.Des', 'Design', 'PG'],
    
    // Architecture
    [/^B\.?\s*Arch/i, 'B.Arch', 'Architecture', 'UG'],
    [/^M\.?\s*Arch/i, 'M.Arch', 'Architecture', 'PG'],
    
    // Education
    [/^B\.?\s*Ed/i, 'B.Ed', 'Education', 'UG'],
    [/^M\.?\s*Ed/i, 'M.Ed', 'Education', 'PG'],
    [/^B\.?\s*P\.?\s*Ed/i, 'B.P.Ed', 'Education', 'UG'],
    [/^D\.?\s*El\.?\s*Ed/i, 'D.El.Ed', 'Education', 'Diploma'],
    
    // Hotel
    [/^BHM\b/i, 'BHM', 'Hotel Management', 'UG'],
    
    // Media
    [/^BJMC\b/i, 'BJMC', 'Media & Mass Communication', 'UG'],
    [/^MJMC\b/i, 'MJMC', 'Media & Mass Communication', 'PG'],
    
    // Social Work
    [/^BSW\b/i, 'BSW', 'Social Work', 'UG'],
    [/^MSW\b/i, 'MSW', 'Social Work', 'PG'],
    
    // PhD
    [/^Ph\.?\s*D\b/i, 'Ph.D', 'Research', 'PhD'],
    [/^PhD\b/i, 'Ph.D', 'Research', 'PhD'],
    [/^Doctor(ate|al)\b/i, 'Ph.D', 'Research', 'PhD'],
    
    // Diploma
    [/^Diploma\b/i, 'Diploma', 'Others', 'Diploma'],
    [/^Polytechnic\b/i, 'Polytechnic', 'Engineering', 'Diploma'],
    [/^Certificate\b/i, 'Certificate', 'Others', 'Diploma'],
    [/^PG\s*Diploma\b|^PGDCA\b|^PGDCSR\b/i, 'PG Diploma', 'Others', 'PG'],
  ];

  // Extract specialization from course name after removing the baseCourse prefix
  function parseCourseName(name) {
    if (!name) return { baseCourse: 'Others', specializationName: 'General', stream: 'Others', category: 'UG' };
    
    const trimmed = name.trim();
    
    for (const [regex, baseCourse, stream, category] of BASE_PATTERNS) {
      if (regex.test(trimmed)) {
        // Extract specialization: everything after the base course match
        let spec = trimmed.replace(regex, '').trim();
        // Clean up parentheses, dashes, and common prefixes
        spec = spec.replace(/^[\s\-–—:,\(\)]+/, '').replace(/[\(\)]+$/, '').trim();
        // Remove common wrappers
        spec = spec.replace(/^\(/, '').replace(/\)$/, '').trim();
        // If spec is just the repeated base name or empty, use General
        if (!spec || spec.length < 2 || spec.toLowerCase() === baseCourse.toLowerCase()) {
          spec = 'General';
        }
        return { baseCourse, specializationName: spec, stream, category };
      }
    }
    
    // Fallback: try to detect from keywords in the name
    const lower = trimmed.toLowerCase();
    if (lower.includes('bachelor')) return { baseCourse: 'Bachelor', specializationName: trimmed.replace(/bachelor\s*(of|in)\s*/i, '').trim() || 'General', stream: 'Others', category: 'UG' };
    if (lower.includes('master')) return { baseCourse: 'Master', specializationName: trimmed.replace(/master\s*(of|in)\s*/i, '').trim() || 'General', stream: 'Others', category: 'PG' };
    
    // Truly unmatched: use the name as baseCourse
    return { baseCourse: trimmed, specializationName: 'General', stream: 'Others', category: 'UG' };
  }

  const allCourses = await courses.find({}).toArray();
  let fixedCount = 0;
  
  for (const course of allCourses) {
    const parsed = parseCourseName(course.name);
    
    await courses.updateOne({ _id: course._id }, { $set: {
      baseCourse: parsed.baseCourse,
      specializationName: parsed.specializationName,
      stream: parsed.stream,
      category: parsed.category,
    }});
    fixedCount++;
    if (fixedCount % 1000 === 0) console.log(`  Fixed ${fixedCount}/${allCourses.length}...`);
  }
  console.log(`  Fixed ${fixedCount} courses total`);

  // ============================================================
  // STEP 3: Merge duplicate foreign universities
  // ============================================================
  console.log('\n=== STEP 3: Merging duplicate foreign universities ===');
  const foreignUnis = await universities.find({ type: 'foreign' }).toArray();
  
  // Group by simplified name
  const foreignGroups = {};
  for (const uni of foreignUnis) {
    // Simplify: remove "India", campus info, etc.
    const simpleName = uni.name
      .replace(/\s*India\s*/i, ' ')
      .replace(/\s*\(.*\)\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (!foreignGroups[simpleName]) foreignGroups[simpleName] = [];
    foreignGroups[simpleName].push(uni);
  }
  
  let mergedCount = 0;
  for (const [name, group] of Object.entries(foreignGroups)) {
    if (group.length <= 1) continue;
    
    // Keep the one with the most courses / most info
    const sorted = group.sort((a, b) => (b.courses?.length || 0) - (a.courses?.length || 0));
    const keep = sorted[0];
    const remove = sorted.slice(1);
    
    for (const dup of remove) {
      // Move courses from dup to keep
      await courses.updateMany(
        { universityId: dup._id },
        { $set: { universityId: keep._id } }
      );
      await universities.deleteOne({ _id: dup._id });
      mergedCount++;
    }
  }
  console.log(`  Merged ${mergedCount} duplicate foreign universities`);

  // ============================================================
  // STEP 4: Fill missing university stats from Excel data
  // ============================================================
  console.log('\n=== STEP 4: Filling missing university stats from Excel ===');
  
  const DATA_DIR = path.resolve(__dirname, 'data');
  const allXlsx = [];
  
  function findXlsx(dir) {
    const fs = require('fs');
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) findXlsx(full);
        else if (item.name.endsWith('.xlsx') && !item.name.startsWith('~')) allXlsx.push(full);
      }
    } catch(e) {}
  }
  findXlsx(DATA_DIR);
  console.log(`  Found ${allXlsx.length} Excel files to scan`);

  // Key column names we want to extract stats from
  const STAT_COLS = {
    totalStudents: ['Total Students', 'Student Strength', 'No. of Students', 'Student_Strength', 'Total Student Intake', 'Total Enrollment'],
    avgPackageLPA: ['Average Package', 'Avg Package', 'Average Placement Package', 'Avg_Package_LPA', 'Average Package (LPA)'],
    highestPackageLPA: ['Highest Package', 'Highest_Package_LPA', 'Highest Package (LPA)', 'Max Package'],
    placementPercentage: ['Placement Rate', 'Placement %', 'Placement Percentage', 'Placement_Rate', 'Placement Rate (%)'],
    campusSizeAcres: ['Campus Area', 'Campus Size', 'Campus_Size_Acres', 'Campus Area (Acres)'],
    website: ['Official Website', 'Website', 'URL', 'Official_Website'],
    establishedYear: ['Year of Establishment', 'Est Year', 'Established', 'Year', 'Established Year', 'Establishment Year'],
    naacGrade: ['NAAC Grade', 'NAAC', 'NAAC_Grade', 'NAAC Accreditation'],
    nirfRank: ['NIRF Rank', 'NIRF', 'NIRF_Rank', 'NIRF Ranking'],
    description: ['Description', 'About', 'Overview', 'About University'],
  };

  function findCol(row, candidates) {
    for (const key of Object.keys(row)) {
      const lower = key.toLowerCase().trim();
      for (const cand of candidates) {
        if (lower === cand.toLowerCase()) return row[key];
      }
    }
    return null;
  }

  function findUniName(row) {
    const candidates = ['University Name', 'University_Name', 'Name of University', 'Name', 'Name of the University', 'universityname', 'University', 'Institute Name'];
    for (const key of Object.keys(row)) {
      for (const cand of candidates) {
        if (key.toLowerCase().trim() === cand.toLowerCase()) {
          return String(row[key] || '').trim();
        }
      }
    }
    return null;
  }

  let statsUpdated = 0;
  
  for (const file of allXlsx) {
    try {
      const wb = xlsx.readFile(file);
      for (const sheetName of wb.SheetNames) {
        const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
        if (data.length === 0) continue;
        
        for (const row of data) {
          const uniName = findUniName(row);
          if (!uniName || uniName.length < 3) continue;
          
          const slug = slugify(uniName, { lower: true, strict: true });
          const uni = await universities.findOne({ slug });
          if (!uni) continue;
          
          // Extract stats
          const updates = {};
          
          for (const [field, colNames] of Object.entries(STAT_COLS)) {
            const val = findCol(row, colNames);
            if (val === null || val === '' || val === undefined) continue;
            
            if (field === 'totalStudents' || field === 'campusSizeAcres') {
              const num = parseInt(String(val).replace(/[^\d]/g, ''));
              if (num && num > 0 && !uni.stats?.[field]) updates[`stats.${field}`] = num;
            } else if (field === 'avgPackageLPA' || field === 'highestPackageLPA') {
              let num = parseFloat(String(val).replace(/[^\d.]/g, ''));
              // If value seems to be in lakhs already
              if (num > 100) num = num / 100000;
              if (num && num > 0 && !uni.stats?.[field]) updates[`stats.${field}`] = Math.round(num * 10) / 10;
            } else if (field === 'placementPercentage') {
              const num = parseFloat(String(val).replace(/[^\d.]/g, ''));
              if (num && num > 0 && num <= 100 && !uni.stats?.[field]) updates[`stats.${field}`] = num;
            } else if (field === 'establishedYear') {
              const num = parseInt(String(val).replace(/[^\d]/g, ''));
              if (num && num > 1800 && num < 2030 && !uni.establishedYear) updates.establishedYear = num;
            } else if (field === 'nirfRank') {
              const num = parseInt(String(val).replace(/[^\d]/g, ''));
              if (num && num > 0 && num < 500 && !uni.nirfRank) updates.nirfRank = num;
            } else if (field === 'naacGrade') {
              const grade = String(val).trim();
              if (grade && !uni.naacGrade) updates.naacGrade = grade;
            } else if (field === 'website') {
              const url = String(val).trim();
              if (url && url.includes('.') && !uni.website) updates.website = url;
            } else if (field === 'description') {
              const desc = String(val).trim();
              if (desc && desc.length > 20 && !uni.description) updates.description = desc;
            }
          }
          
          if (Object.keys(updates).length > 0) {
            await universities.updateOne({ _id: uni._id }, { $set: updates });
            statsUpdated++;
          }
        }
      }
    } catch(e) {
      // Skip problematic files silently
    }
  }
  console.log(`  Updated stats for ${statsUpdated} universities`);

  // ============================================================
  // STEP 5: Update course counts on universities
  // ============================================================
  console.log('\n=== STEP 5: Updating course counts ===');
  const allUnis = await universities.find({}).toArray();
  for (const uni of allUnis) {
    const courseCount = await courses.countDocuments({ universityId: uni._id });
    const courseIds = await courses.find({ universityId: uni._id }).project({ _id: 1 }).toArray();
    await universities.updateOne({ _id: uni._id }, { $set: { 
      courses: courseIds.map(c => c._id),
      'stats.totalCoursesCount': courseCount
    }});
  }
  console.log(`  Updated course counts for ${allUnis.length} universities`);

  // ============================================================
  // FINAL STATS
  // ============================================================
  const totalUni = await universities.countDocuments();
  const totalCourses = await courses.countDocuments();
  const withLogos = await universities.countDocuments({ logoUrl: { $exists: true, $ne: null } });
  const streams = await courses.aggregate([
    { $group: { _id: '$stream', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  const baseCourses = await courses.aggregate([
    { $group: { _id: '$baseCourse', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]).toArray();
  
  console.log(`\n=== FINAL STATS ===`);
  console.log(`Universities: ${totalUni} (${withLogos} with logos)`);
  console.log(`Courses: ${totalCourses}`);
  console.log('\nStreams:');
  streams.forEach(s => console.log(`  ${s._id}: ${s.count}`));
  console.log('\nTop 20 Base Courses:');
  baseCourses.forEach(b => console.log(`  ${b._id}: ${b.count}`));
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
