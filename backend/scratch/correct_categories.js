const mongoose = require('mongoose');
require('dotenv').config({path: './backend/.env'});

async function correctCategories() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Course = mongoose.model('Course', new mongoose.Schema({name: String, category: String}));
  
  const ugPrefixes = [
    'B.', 'B.A.', 'B.Sc.', 'B.Com.', 'Bachelor', 'BBA', 'BCA', 'B.Tech', 'B.E.', 'B.Arch', 'B.Des', 'B.Ed', 'B.P.Ed', 'B.Pharm', 'BPT', 'B.Voc', 'BAMS', 'BHMS', 'BUMS', 'BDS', 'MBBS',
    'BA', 'BSc', 'BCom', 'BE', 'BTech', 'BArch', 'BEd', 'BPharm', 'LLB', 'BA LLB', 'BBA LLB', 'BCom LLB'
  ];
  
  const pgPrefixes = [
    'M.', 'M.A.', 'M.Sc.', 'M.Com.', 'Master', 'MBA', 'MCA', 'M.Tech', 'M.E.', 'M.Arch', 'M.Des', 'M.Ed', 'M.P.Ed', 'M.Pharm', 'MPT', 'M.Voc', 'PGDM', 'LL.M', 'MD', 'MS',
    'MA', 'MSc', 'MCom', 'ME', 'MTech', 'MArch', 'MEd', 'MPharm', 'LLM'
  ];
  
  const phdPrefixes = ['Ph.D', 'Doctor of Philosophy', 'Doctorate', 'PhD'];
  
  const diplomaPrefixes = ['Diploma', 'Polytechnic', 'D.Pharm', 'D.Ed', 'D.P.Ed', 'D.Voc', 'PG Diploma', 'D. Pharma'];

  console.log('Starting comprehensive category correction...');

  // Helper to escape regex
  const escape = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

  // Correct UG
  const ugResult = await Course.updateMany(
    { 
      category: 'Others', 
      name: new RegExp('^\\s*(' + ugPrefixes.map(escape).join('|') + ')(\\b|\\s|\\.|$)', 'i')
    },
    { $set: { category: 'UG' } }
  );
  console.log(`Updated ${ugResult.modifiedCount} courses to UG`);

  // Correct PG
  const pgResult = await Course.updateMany(
    { 
      category: 'Others', 
      name: new RegExp('^\\s*(' + pgPrefixes.map(escape).join('|') + ')(\\b|\\s|\\.|$)', 'i')
    },
    { $set: { category: 'PG' } }
  );
  console.log(`Updated ${pgResult.modifiedCount} courses to PG`);

  // Correct PhD
  const phdResult = await Course.updateMany(
    { 
      category: 'Others', 
      name: new RegExp('^\\s*(' + phdPrefixes.map(escape).join('|') + ')(\\b|\\s|\\.|$)', 'i')
    },
    { $set: { category: 'PhD' } }
  );
  console.log(`Updated ${phdResult.modifiedCount} courses to PhD`);

  // Correct Diploma
  const diplomaResult = await Course.updateMany(
    { 
      category: 'Others', 
      name: new RegExp('^\\s*(' + diplomaPrefixes.map(escape).join('|') + ')(\\b|\\s|\\.|$)', 'i')
    },
    { $set: { category: 'Diploma' } }
  );
  console.log(`Updated ${diplomaResult.modifiedCount} courses to Diploma`);

  process.exit(0);
}

correctCategories();
