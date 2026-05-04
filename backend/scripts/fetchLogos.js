const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const slugify = require('slugify');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const University = require('../src/models/University');

const LOGO_DIR = path.resolve(__dirname, '../../frontend/public/images/university-logos');

if (!fs.existsSync(LOGO_DIR)) {
    fs.mkdirSync(LOGO_DIR, { recursive: true });
}

const https = require('https');
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({  
        rejectUnauthorized: false
    })
});

async function downloadImage(url, filepath) {
    const writer = fs.createWriteStream(filepath);
    const response = await axiosInstance({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function findLogoUrl(websiteUrl) {
    try {
        const response = await axiosInstance.get(websiteUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        let logoUrl = '';

        // Heuristic 1: Look for an img with "logo" in its src or alt
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            const alt = $(el).attr('alt') || '';
            if (src && (src.toLowerCase().includes('logo') || alt.toLowerCase().includes('logo'))) {
                logoUrl = src;
                return false; // break
            }
        });

        // Heuristic 2: og:image
        if (!logoUrl) {
            logoUrl = $('meta[property="og:image"]').attr('content');
        }

        // Heuristic 3: favicon
        if (!logoUrl) {
            logoUrl = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');
        }

        if (logoUrl) {
            // Convert relative URL to absolute
            if (logoUrl.startsWith('//')) {
                logoUrl = 'https:' + logoUrl;
            } else if (logoUrl.startsWith('/')) {
                const urlObj = new URL(websiteUrl);
                logoUrl = urlObj.origin + logoUrl;
            } else if (!logoUrl.startsWith('http')) {
                const urlObj = new URL(websiteUrl);
                logoUrl = urlObj.origin + '/' + logoUrl;
            }
            return logoUrl;
        }
    } catch (error) {
        console.error(`  Error fetching ${websiteUrl}: ${error.message}`);
    }
    return null;
}

async function processUniversities() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const universities = await University.find({ website: { $exists: true, $ne: '' } });
        console.log(`Found ${universities.length} universities with websites.`);

        const batchSize = 5;
        for (let i = 0; i < universities.length; i += batchSize) {
            const batch = universities.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(universities.length / batchSize)}...`);
            
            await Promise.all(batch.map(async (uni) => {
                if (uni.logoUrl && !uni.logoUrl.includes('placeholder')) {
                    console.log(`Skipping ${uni.name} (already has logo)`);
                    return;
                }

                console.log(`Processing ${uni.name} (${uni.website})...`);
                const logoUrl = await findLogoUrl(uni.website);

                if (logoUrl) {
                    console.log(`  Found logo for ${uni.name}: ${logoUrl}`);
                    const extension = path.extname(new URL(logoUrl).pathname) || '.png';
                    const filename = `${uni.slug}${extension}`;
                    const filepath = path.join(LOGO_DIR, filename);

                    try {
                        await downloadImage(logoUrl, filepath);
                        uni.logoUrl = `/images/university-logos/${filename}`;
                        await uni.save();
                        console.log(`  ✓ Saved logo for ${uni.name} to ${uni.logoUrl}`);
                    } catch (err) {
                        console.error(`  Failed to download logo for ${uni.name}: ${err.message}`);
                    }
                } else {
                    console.log(`  ✗ Logo not found for ${uni.name}`);
                }
            }));
        }

        console.log('Finished processing logos.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

processUniversities();
