/**
 * fetch_foreign_logos_clean.js
 * 
 * 1. Cleans up any duplicate foreign universities that don't have websites.
 * 2. Assigns and downloads high-quality icons using DuckDuckGo Favicon service.
 * 3. Saves them locally in `frontend/public/images/university-logos/`
 *    and updates the database `logoUrl` field.
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

const logoMapping = [
  { regex: /deakin/i, domain: 'deakin.edu.au' },
  { regex: /wollongong/i, domain: 'uow.edu.au' },
  { regex: /southampton/i, domain: 'southampton.ac.uk' },
  { regex: /queen/i, domain: 'qub.ac.uk' },
  { regex: /coventry/i, domain: 'coventry.ac.uk' },
  { regex: /liverpool/i, domain: 'liverpool.ac.uk' },
  { regex: /york/i, domain: 'york.ac.uk' },
  { regex: /bristol/i, domain: 'bristol.ac.uk' },
  { regex: /aberdeen/i, domain: 'abdn.ac.uk' },
  { regex: /illinois/i, domain: 'iit.edu' },
  { regex: /victoria/i, domain: 'vu.edu.au' },
  { regex: /western sydney/i, domain: 'westernsydney.edu.au' },
  { regex: /istituto/i, domain: 'ied.edu' },
  { regex: /la trobe/i, domain: 'latrobe.edu.au' },
  { regex: /lancaster/i, domain: 'lancaster.ac.uk' },
  { regex: /western australia/i, domain: 'uwa.edu.au' }
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

  // Deleting empty duplicates first
  await University.deleteMany({ type: 'foreign', website: { $in: ['', null] } });

  const unis = await University.find({ type: 'foreign' });
  console.log(`Found ${unis.length} active foreign universities in DB`);

  for (const uni of unis) {
    const match = logoMapping.find(m => m.regex.test(uni.name));
    if (match) {
      const url = `https://external-content.duckduckgo.com/ip3/${match.domain}.ico`;
      const filename = `${match.domain}.ico`;
      const dest = path.join(LOGO_DIR, filename);
      try {
        console.log(`Downloading logo for ${uni.name} from ${url}...`);
        await download(url, dest);
        const logoUrl = `/images/university-logos/${filename}`;
        uni.logoUrl = logoUrl;
        await uni.save();
        console.log(`  ✓ Updated ${uni.name} logoUrl to ${logoUrl}`);
      } catch (err) {
        console.error(`  ✗ Failed to download/update logo for ${uni.name}: ${err.message}`);
      }
    } else {
      console.log(`No logo mapping found for ${uni.name}`);
    }
  }

  console.log('Done!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
