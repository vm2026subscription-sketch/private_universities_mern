const path = require('path');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const fs = require('fs');
const slugify = require('slugify');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const connectDB = require('./src/config/db');
const University = require('./src/models/University');
const Course = require('./src/models/Course');

const ALL_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi NCR', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal'
];

function extractInfoFromFileName(filename) {
    let state = 'Unknown';
    let type = 'private';
    const lower = filename.toLowerCase();
    if (lower.includes('deemed')) type = 'deemed';
    for (const s of ALL_STATES) {
        if (lower.includes(s.toLowerCase().replace(/\s+/g, '_')) || lower.includes(s.toLowerCase())) {
            state = s;
            break;
        }
    }
    return { state, type };
}

function findHeaderRow(sheetData) {
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
        const row = sheetData[i];
        if (!row || !Array.isArray(row)) continue;
        const rowStr = row.map(c => (c || '').toString().toLowerCase()).join('|');
        // Look for multiple identifying keywords
        const keywords = ['university', 'name', 'state', 'city', 'course', 'degree', 'type'];
        const matches = keywords.filter(k => rowStr.includes(k));
        if (matches.length >= 3 && row.filter(c => c !== null && c !== '').length > 3) return i;
    }
    return 0;
}

function normalizeHeader(header) {
    if (!header) return '';
    return header.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractNumber(str) {
    if (str === null || str === undefined) return null;
    const num = parseFloat(String(str).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : num;
}

function detectCategory(name) {
    const n = name.toLowerCase();
    if (n.includes('phd') || n.includes('ph.d')) return 'PhD';
    if (n.includes('diploma')) return 'Diploma';
    if (n.includes('master') || n.includes('m.a') || n.includes('m.sc') || n.includes('m.tech') || n.includes('mba')) return 'PG';
    if (n.includes('bachelor') || n.includes('b.a') || n.includes('b.sc') || n.includes('b.tech') || n.includes('bba')) return 'UG';
    return 'Others';
}

function cleanUniName(name) {
    if (!name) return '';
    return name.replace(/^\d+-/, '').trim();
}

const fakePatterns = [
    /BA -/i, /MA -/i, /Shastri \(/i, /Acharya \(/i, /BSc -/i, /MSc -/i, /LL\.B/i, /B\.Com/i, 
    /MBBS -/i, /LL\.M/i, /DM –/i, /DM -/i, /BUMS -/i, /Executive MBA/i
];

async function processFile(filePath) {
    console.log(`Processing: ${path.basename(filePath)}`);
    const { state: fileState } = extractInfoFromFileName(path.basename(filePath));

    const workbook = xlsx.readFile(filePath);
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
        if (rawData.length < 2) continue;

        const headerRowIndex = findHeaderRow(rawData);
        const headers = rawData[headerRowIndex].map(normalizeHeader);
        console.log(`  Sheet: ${sheetName} | Headers found at row ${headerRowIndex}: ${JSON.stringify(headers)}`);

        const nameIdx = headers.findIndex(h => h.includes('universityname') || h === 'nameofuniversity' || h === 'university');
        const stateIdx = headers.findIndex(h => h === 'state');
        const cityIdx = headers.findIndex(h => h === 'city' || h === 'location');
        const courseIdx = headers.findIndex(h => h === 'coursename' || h === 'course');
        const feeIdx = headers.findIndex(h => h.includes('fee') && !h.includes('application'));
        const durationIdx = headers.findIndex(h => h.includes('duration'));
        const typeIdx = headers.findIndex(h => h === 'type' || h === 'universitytype');

        if (nameIdx === -1) {
            console.log(`    Skipping sheet ${sheetName}: No university name column.`);
            continue;
        }

        const dataRows = rawData.slice(headerRowIndex + 1);
        for (const row of dataRows) {
            if (!row) continue;
            let rawName = row[nameIdx] ? row[nameIdx].toString().trim() : null;
            if (!rawName) continue;
            
            let name = cleanUniName(rawName);
            if (fakePatterns.some(p => p.test(name)) || name.length < 5) continue;

            const state = stateIdx !== -1 && row[stateIdx] ? row[stateIdx].toString().trim() : fileState;
            const city = cityIdx !== -1 && row[cityIdx] ? row[cityIdx].toString().trim() : 'Unknown';
            const type = (typeIdx !== -1 && row[typeIdx] && row[typeIdx].toString().toLowerCase().includes('deemed')) ? 'deemed' : 'private';

            // Use a stable slug or one with ID to avoid conflicts
            const baseSlug = slugify(name, { lower: true, strict: true });
            
            const uniUpdate = { name, state, city, type };
            const uni = await University.findOneAndUpdate(
                { name }, 
                { $set: uniUpdate }, 
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            // Re-generate slug if it's missing or from an old format
            if (!uni.slug) {
                uni.slug = `${baseSlug}-${uni._id.toString().slice(-4)}`;
                await uni.save();
            }

            // Handle Course
            if (courseIdx !== -1 && row[courseIdx]) {
                const cName = row[courseIdx].toString().trim();
                if (cName.length > 2) {
                    const category = detectCategory(cName);
                    const courseSlug = slugify(`${uni.slug} ${cName}`, { lower: true, strict: true });
                    const fee = feeIdx !== -1 ? extractNumber(row[feeIdx]) : undefined;
                    const duration = durationIdx !== -1 ? extractNumber(row[durationIdx]) : 3;

                    const courseData = {
                        universityId: uni._id,
                        name: cName,
                        slug: courseSlug,
                        category,
                        duration: (duration && duration < 10) ? duration : 3,
                        feesPerYear: fee
                    };

                    const newCourse = await Course.findOneAndUpdate(
                        { slug: courseSlug },
                        { $set: courseData },
                        { upsert: true, new: true }
                    );
                    await University.findByIdAndUpdate(uni._id, { $addToSet: { courses: newCourse._id } });
                }
            }
        }
    }
}

async function main() {
    await connectDB();
    const files = [
        './data/extracted_clean/Private universities data/Ankur/Gujarat Private and Deemed University.xlsx',
        './data/extracted_clean/Private universities data/Ankur/Rajasthan Deemed and Private University.xlsx',
        './data/extracted_clean/Private universities data/Ankur/UP_Private_Deemed_Universities.xlsx',
        './data/extracted_clean/Private universities data/Ankur/CG_Universities_2024-25_FINAL.xlsx'
    ];
    for (const f of files) {
        await processFile(f);
    }
    console.log('Syncing course counts...');
    const unis = await University.find();
    for (const u of unis) {
        if (u.courses) {
            await University.findByIdAndUpdate(u._id, { 'stats.totalCoursesCount': u.courses.length });
        }
    }
    console.log('DONE');
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
