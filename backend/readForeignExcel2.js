const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, 'data', 'Foreign Univeristies Application Details.xlsx'));
const ws = wb.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

// Column mapping based on what we know:
// "Foreign Universities in India" = university name
// __EMPTY_1 = application link
// __EMPTY_4 = country
// __EMPTY_5 & __EMPTY_6 = city/state
// __EMPTY_15 = fees

let currentUni = '';
const universities = {};

data.forEach(row => {
  const name = row['Foreign Universities in India'];
  if (name) currentUni = name;
  if (!universities[currentUni]) {
    universities[currentUni] = {
      name: currentUni,
      applicationLink: row['__EMPTY_1'] || '',
      country: row['__EMPTY_4'] || '',
      col5: row['__EMPTY_5'] || '',  // could be city or state
      col6: row['__EMPTY_6'] || '',  // could be state or city
      fees: row['__EMPTY_15'] || '',
      ranking: row['__EMPTY_7'] || '',
      courses: []
    };
  }
  if (row['__EMPTY']) {
    universities[currentUni].courses.push(row['__EMPTY'].toString().trim());
  }
});

console.log('=== Universities from Excel ===');
Object.values(universities).forEach(u => {
  console.log('\nName:', u.name);
  console.log('Country:', u.country);
  console.log('Col5:', u.col5, '| Col6:', u.col6);
  console.log('Fees:', u.fees);
  console.log('App Link:', u.applicationLink);
  console.log('Courses:', u.courses.slice(0, 3).join(', '));
});
