/**
 * fetch_remaining_logos.js
 * Uses Google's high-res (64x64) favicon service to fetch logos for the 5 universities that failed ip3.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const University = require('./src/models/University');

const LOGO_DIR = path.resolve(__dirname, '../frontend/public/images/university-logos');
if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
}

const remainingList = [
  { regex: /deakin/i, domain: 'deakin.edu.au', file: 'deakin.png' },
  { regex: /coventry/i, domain: 'coventry.ac.uk', file: 'coventry.png' },
  { regex: /victoria/i, domain: 'vu.edu.au', file: 'victoria.png' },
  { regex: /western sydney/i, domain: 'westernsydney.edu.au', file: 'westernsydney.png' },
  { regex: /la trobe/i, domain: 'latrobe.edu.au', file: 'latrobe.png' }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      } else if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        download(res.headers.location, dest).then(resolve).catch(reject);
      } else {
        file.close();
        reject(new Error('HTTP Status ' + res.statusCode));
      }
    }).on('error', (e) => { file.close(); reject(e); });
  });
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const item of remainingList) {
    const uni = await University.findOne({ type: 'foreign', name: item.regex });
    if (uni) {
      const url = `https://www.google.com/s2/favicons?sz=64&domain=${item.domain}`;
      const dest = path.join(LOGO_DIR, item.file);
      try {
        console.log(`Downloading Google favicon for ${uni.name} from ${url}...`);
        await download(url, dest);
        const logoUrl = `/images/university-logos/${item.file}`;
        uni.logoUrl = logoUrl;
        await uni.save();
        console.log(`  ✓ Updated ${uni.name} logoUrl to ${logoUrl}`);
      } catch (err) {
        console.error(`  ✗ Failed to download/update logo for ${uni.name}: ${err.message}`);
      }
    } else {
      console.log(`No active university found matching ${item.regex}`);
    }
  }

  console.log('Done!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
