const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const University = require('../src/models/University');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function linkLogos() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const logoDir = path.resolve(__dirname, '../../frontend/public/images/university-logos');
        if (!fs.existsSync(logoDir)) {
            console.error('Logo directory not found:', logoDir);
            process.exit(1);
        }

        const files = fs.readdirSync(logoDir);
        console.log(`Found ${files.length} files in logo directory.`);

        let linkedCount = 0;
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.webp') continue;
            
            const slug = path.parse(file).name;
            const uni = await University.findOne({ slug });
            
            if (uni) {
                uni.logoUrl = `/images/university-logos/${file}`;
                await uni.save();
                linkedCount++;
                if (linkedCount % 20 === 0) console.log(`Linked ${linkedCount} logos...`);
            }
        }

        console.log(`SUCCESS! Linked ${linkedCount} existing logos to universities.`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

linkLogos();
