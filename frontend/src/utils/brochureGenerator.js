import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUniversityDisplayType } from './universityType';

// ─── helpers ─────────────────────────────────────────────────────────────────
const PC  = [13, 148, 136];   // primary teal  #0d9488
const ACC = [234, 88,  12];   // accent orange #ea580c
const DARK= [15,  23,  42];   // slate-900
const MID = [100, 116, 139];  // slate-500
const LIGHT=[248, 250, 252];  // slate-50

const safe = (v) => (v !== null && v !== undefined && v !== '') ? String(v) : 'N/A';
const pct  = (v, label) => label || (v != null ? `${v}%` : 'N/A');
const lpa  = (v, label) => label ? `INR ${label} LPA` : (v != null ? `INR ${v} LPA` : 'N/A');
const num  = (v, label, sfx = '') => label ? `${label}${sfx}` : (v != null ? `${v}${sfx}` : 'N/A');

/** Draw a coloured section-header bar */
const sectionHeader = (doc, text, y, color = PC) => {
  doc.setFillColor(...color);
  doc.rect(0, y - 6, 210, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(text, 14, y);
  doc.setTextColor(40, 40, 40);
};

/** Add a new page with a mini header strip */
const addPage = (doc) => {
  doc.addPage();
  doc.setFillColor(...PC);
  doc.rect(0, 0, 210, 8, 'F');
  return 18; // starting Y after the strip
};

/** Wrap long text and return how many lines it occupies */
const wrappedText = (doc, text, x, y, maxWidth, lineH = 5) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineH;
};

