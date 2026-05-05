const path = require('path');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const slugify = require('slugify');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const University = require('../src/models/University');
const Course = require('../src/models/Course');

async function importFile(filePath) {
    console.log(`Processing: ${path.basename(filePath)}`);
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

        // Skip title row if present
        let startRow = 0;
        if (rawData[0] && rawData[0][0] && rawData[0][0].includes('Foreign Universities')) startRow = 1;

        const headers = rawData[startRow].map(h => (h || '').toString().toLowerCase().replace(/\s/g, ''));
        const nameIdx = headers.indexOf('institutename');
        const courseIdx = headers.indexOf('courses');
        const feeIdx = headers.indexOf('annualtuitionfees');
        const durationIdx = headers.indexOf('courseduration');
        const cityIdx = headers.indexOf('locationcity');
        const stateIdx = headers.indexOf('locationstate');
        const countryIdx = headers.indexOf('origincountry');

        let currentUni = null;

        for (let i = startRow + 2; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.every(c => c === null)) continue;

            const name = row[nameIdx] ? row[nameIdx].trim() : null;
            if (name) {
                const slug = slugify(name, { lower: true, strict: true });
                currentUni = await University.findOneAndUpdate(
                    { slug },
                    {
                        name,
                        slug,
                        type: 'foreign',
                        city: row[cityIdx] || 'Unknown',
                        state: row[stateIdx] || 'Unknown',
                        country: row[countryIdx] || 'Unknown'
                    },
                    { upsert: true, new: true }
                );
                console.log(`- Imported University: ${name}`);
            }

            if (currentUni && row[courseIdx]) {
                const courseName = row[courseIdx].split('\n')[0].trim();
                const fees = row[feeIdx] ? parseInt(row[feeIdx].toString().replace(/[^0-9]/g, '')) : 0;
                
                await Course.findOneAndUpdate(
                    { universityId: currentUni._id, name: courseName },
                    {
                        universityId: currentUni._id,
                        name: courseName,
                        duration: row[durationIdx] || '',
                        feesPerYear: fees,
                        category: 'Foreign Program'
                    },
                    { upsert: true }
                );
                console.log(`  + Added Course: ${courseName}`);
            }
        }
        console.log('Import completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Import failed:', err);
        process.exit(1);
    }
}

const targetPath = path.resolve(__dirname, '../data/extracted_clean/Private universities data/Foreign_Universities_Application_Details.xlsx');
importFile(targetPath);
