const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const University = require('../src/models/University');
const LOGO_DIR = path.resolve(__dirname, '../../frontend/public/images/university-logos');

if (!fs.existsSync(LOGO_DIR)) {
    fs.mkdirSync(LOGO_DIR, { recursive: true });
}

async function runPuppeteerScraper() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const unis = await University.find({ 
            website: { $exists: true, $ne: '' },
            $or: [
                { logoUrl: { $exists: false } },
                { logoUrl: '' },
                { logoUrl: { $not: /^\/images\/university-logos\// } }
            ]
        });

        console.log(`Found ${unis.length} universities missing logos. Starting Puppeteer...`);

        const browser = await puppeteer.launch({
            headless: 'new', // Use new headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
        });

        const page = await browser.newPage();
        // Set a standard user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        // Ignore timeouts for navigation
        page.setDefaultNavigationTimeout(30000); // 30 seconds

        for (let i = 0; i < unis.length; i++) {
            const uni = unis[i];
            console.log(`[${i+1}/${unis.length}] Processing ${uni.name} (${uni.website})...`);

            try {
                // Navigate to the website
                await page.goto(uni.website, { waitUntil: 'networkidle2' }).catch(e => {
                    console.log(`  Navigation warning/error (continuing): ${e.message}`);
                });

                // Try to find the logo element
                // Heuristics: images with 'logo' in src, alt, class, or id. Or images inside a 'header' or '.logo' container.
                const logoSelector = `
                    img[src*="logo" i], 
                    img[alt*="logo" i], 
                    img[class*="logo" i], 
                    img[id*="logo" i],
                    .logo img,
                    #logo img,
                    header img,
                    .navbar-brand img,
                    a[href="/"] img
                `;

                // Wait a moment for any dynamic logos to load
                await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds just in case

                const logoElement = await page.$(logoSelector);

                if (logoElement) {
                    // Check if it's visible and has dimensions
                    const box = await logoElement.boundingBox();
                    if (box && box.width > 0 && box.height > 0) {
                        const filename = `${uni.slug}.png`;
                        const filepath = path.join(LOGO_DIR, filename);

                        // Take a screenshot of just the logo element
                        await logoElement.screenshot({ path: filepath });
                        
                        uni.logoUrl = `/images/university-logos/${filename}`;
                        await uni.save();
                        console.log(`  ✓ Captured logo screenshot for ${uni.name}`);
                    } else {
                        console.log(`  ✗ Logo element found but it is hidden or has 0x0 dimensions.`);
                    }
                } else {
                    console.log(`  ✗ Could not find a logo element matching heuristics.`);
                }

            } catch (err) {
                console.error(`  ✗ Error processing ${uni.name}: ${err.message}`);
            }
        }

        await browser.close();
        console.log('Finished Puppeteer processing.');
        process.exit(0);

    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

runPuppeteerScraper();
