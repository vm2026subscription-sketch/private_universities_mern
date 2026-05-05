const path = require('path');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const slugify = require('slugify');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const University = require('../src/models/University');
const Course = require('../src/models/Course');

const logoMapping = {
    'University of York': '/images/university-logos/university-of-york.png',
    'University of Bristol': '/images/university-logos/university-of-bristol.png',
    'University of Liverpool': '/images/university-logos/university-of-liverpool.png',
    'University of Aberdeen': '/images/university-logos/university-of-aberdeen.png',
    'Illinois Institute of Technology': '/images/university-logos/illinois-institute-of-technology.png',
    'Victoria University': '/images/university-logos/victoria-university.png'
};

async function importFile() {
    const filePath = path.resolve(__dirname, '../data/Foreign Univeristies Application Details.xlsx');
    console.log(`Processing: ${path.basename(filePath)}`);
    
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet);

        let currentUni = null;

        for (const row of rawData) {
            const uniName = row['Foreign Universities in India'];
            const courseName = row['__EMPTY']; // Course name and description
            const duration = row['__EMPTY_3'];
            const country = row['__EMPTY_4'];
            const state = row['__EMPTY_5'];
            const city = row['__EMPTY_6'];
            const feesStr = row['__EMPTY_15'];

            if (uniName && uniName !== 'Institute Name') {
                const slug = slugify(uniName, { lower: true, strict: true });
                
                // Update or create University
                currentUni = await University.findOneAndUpdate(
                    { slug },
                    {
                        name: uniName,
                        slug,
                        type: 'foreign',
                        city: city || 'Various',
                        state: state || 'Various',
                        country: country || 'United Kingdom',
                        logoUrl: logoMapping[uniName] || '',
                        $unset: { establishedYear: 1 } // Ensure establishedYear is removed
                    },
                    { upsert: true, new: true }
                );
                console.log(`- Processed University: ${uniName}`);
            }

            if (currentUni && courseName && courseName !== 'Course Name' && courseName.trim() !== '') {
                // Parse fees
                let fees = 0;
                if (feesStr) {
                    fees = parseInt(feesStr.toString().replace(/[^0-9]/g, '')) || 0;
                }

                // Split course name from description if possible
                const nameOnly = courseName.split('\n')[0].trim();
                const courseSlug = slugify(`${currentUni.slug}-${nameOnly}`, { lower: true, strict: true });

                await Course.findOneAndUpdate(
                    { universityId: currentUni._id, name: nameOnly },
                    {
                        universityId: currentUni._id,
                        name: nameOnly,
                        slug: courseSlug,
                        duration: duration || '',
                        feesPerYear: fees,
                        category: 'Foreign Program',
                        description: courseName
                    },
                    { upsert: true }
                );
                console.log(`  + Added/Updated Course: ${nameOnly}`);
            }
        }

        console.log('Import completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Import failed:', err);
        process.exit(1);
    }
}

importFile();
