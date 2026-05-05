const path = require('path');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const fs = require('fs');
const slugify = require('slugify');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

function extractInfoFromFileName(filename) {
    let state = 'Unknown';
    let type = 'private';
    const lower = filename.toLowerCase();
    if (lower.includes('deemed')) type = 'deemed';
    const states = [
        ['andaman', 'Andaman and Nicobar Islands'], ['andhra', 'Andhra Pradesh'], ['arunachal', 'Arunachal Pradesh'],
        ['assam', 'Assam'], ['bihar', 'Bihar'], ['chandigarh', 'Chandigarh'], ['chhattisgarh', 'Chhattisgarh'],
        ['cg_', 'Chhattisgarh'], ['dadra', 'Dadra and Nagar Haveli'], ['daman', 'Daman and Diu'], ['delhi', 'Delhi NCR'],
        ['goa', 'Goa'], ['gujarat', 'Gujarat'], ['haryana', 'Haryana'], ['hp_', 'Himachal Pradesh'], ['himachal', 'Himachal Pradesh'],
        ['jammu', 'Jammu and Kashmir'], ['jharkhand', 'Jharkhand'], ['karnataka', 'Karnataka'], ['kerala', 'Kerala'],
        ['ladakh', 'Ladakh'], ['lakshadweep', 'Lakshadweep'], ['madhya', 'Madhya Pradesh'], ['mp_', 'Madhya Pradesh'],
        ['maharashtra', 'Maharashtra'], ['manipur', 'Manipur'], ['meghalaya', 'Meghalaya'], ['mizoram', 'Mizoram'],
        ['nagaland', 'Nagaland'], ['odisha', 'Odisha'], ['puducherry', 'Puducherry'], ['punjab', 'Punjab'],
        ['rajasthan', 'Rajasthan'], ['sikkim', 'Sikkim'], ['tamil', 'Tamil Nadu'], ['tn_', 'Tamil Nadu'],
        ['telangana', 'Telangana'], ['tripura', 'Tripura'], ['uttar', 'Uttar Pradesh'], ['up_', 'Uttar Pradesh'],
        ['uttarakhand', 'Uttarakhand'], ['west_bengal', 'West Bengal'], ['west bengal', 'West Bengal'], ['ap_', 'Andhra Pradesh']
    ];
    for (const [keyword, stateName] of states) {
        if (lower.includes(keyword)) { state = stateName; break; }
    }
    return { state, type };
}

function findHeaderRow(sheetData) {
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
        const row = sheetData[i];
        if (!row || !Array.isArray(row)) continue;
        const rowStr = row.map(c => (c || '').toString().toLowerCase()).join('|');
        let score = 0;
        if (rowStr.includes('university') || rowStr.includes('name')) score++;
        if (rowStr.includes('state') || rowStr.includes('city') || rowStr.includes('address') || rowStr.includes('location')) score++;
        if (rowStr.includes('course') || rowStr.includes('program') || rowStr.includes('fee') || rowStr.includes('establishment')) score++;
        if (score >= 2 && row.filter(c => c !== null && c !== '').length > 3) return i;
    }
    return (sheetData[0] && sheetData[0].filter(Boolean).length > 3) ? 0 : 1;
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
    if (n.includes('phd') || n.includes('ph.d') || n.includes('doctorate')) return 'PhD';
    if (n.includes('diploma') || n.includes('pgdm') || n.includes('certification')) return 'Diploma';
    if (n.includes('master') || n.includes('m.a') || n.includes('m.sc') || n.includes('m.tech') || n.includes('mba') || n.includes('post graduate') || n.includes('pg ')) return 'PG';
    if (n.includes('bachelor') || n.includes('b.a') || n.includes('b.sc') || n.includes('b.tech') || n.includes('bba') || n.includes('under graduate') || n.includes('ug ')) return 'UG';
    return 'Others';
}

function isValidUniversityName(name) {
    if (!name || typeof name !== 'string') return false;
    const cleaned = name.trim().toLowerCase();
    const blacklist = ['private', 'deemed', 'government', 'public', 'central', 'state', 'type', 'category', 'status', 'university name', 'name of the university', 'sr.no', 'sr no', 's.no', 'sno'];
    if (blacklist.includes(cleaned)) return false;
    return cleaned.length >= 5;
}

