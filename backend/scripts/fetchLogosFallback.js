const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const axios = require('axios');
const https = require('https');
const slugify = require('slugify');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const University = require('../src/models/University');

const LOGO_DIR = path.resolve(__dirname, '../../frontend/public/images/university-logos');

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({  
        rejectUnauthorized: false
    }),
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});

async function downloadImage(url, filepath) {
    const writer = fs.createWriteStream(filepath);
    const response = await axiosInstance({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function tryPortalLogos(uni) {
    // Portals: Careers360, Collegedunia, Shiksha
    // We construct likely URLs based on patterns
    
    const nameSlug = slugify(uni.name, { lower: true, remove: /[*+~.()'"!:@]/g });
    const nameSlugCap = slugify(uni.name, { remove: /[*+~.()'"!:@]/g }); // No lower for some portals

    const fallbacks = [
        // Careers360 pattern (often University-Name-City)
        `https://static.careers360.mobi/media/presets/720X480/colleges/logos/${nameSlugCap}.png`,
        `https://static.careers360.mobi/media/presets/720X480/colleges/logos/${nameSlugCap}.jpg`,
        `https://static.careers360.mobi/media/presets/720X480/colleges/logos/${nameSlugCap}-${uni.state ? uni.state.replace(/\s+/g, '-') : ''}.png`,
        
        // Collegedunia pattern (sometimes predictable)
        `https://images.collegedunia.com/public/college_data/images/logos/${nameSlug}.png`,
        
        // Wikipedia pattern (common)
        `https://en.wikipedia.org/wiki/File:${nameSlugCap}_Logo.png`,
        `https://en.wikipedia.org/wiki/File:${nameSlugCap}_Logo.jpg`
    ];

    for (const url of fallbacks) {
        try {
            const head = await axiosInstance.head(url);
            if (head.status === 200) {
                return url;
            }
        } catch (e) {
            // Ignore errors, try next
        }
    }
    return null;
}

async function runFallback() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const unis = await University.find({ 
            $or: [
                { logoUrl: { $exists: false } },
                { logoUrl: '' },
                { logoUrl: { $not: /^\/images\/university-logos\// } }
            ]
        });

        console.log(`Found ${unis.length} universities missing logos. Starting fallback fetch...`);

        const batchSize = 10;
        for (let i = 0; i < unis.length; i += batchSize) {
            const batch = unis.slice(i, i + batchSize);
            console.log(`Processing fallback batch ${Math.floor(i / batchSize) + 1}...`);

            await Promise.all(batch.map(async (uni) => {
                console.log(`  Trying fallback for ${uni.name}...`);
                const logoUrl = await tryPortalLogos(uni);

                if (logoUrl) {
                    console.log(`    Found fallback logo: ${logoUrl}`);
                    const extension = path.extname(new URL(logoUrl).pathname) || '.png';
                    const filename = `${uni.slug}${extension}`;
                    const filepath = path.join(LOGO_DIR, filename);

                    try {
                        await downloadImage(logoUrl, filepath);
                        uni.logoUrl = `/images/university-logos/${filename}`;
                        await uni.save();
                        console.log(`    ✓ Saved fallback logo for ${uni.name}`);
                    } catch (err) {
                        console.error(`    Failed to download fallback logo: ${err.message}`);
                    }
                } else {
                    console.log(`    ✗ No fallback found for ${uni.name}`);
                }
            }));
        }

        console.log('Finished fallback logo processing.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runFallback();
