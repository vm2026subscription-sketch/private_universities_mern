const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function clean(v) { return v == null ? null : String(v).replace(/[\u00A0\u200B\uFEFF]/g, ' ').trim() || null; }
function normHeader(s) { return String(s == null ? '' : s).replace(/[\u00A0\u200B\uFEFF]/g, ' ').toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim(); }
function sheetToMatrix(sheet) { const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }); return raw.filter(r => Array.isArray(r) && r.some(v => v !== null && String(v).trim() !== '')); }

const UNI_NAME_ALIASES = ['university name', 'name', 'college name', 'institution name', 'university/college name'];
const UNI_ALIASES = {
  name: UNI_NAME_ALIASES,
  universityCode: ['university code', 'code', 'uni code'],
  segment: ['university segment', 'segment'],
  type: ['university type', 'type', 'institution type'],
  state: ['state'], city: ['city'],
};
const COURSE_ALIASES = {
  universityName: ['university name', 'university', 'college name', 'institution name', 'college/university'],
  baseCourse: ['base course', 'course name', 'course', 'programme', 'program'],
};

function buildAliasLookup(aliasMap) { const lut = {}; for (const field of Object.keys(aliasMap)) { for (const alias of aliasMap[field]) lut[alias] = field; } return lut; }
function detectHeaderRow(rows, aliasMap) {
  const lut = buildAliasLookup(aliasMap);
  let best = { idx: -1, score: 0 };
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i]; if (!row || !Array.isArray(row)) continue;
    const matched = new Set();
    for (const c of row) { const key = normHeader(c); if (lut[key]) matched.add(lut[key]); }
    if (matched.size > best.score) best = { idx: i, score: matched.size };
  }
  return best.score >= 2 ? best.idx : -1;
}
function buildFieldIndex(headerRow, aliasMap) {
  const lut = buildAliasLookup(aliasMap);
  const idx = {};
  headerRow.forEach((h, i) => { const key = normHeader(h); if (lut[key] && idx[lut[key]] === undefined) idx[lut[key]] = i; });
  return idx;
}
function cellAt(row, i) { return (i === undefined || i === null) ? null : (row[i] === undefined ? null : row[i]); }

const baseDir = 'C:\\Users\\ghadi\\Downloads\\drive-download-20260903T093404Z-1-001';
const stateFolders = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());

const allUniNames = new Map(); // name -> { state, source }
let totalRows = 0;

for (const folder of stateFolders) {
  const folderPath = path.join(baseDir, folder);
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    try {
      const wb = XLSX.readFile(filePath);
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = sheetToMatrix(ws);
        if (rows.length < 2) continue;

        const uniHeaderIdx = detectHeaderRow(rows, UNI_ALIASES);
        if (uniHeaderIdx >= 0) {
          const idx = buildFieldIndex(rows[uniHeaderIdx], UNI_ALIASES);
          if (idx.name !== undefined) {
            for (let i = uniHeaderIdx + 1; i < rows.length; i++) {
              const name = clean(cellAt(rows[i], idx.name));
              if (name) {
                totalRows++;
                const state = clean(cellAt(rows[i], idx.state)) || folder;
                if (!allUniNames.has(name.toLowerCase())) {
                  allUniNames.set(name.toLowerCase(), { name, state, source: folder + '/' + file });
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // skip errors
    }
  }
}

console.log('Total university rows in Excel:', totalRows);
console.log('Unique university names:', allUniNames.size);

// Check which are missing from DB
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const University = require('../src/models/University');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const dbUnis = await University.find().select('name').lean();
  const dbNames = new Set(dbUnis.map(u => u.name.toLowerCase()));
  
  const missing = [];
  for (const [key, val] of allUniNames) {
    if (!dbNames.has(key)) {
      missing.push(val);
    }
  }
  
  console.log('\nUniversities in DB:', dbNames.size);
  console.log('Missing from DB:', missing.length);
  
  if (missing.length > 0) {
    console.log('\nFirst 20 missing:');
    missing.slice(0, 20).forEach((m, i) => console.log(`  ${i+1}. ${m.name} (${m.state}) [${m.source}]`));
  }
  
  await mongoose.disconnect();
}
check();
