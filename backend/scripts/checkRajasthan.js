const XLSX = require('xlsx');
const path = require('path');

function clean(v) { return v == null ? null : String(v).replace(/[\u00A0\u200B\uFEFF]/g, ' ').trim() || null; }
function normHeader(s) { return String(s == null ? '' : s).replace(/[\u00A0\u200B\uFEFF]/g, ' ').toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim(); }
function sheetToMatrix(sheet) { const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }); return raw.filter(r => Array.isArray(r) && r.some(v => v !== null && String(v).trim() !== '')); }
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

const UNI_ALIASES = {
  name: ['university name', 'name', 'college name', 'institution name', 'university/college name'],
  state: ['state'],
};

const filePath = 'C:\\Users\\ghadi\\Downloads\\drive-download-20260903T093404Z-1-001\\rajasthan\\Rajasthan_Universities_Data.xlsx';
const wb = XLSX.readFile(filePath);

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = sheetToMatrix(ws);
  if (rows.length < 2) continue;
  
  const uniHeaderIdx = detectHeaderRow(rows, UNI_ALIASES);
  if (uniHeaderIdx >= 0) {
    const idx = buildFieldIndex(rows[uniHeaderIdx], UNI_ALIASES);
    if (idx.name !== undefined) {
      const names = [];
      for (let i = uniHeaderIdx + 1; i < rows.length; i++) {
        const name = clean(cellAt(rows[i], idx.name));
        if (name) names.push(name);
      }
      console.log(`Sheet "${sheetName}": ${names.length} universities`);
      names.forEach((n, i) => console.log(`  ${i+1}. ${n}`));
    }
  }
}
