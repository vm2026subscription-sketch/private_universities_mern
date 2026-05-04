const fs = require('fs');
const path = require('path');
const https = require('https');
const mongoose = require('mongoose');
const University = require('../src/models/University');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const UPLOAD_DIR = path.resolve(__dirname, '../../frontend/public/images/university-logos');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Map of university name -> DuckDuckGo domain favicon URL
const logos = [
  { name: 'University of York',               url: 'https://external-content.duckduckgo.com/ip3/york.ac.uk.ico',       file: 'york.ac.uk.ico' },
  { name: 'University of Bristol',            url: 'https://external-content.duckduckgo.com/ip3/bristol.ac.uk.ico',    file: 'bristol.ac.uk.ico' },
  { name: 'University of Liverpool',          url: 'https://external-content.duckduckgo.com/ip3/liverpool.ac.uk.ico',  file: 'liverpool.ac.uk.ico' },
  { name: 'University of Aberdeen',           url: 'https://external-content.duckduckgo.com/ip3/abdn.ac.uk.ico',       file: 'abdn.ac.uk.ico' },
  { name: 'Illinois Institute of Technology', url: 'https://external-content.duckduckgo.com/ip3/iit.edu.ico',          file: 'iit.edu.ico' },
  { name: 'Victoria University',              url: 'https://external-content.duckduckgo.com/ip3/vu.edu.au.ico',        file: 'vu.edu.au.ico' }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      } else if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        download(res.headers.location, dest).then(resolve).catch(reject);
      } else {
        file.close();
        reject(new Error('HTTP ' + res.statusCode));
      }
    }).on('error', (e) => { file.close(); reject(e); });
  });
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('DB connected');

  for (const item of logos) {
    const dest = path.join(UPLOAD_DIR, item.file);
    try {
      await download(item.url, dest);
      const logoUrl = `/images/university-logos/${item.file}`;
      await University.findOneAndUpdate({ name: item.name }, { logoUrl });
      console.log('OK: ' + item.name + ' -> ' + logoUrl);
    } catch (e) {
      console.log('FAIL: ' + item.name + ' - ' + e.message);
    }
  }
  process.exit(0);
}
run();