// ─── main export ─────────────────────────────────────────────────────────────
export const generateBrochure = (university) => {
  const doc  = new jsPDF();
  const u    = university;
  const type = getUniversityDisplayType(u);

  // ══════════════════════════════════════════════════════════════════════════
  //  PAGE 1 – Cover + Overview + Stats
  // ══════════════════════════════════════════════════════════════════════════

  // Cover header
  doc.setFillColor(...DARK);
  doc.rect(0, 0, 210, 50, 'F');

  // Teal accent stripe
  doc.setFillColor(...PC);
  doc.rect(0, 50, 210, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(u.name || 'University', 105, 22, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 220, 220);
  doc.text(`${u.city || ''}, ${u.state || ''}  ·  ${type}`, 105, 32, { align: 'center' });

  // Badge row
  const badges = [];
  if (u.naacGrade) badges.push(`NAAC ${u.naacGrade}`);
  if (u.nirfRank)  badges.push(`#${u.nirfRank} NIRF`);
  if (u.establishedYear) badges.push(`Est. ${u.establishedYear}`);

  doc.setFontSize(9);
  doc.setTextColor(180, 230, 225);
  doc.text(badges.join('   ·   '), 105, 44, { align: 'center' });

  // ── University Overview table ────────────────────────────────────────────
  let y = 66;
  sectionHeader(doc, '  UNIVERSITY AT A GLANCE', y);
  y += 8;

  const overview = [
    ['Institution Type',   type],
    ['Established',        safe(u.establishedYear)],
    ['NAAC Grade',         safe(u.naacGrade)],
    ['NIRF Rank',          u.nirfRank ? `#${u.nirfRank}` : 'N/A'],
    ['Website',            safe(u.website)],
    ['Email',              safe(u.email || u.admissions?.contactEmail)],
    ['Phone',              safe(u.phone || u.admissions?.contactPhone)],
    ['Address',            safe(u.address || `${u.city}, ${u.state}`)],
  ];

  let tr = autoTable(doc, {
    startY: y,
    body: overview,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: [240, 253, 250] },
      1: { cellWidth: 'auto' },
    },
  });

  // ── Stats & Highlights ───────────────────────────────────────────────────
  y = (tr?.finalY ?? doc.lastAutoTable?.finalY ?? 130) + 12;
  sectionHeader(doc, '  STATISTICS & HIGHLIGHTS', y);
  y += 8;

  const stats = [
    ['Total Students',      num(u.stats?.totalStudents, u.stats?.totalStudentsLabel)],
    ['Average Package',     lpa(u.stats?.avgPackageLPA, u.stats?.avgPackageLPALabel)],
    ['Highest Package',     lpa(u.stats?.highestPackageLPA, u.stats?.highestPackageLPALabel)],
    ['Placement Rate',      pct(u.stats?.placementPercentage, u.stats?.placementPercentageLabel)],
    ['Campus Size',         num(u.stats?.campusSizeAcres, u.stats?.campusSizeLabel, ' Acres')],
    ['Average Fees',        safe(u.stats?.avgFees)],
    ['Total Courses',       safe(u.stats?.totalCoursesCount || u.courses?.length)],
    ['Rating',              u.stats?.rating ? `${u.stats.rating} / 5` : 'N/A'],
  ];

  tr = autoTable(doc, {
    startY: y,
    body: stats,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
    },
    alternateRowStyles: { fillColor: LIGHT },
  });

  // ── Key Approvals ────────────────────────────────────────────────────────
  y = (tr?.finalY ?? doc.lastAutoTable?.finalY ?? 220) + 12;

  const approvals = u.approvals || {};
  const approvedList = Object.entries(approvals)
    .filter(([, v]) => v)
    .map(([k]) => k.toUpperCase());

  if (approvedList.length > 0 && y < 260) {
    sectionHeader(doc, '  KEY APPROVALS & AFFILIATIONS', y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(...MID);
    doc.text(approvedList.join('   |   '), 14, y);
    y += 8;
  }

  // ── Highlights ───────────────────────────────────────────────────────────
  if (u.highlights?.length > 0 && y < 255) {
    sectionHeader(doc, '  KEY HIGHLIGHTS', y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    u.highlights.slice(0, 6).forEach((h) => {
      doc.setFillColor(...PC);
      doc.circle(16, y - 1.5, 1.2, 'F');
      doc.text(h, 20, y);
      y += 6;
    });
  }

  // Footer page 1
  doc.setFontSize(7);
  doc.setTextColor(...MID);
  doc.text('Generated by Vidyarthi Mitra · vidyarthimitra.org', 105, 290, { align: 'center' });

  // ══════════════════════════════════════════════════════════════════════════
  //  PAGE 2 – Courses & Programs
  // ══════════════════════════════════════════════════════════════════════════
  y = addPage(doc);
  sectionHeader(doc, '  COURSES & PROGRAMS', y);
  y += 8;

  if (u.courses?.length > 0) {
    const courseRows = u.courses.map((c) => [
      c.name || c.baseCourse || '',
      c.category || '',
      c.duration ? `${c.duration} Yrs` : 'N/A',
      c.feesPerYearLabel
        ? `Rs. ${c.feesPerYearLabel}/yr`
        : c.feesPerYear
        ? `Rs. ${Number(c.feesPerYear).toLocaleString('en-IN')}/yr`
        : 'N/A',
      (c.entranceExams || []).slice(0, 3).join(', ') || 'N/A',
    ]);

    tr = autoTable(doc, {
      startY: y,
      head: [['Program Name', 'Level', 'Duration', 'Annual Fees', 'Entrance Exams']],
      body: courseRows,
      theme: 'grid',
      headStyles: { fillColor: PC, fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 35 },
        4: { cellWidth: 55 },
      },
    });
    y = (tr?.finalY ?? doc.lastAutoTable?.finalY ?? 150) + 12;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...MID);
    doc.text('No course data available.', 14, y + 6);
    y += 16;
  }

  // ── Admissions ───────────────────────────────────────────────────────────
  sectionHeader(doc, '  ADMISSIONS', y);
  y += 10;

  if (u.admissions?.overview) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    y = wrappedText(doc, u.admissions.overview, 14, y, 182);
    y += 4;
  }

  const admData = [
    ['Application Fee',       u.admissions?.applicationFee ? `Rs. ${u.admissions.applicationFee}` : 'N/A'],
    ['Accepted Exams',        (u.admissions?.acceptedExams || []).join(', ') || 'N/A'],
    ['Counselling Info',      safe(u.admissions?.counsellingInfo)],
    ['Contact Email',         safe(u.admissions?.contactEmail || u.email)],
    ['Contact Phone',         safe(u.admissions?.contactPhone || u.phone)],
  ];

  tr = autoTable(doc, {
    startY: y,
    body: admData,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: [240, 253, 250] },
    },
  });
  y = (tr?.finalY ?? doc.lastAutoTable?.finalY ?? 200) + 12;

  // Admission Process steps
  if (u.admissions?.process?.length > 0 && y < 255) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PC);
    doc.text('Admission Process:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    u.admissions.process.slice(0, 8).forEach((step, i) => {
      doc.text(`${i + 1}. ${step}`, 18, y);
      y += 5.5;
    });
    y += 4;
  }

  // Documents Required
  if (u.admissions?.documentsRequired?.length > 0 && y < 265) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PC);
    doc.text('Documents Required:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(u.admissions.documentsRequired.join('  ·  '), 18, y, { maxWidth: 178 });
  }

  doc.setFontSize(7);
  doc.setTextColor(...MID);
  doc.text('Generated by Vidyarthi Mitra · vidyarthimitra.org', 105, 290, { align: 'center' });

  // ══════════════════════════════════════════════════════════════════════════
  //  PAGE 3 – Placements, Campus, Scholarships & Links
  // ══════════════════════════════════════════════════════════════════════════
  y = addPage(doc);

  // ── Placements ───────────────────────────────────────────────────────────
  sectionHeader(doc, '  PLACEMENT & CAREER', y);
  y += 8;

  const placementData = [
    ['Average Package',   lpa(u.stats?.avgPackageLPA, u.stats?.avgPackageLPALabel)],
    ['Highest Package',   lpa(u.stats?.highestPackageLPA, u.stats?.highestPackageLPALabel)],
    ['Placement Rate',    pct(u.stats?.placementPercentage, u.stats?.placementPercentageLabel)],
  ];

  tr = autoTable(doc, {
    startY: y,
    body: placementData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
    },
    alternateRowStyles: { fillColor: LIGHT },
  });
  y = (tr?.finalY ?? doc.lastAutoTable?.finalY ?? 60) + 6;

  if (u.topRecruiters?.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PC);
    doc.text('Top Recruiters:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const cols = 4;
    const colW = 45;
    u.topRecruiters.slice(0, 20).forEach((r, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      if (col === 0 && row > 0) y += 6;
      doc.text(`• ${r}`, 14 + col * colW, y);
    });
    y += 12;
  }

  // ── Campus ───────────────────────────────────────────────────────────────
  if (y > 240) { y = addPage(doc); }
  sectionHeader(doc, '  CAMPUS LIFE & INFRASTRUCTURE', y);
  y += 8;

  if (u.campus?.overview) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    y = wrappedText(doc, u.campus.overview, 14, y, 182);
    y += 4;
  }

  const campusData = [
    ['Hostel / Accommodation', safe(u.campus?.hostelDetails)],
    ['Library',                safe(u.campus?.libraryDetails)],
    ['Labs & Research',        safe(u.campus?.labDetails)],
    ['Sports & Recreation',    safe(u.campus?.sportsDetails)],
    ['Transport',              safe(u.campus?.transportDetails)],
    ['Medical Support',        safe(u.campus?.medicalSupport)],
    ['WiFi Campus',            u.campus?.wifiAvailable ? 'Yes' : 'N/A'],
  ].filter(([, v]) => v !== 'N/A');

  if (campusData.length > 0) {
    tr = autoTable(doc, {
      startY: y,
      body: campusData,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55, fillColor: [240, 253, 250] },
      },
    });
    y = (tr?.finalY ?? doc.lastAutoTable?.finalY ?? y + 40) + 12;
  }

  // Facilities
  if (u.facilities?.length > 0 && y < 255) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PC);
    doc.text('Campus Facilities:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    y = wrappedText(doc, u.facilities.join('   ·   '), 14, y, 182);
    y += 8;
  }

  // ── Scholarships ──────────────────────────────────────────────────────────
  if (u.scholarships?.length > 0) {
    if (y > 220) { y = addPage(doc); }
    sectionHeader(doc, '  SCHOLARSHIPS & FINANCIAL AID', y);
    y += 8;

    const schData = u.scholarships.map((s) => [
      s.name || '',
      s.description || s.eligibility || 'N/A',
      safe(s.amount),
      s.deadline ? new Date(s.deadline).toLocaleDateString('en-IN') : 'N/A',
    ]);

    tr = autoTable(doc, {
      startY: y,
      head: [['Scholarship', 'Details / Eligibility', 'Value', 'Deadline']],
      body: schData,
      theme: 'grid',
      headStyles: { fillColor: ACC, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 80 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
      },
    });
    y = (tr?.finalY ?? doc.lastAutoTable?.finalY ?? y + 40) + 12;
  }

  // ── Important Links ────────────────────────────────────────────────────────
  const links = u.links || {};
  const linkRows = [
    ['Admission Portal',    safe(links.admissionLink)],
    ['Official Brochure',   safe(links.brochureLink)],
    ['Placement Report',    safe(links.placementReportLink)],
    ['Scholarship Info',    safe(links.scholarshipLink)],
    ['Hostel Info',         safe(links.hostelLink)],
    ['Campus Map',          safe(links.mapLink)],
    ['Virtual Tour',        safe(u.campus?.virtualTourLink)],
  ].filter(([, v]) => v !== 'N/A');

  if (linkRows.length > 0) {
    if (y > 230) { y = addPage(doc); }
    sectionHeader(doc, '  IMPORTANT LINKS', y, ACC);
    y += 8;

    tr = autoTable(doc, {
      startY: y,
      body: linkRows,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { textColor: [13, 148, 136] },
      },
      alternateRowStyles: { fillColor: LIGHT },
    });
    y = (tr?.finalY ?? doc.lastAutoTable?.finalY ?? y + 40) + 12;
  }

  // ── News Links ──────────────────────────────────────────────────────────
  if (u.newsLinks?.length > 0 && y < 240) {
    sectionHeader(doc, '  LATEST NEWS & PRESS', y, [51, 65, 85]);
    y += 8;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    u.newsLinks.slice(0, 5).forEach((n, i) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${n.title}`, 14, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MID);
      doc.text(n.url || '', 18, y);
      doc.setTextColor(40, 40, 40);
      y += 5;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Footer on ALL pages
  // ══════════════════════════════════════════════════════════════════════════
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    // bottom rule
    doc.setDrawColor(...PC);
    doc.setLineWidth(0.4);
    doc.line(10, 286, 200, 286);
    doc.setFontSize(7);
    doc.setTextColor(...MID);
    doc.text('Generated by Vidyarthi Mitra · vidyarthimitra.org', 14, 291);
    doc.text(`Page ${i} of ${total}`, 196, 291, { align: 'right' });
  }

  const fileName = (u.slug || u.name || 'university').replace(/\s+/g, '_');
  doc.save(`${fileName}_brochure.pdf`);
};