async function processFile(filePath) {
    console.log(`\nProcessing: ${path.basename(filePath)}`);
    const { state: fileState, type: fileType } = extractInfoFromFileName(path.basename(filePath));

    try {
        const workbook = xlsx.readFile(filePath);
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

            if (rawData.length < 2) continue;

            const headerRowIndex = findHeaderRow(rawData);
            const rawHeaders = rawData[headerRowIndex];
            if (!rawHeaders) continue;
            const headers = rawHeaders.map(normalizeHeader);

            let nameIdx = headers.findIndex(h => h.includes('universityname') || h === 'nameofuniversity' || h === 'university' || h === 'institute' || h === 'institutename');
            
            // If we didn't find an explicit university name column, look for "name"
            // but ONLY if the column name doesn't contain "course" or "program"
            if (nameIdx === -1) {
                const possibleIdx = headers.findIndex(h => (h === 'name' || h.includes('name')) && !h.includes('course') && !h.includes('program'));
                if (possibleIdx !== -1) nameIdx = possibleIdx;
            }

            // Determine if the sheet name itself is the University Name (for sheets that only list courses)
            const isCourseOnlySheet = nameIdx === -1;
            const fallbackUniName = isCourseOnlySheet ? sheetName.trim() : null;

            if (isCourseOnlySheet && !isValidUniversityName(fallbackUniName)) {
                console.log(`    Skipping sheet ${sheetName}: Cannot determine university name.`);
                continue;
            }

            console.log(`  - Sheet: ${sheetName} (${rawData.length - headerRowIndex - 1} rows)`);

            const stateIdx = headers.findIndex(h => h === 'state');
            const cityIdx = headers.findIndex(h => h === 'city' || h === 'location' || h.includes('city') || h.includes('location'));
            const typeIdx = headers.findIndex(h => h === 'type' || h === 'universitytype');
            const naacIdx = headers.findIndex(h => h.includes('naac'));
            const nirfIdx = headers.findIndex(h => h === 'nirfrank' || h === 'nirfranking' || (h.includes('rank') && !h.includes('entrance')));
            const websiteIdx = headers.findIndex(h => h.includes('website') || h === 'url');
            const emailIdx = headers.findIndex(h => h.includes('email'));
            const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('contact'));
            const estIdx = headers.findIndex(h => h.includes('establishment') || h === 'est' || h === 'estd');
            const campusIdx = headers.findIndex(h => h.includes('campus') && h.includes('size'));
            const avgPkgIdx = headers.findIndex(h => h.includes('average') && h.includes('package'));
            const highPkgIdx = headers.findIndex(h => h.includes('highest') && h.includes('package'));
            const placementIdx = headers.findIndex(h => h.includes('placement') && (h.includes('percent') || h.includes('rate') || h.includes('avail')));
            const recruitersIdx = headers.findIndex(h => h.includes('recruiters'));
            const scholarshipIdx = headers.findIndex(h => h.includes('scholarship') && h.includes('detail'));
            const addressIdx = headers.findIndex(h => h.includes('address'));
            const ugcIdx = headers.findIndex(h => h.includes('ugc') || h.includes('approval'));
            const appFeeIdx = headers.findIndex(h => h.includes('applicationfee'));
            const deadlineIdx = headers.findIndex(h => h.includes('deadline'));
            const hostelIdx = headers.findIndex(h => h.includes('hostel'));
            const totalCoursesIdx = headers.findIndex(h => h.includes('totalcourse') || h === 'totalcourses' || h === 'coursesoffered' || h === 'courses');
            const brochureIdx = headers.findIndex(h => h.includes('brochure') || h.includes('prospectus'));
            const ratingIdx = headers.findIndex(h => h === 'rating' || h.includes('rating'));

            const courseIdx = (() => {
                let idx = headers.findIndex(h => h === 'coursename' || h === 'coursesoffered' || h === 'course');
                if (idx === -1) idx = headers.findIndex(h => h.includes('course') && !h.includes('total') && !h.includes('count') && !h.includes('fee'));
                return idx;
            })();
            const durationIdx = headers.findIndex(h => h === 'duration' || (h.includes('duration') && !h.includes('establishment')));
            const feeIdx = headers.findIndex(h => (h.includes('fee') || h.includes('fees') || h.includes('feesstructure')) && !h.includes('application'));
            const examIdx = headers.findIndex(h => h.includes('exam') || h.includes('entrance'));
            const totalSeatIdx = headers.findIndex(h => h.includes('total') && h.includes('seat'));

            const dataRows = rawData.slice(headerRowIndex + 1);
            let count = 0;

            for (const row of dataRows) {
                if (!row) continue;
                let name = isCourseOnlySheet ? fallbackUniName : (row[nameIdx] ? row[nameIdx].toString().trim() : null);
                if (!name || !isValidUniversityName(name)) continue;

                const state = stateIdx !== -1 && row[stateIdx] ? row[stateIdx].toString().trim() : fileState;
                const slug = slugify(name, { lower: true, strict: true });
                if (!slug) continue;

                const nirf = nirfIdx !== -1 ? extractNumber(row[nirfIdx]) : undefined;
                const ratingValue = ratingIdx !== -1 ? extractNumber(row[ratingIdx]) : (nirf && nirf < 50 ? 4.8 : (nirf && nirf < 100 ? 4.5 : (4.0 + Math.random() * 0.7).toFixed(1)));
                const avgFeeValue = feeIdx !== -1 && row[feeIdx] ? row[feeIdx].toString().replace(/[^0-9.]/g, '') : undefined;

                const update = {
                    name, state,
                    city: cityIdx !== -1 && row[cityIdx] ? row[cityIdx].toString().trim() : 'Unknown',
                    type: path.basename(filePath).toLowerCase().includes('foreign') ? 'foreign' : (typeIdx !== -1 && row[typeIdx] && row[typeIdx].toString().toLowerCase().includes('deemed') ? 'deemed' : 'private'),
                    naacGrade: naacIdx !== -1 && row[naacIdx] ? row[naacIdx].toString().trim() : undefined,
                    nirfRank: nirf,
                    website: websiteIdx !== -1 && row[websiteIdx] ? row[websiteIdx].toString().trim() : undefined,
                    email: emailIdx !== -1 && row[emailIdx] ? row[emailIdx].toString().trim() : undefined,
                    phone: phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].toString().trim() : undefined,
                    establishedYear: estIdx !== -1 ? extractNumber(row[estIdx]) : undefined,
                    address: addressIdx !== -1 && row[addressIdx] ? row[addressIdx].toString().trim() : undefined,
                    slug,
                    'stats.avgPackageLPA': avgPkgIdx !== -1 ? extractNumber(row[avgPkgIdx]) : undefined,
                    'stats.highestPackageLPA': highPkgIdx !== -1 ? extractNumber(row[highPkgIdx]) : undefined,
                    'stats.placementPercentage': placementIdx !== -1 ? extractNumber(row[placementIdx]) : undefined,
                    'stats.campusSizeAcres': campusIdx !== -1 ? extractNumber(row[campusIdx]) : undefined,
                    'stats.totalStudents': totalSeatIdx !== -1 ? extractNumber(row[totalSeatIdx]) : undefined,
                    'stats.totalCoursesCount': totalCoursesIdx !== -1 ? extractNumber(row[totalCoursesIdx]) : undefined,
                    'stats.avgFees': avgFeeValue ? `${(parseFloat(avgFeeValue) / 100000).toFixed(2)} L` : undefined,
                    'stats.rating': ratingValue,
                    'approvals.ugc': ugcIdx !== -1 && row[ugcIdx] ? row[ugcIdx].toString().toLowerCase().includes('approved') : false,
                    'links.brochureLink': brochureIdx !== -1 && row[brochureIdx] ? row[brochureIdx].toString().trim() : undefined,
                    'admissions.applicationFee': appFeeIdx !== -1 ? extractNumber(row[appFeeIdx]) : undefined,
                    'admissions.counsellingInfo': deadlineIdx !== -1 && row[deadlineIdx] ? `Deadline: ${row[deadlineIdx]}` : undefined,
                    'campus.hostelDetails': hostelIdx !== -1 && row[hostelIdx] ? `Hostel Facility: ${row[hostelIdx]}` : undefined
                };

                let uni;
                try {
                    uni = await University.findOneAndUpdate({ name }, { $set: update }, { upsert: true, new: true, setDefaultsOnInsert: true });
                } catch (err) {
                    if (err.code === 11000) {
                        update.slug = `${slug}-${slugify(update.city || 'uni', { lower: true, strict: true })}`;
                        uni = await University.findOneAndUpdate({ name }, { $set: update }, { upsert: true, new: true, setDefaultsOnInsert: true });
                    } else throw err;
                }

                if (recruitersIdx !== -1 && row[recruitersIdx]) {
                    const recruiters = row[recruitersIdx].toString().split(/[,/|\n]/).map(r => r.trim()).filter(r => r.length > 1);
                    await University.findByIdAndUpdate(uni._id, { $addToSet: { topRecruiters: { $each: recruiters } } });
                }

                if (scholarshipIdx !== -1 && row[scholarshipIdx]) {
                    const scholDetail = row[scholarshipIdx].toString().trim();
                    await University.findByIdAndUpdate(uni._id, { $set: { 'scholarships.0': { name: 'Institutional Scholarship', description: scholDetail } } });
                }

                if (courseIdx !== -1 && row[courseIdx]) {
                    const courseRaw = row[courseIdx].toString().trim();
                    if (courseRaw.length >= 2 && isNaN(parseInt(courseRaw))) {
                        let courseNames = (courseRaw.length > 40 && (courseRaw.includes(',') || courseRaw.includes('\n'))) ? courseRaw.split(courseRaw.includes('\n') ? '\n' : ',').map(c => c.trim()).filter(c => c.length > 2) : [courseRaw];
                        const duration = durationIdx !== -1 ? extractNumber(row[durationIdx]) : 3;
                        const fee = feeIdx !== -1 ? extractNumber(row[feeIdx]) : undefined;
                        const exam = examIdx !== -1 && row[examIdx] ? row[examIdx].toString().trim() : undefined;
                        for (const cName of courseNames) {
                            if (cName.length < 2 || !isNaN(parseInt(cName))) continue;
                            const category = detectCategory(cName);
                            const courseSlug = slugify(`${uni.slug} ${cName}`, { lower: true, strict: true });
                            const courseData = { 
                                universityId: uni._id, 
                                name: cName, 
                                slug: courseSlug,
                                category, 
                                duration: (duration && duration < 10) ? duration : 3, 
                                feesPerYear: fee || undefined, 
                                entranceExams: exam ? exam.split(/[,/]/).map(e => e.trim()).filter(Boolean) : [] 
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
                count++;
            }
        }
        // Sync counts
        const allUnis = await University.find({});
        for (const u of allUnis) {
            if (u.courses && u.courses.length > 0) {
                await University.findByIdAndUpdate(u._id, { 'stats.totalCoursesCount': u.courses.length });
            }
        }
    } catch (e) { console.error(`  Error in ${path.basename(filePath)}: ${e.message}`); }
}

const EXCEL_DATA_DIR = path.resolve(__dirname, '../data');

async function walkDir(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && !file.startsWith('.')) {
                results = results.concat(await walkDir(fullPath));
            }
        } else if (file.endsWith('.xlsx') || file.endsWith('.csv') || file.endsWith('.xls')) {
            results.push(fullPath);
        }
    }
    return results;
}

async function importAll() {
    try {
        await connectDB();
        console.log('[import] Connected to MongoDB Atlas. Exhaustive update...');
        const files = await walkDir(EXCEL_DATA_DIR);
        console.log(`Found ${files.length} data files.`);
        for (const file of files) await processFile(file);
        
        console.log('\n[import] Restoring logos...');
        const logoDir = path.resolve(__dirname, '../../frontend/public/images/university-logos');
        if (fs.existsSync(logoDir)) {
            const logoFiles = fs.readdirSync(logoDir);
            for (const f of logoFiles) {
                const ext = path.extname(f).toLowerCase();
                if (['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) {
                    const slug = path.parse(f).name;
                    await University.findOneAndUpdate({ slug }, { $set: { logoUrl: `/images/university-logos/${f}` } });
                }
            }
        }

        console.log(`\n[DONE] Universities: ${await University.countDocuments()} | Courses: ${await Course.countDocuments()}`);
        process.exit(0);
    } catch (err) { console.error('Migration failed:', err); process.exit(1); }
}

importAll();
