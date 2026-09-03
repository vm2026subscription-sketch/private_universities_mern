const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');
const { normalizeUniversityClassification } = require('../src/utils/universityClassification');

const publicUniversities = [
  {
    name: "Dr. Babasaheb Ambedkar Marathwada University",
    universityCode: "BAMU_MH",
    state: "Maharashtra",
    city: "Aurangabad",
    type: "public",
    establishedYear: 1958,
    naacGrade: "A+",
    description: "Dr. Babasaheb Ambedkar Marathwada University is a prominent public university in Aurangabad offering a wide range of programs in arts, science, commerce, engineering, and medicine.",
    website: "http://bamulib.unipune.ernet.in",
    address: "Dr. Babasaheb Ambedkar Marathwada University, Near Soneri Machi, Aurangabad, Maharashtra 431004",
    approvals: { ugc: true, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
  {
    name: "Dr. PDKV Agricultural University",
    universityCode: "PDKV_MH",
    state: "Maharashtra",
    city: "Akola",
    type: "public",
    establishedYear: 1968,
    naacGrade: null,
    description: "Dr. Punjabrao Deshmukh Krishi Vidyapeeth is a premier agricultural university in Akola, Maharashtra. Being an ICAR-regulated agricultural university, it follows its own NAAC process.",
    website: "http://pdkv.akola.maharashtra.gov.in",
    address: "Dr. PDKV, Akola, Maharashtra 444104",
    approvals: { ugc: false, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
  {
    name: "Gondwana University",
    universityCode: "GONDU_MH",
    state: "Maharashtra",
    city: "Gadchiroli",
    type: "public",
    establishedYear: 2012,
    naacGrade: "B++",
    description: "Gondwana University is a state public university established in 2012, serving the Gadchiroli and Chandrapur districts of Maharashtra.",
    website: "http://gondu.in",
    address: "Gondwana University, Gadchiroli, Maharashtra 442605",
    approvals: { ugc: true, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
  {
    name: "North Maharashtra University",
    universityCode: "NMU_MH",
    state: "Maharashtra",
    city: "Jalgaon",
    type: "public",
    establishedYear: 1990,
    naacGrade: "A",
    description: "North Maharashtra University (Kavayitri Bahinabai Chaudhari North Maharashtra University) is a well-established public university in Jalgaon known for its academic and research programs.",
    website: "http://nmu.ac.in",
    address: "North Maharashtra University, P.O. Box No. 80, Jalgaon, Maharashtra 425001",
    approvals: { ugc: true, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
  {
    name: "Krishi Nagari Vidyapeeth",
    universityCode: "KKV_MH",
    state: "Maharashtra",
    city: "Dapoli",
    type: "public",
    establishedYear: 2022,
    naacGrade: null,
    description: "Krushi Kendra Vidyapeeth (Dapoli) is a state agricultural university in Maharashtra focused on agricultural education and research.",
    website: "https://kkv.maharashtra.gov.in",
    address: "Dapoli, Maharashtra 415712",
    approvals: { ugc: false, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
  {
    name: "Maharashtra University of Health Sciences",
    universityCode: "MUHS_MH",
    state: "Maharashtra",
    city: "Nashik",
    type: "public",
    establishedYear: 1998,
    naacGrade: "A+",
    description: "Maharashtra University of Health Sciences (MUHS) is the premier health sciences university in Maharashtra, governing medical, dental, pharmacy, and other health science education across the state.",
    website: "http://muhs.ac.in",
    address: "Mhasrul, Nashik, Maharashtra 422003",
    approvals: { ugc: true, aicte: false, nmc: true, bci: false, coa: false, pci: false },
  },
  {
    name: "Mahatma Phule Krishi Vidyapeeth",
    universityCode: "MPKV_MH",
    state: "Maharashtra",
    city: "Raigad",
    type: "public",
    establishedYear: 1968,
    naacGrade: "A",
    description: "Mahatma Phule Krishi Vidyapeeth is one of the oldest and most reputed agricultural universities in Maharashtra, located in Raigad district.",
    website: "http://mpkv.ac.in",
    address: "Mahatma Phule Krishi Vidyapeeth, Rahata, Raigad, Maharashtra 413722",
    approvals: { ugc: false, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
  {
    name: "Vasantrao Naik Marathwada Krishi Vidyapeeth",
    universityCode: "VNMKV_MH",
    state: "Maharashtra",
    city: "Parbhani",
    type: "public",
    establishedYear: 1972,
    naacGrade: null,
    description: "Vasantrao Naik Marathwada Krishi Vidyapeeth is a major agricultural university in Parbhani, Maharashtra. Being an ICAR-regulated agricultural university, it follows its own accreditation process.",
    website: "http://vnmkv.ac.in",
    address: "VNMKV, Parbhani, Maharashtra 431432",
    approvals: { ugc: false, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
  {
    name: "University of Mumbai",
    universityCode: "MU_MH",
    state: "Maharashtra",
    city: "Mumbai",
    type: "public",
    establishedYear: 1857,
    naacGrade: "A+",
    description: "The University of Mumbai is one of the oldest and largest universities in India, established in 1857. It is a premier public university offering diverse programs across multiple campuses in Mumbai.",
    website: "http://mu.ac.in",
    address: "University of Mumbai, Fort Campus, Mumbai, Maharashtra 400032",
    approvals: { ugc: true, aicte: false, nmc: true, bci: true, coa: true, pci: false },
  },
  {
    name: "Punjabrao Deshmukh Agricultural University",
    universityCode: "PAHSU_MH",
    state: "Maharashtra",
    city: "Akola",
    type: "public",
    establishedYear: 1968,
    naacGrade: null,
    description: "Punjabrao Deshmukh Agricultural State University is a public agricultural university in Akola, Maharashtra, focused on agricultural education, research, and extension.",
    website: "http://pdkv.akola.maharashtra.gov.in",
    address: "Akola, Maharashtra 444104",
    approvals: { ugc: false, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
  {
    name: "Rashtrasant Tukadoji Maharaj Nagpur University",
    universityCode: "RTMNU_MH",
    state: "Maharashtra",
    city: "Nagpur",
    type: "public",
    establishedYear: 1923,
    naacGrade: "A+",
    description: "Rashtrasant Tukadoji Maharaj Nagpur University (formerly Nagpur University) is one of the oldest public universities in Maharashtra, established in 1923, with a rich legacy in academic excellence.",
    website: "http://nagpuruniversity.ac.in",
    address: "Rashtrasant Tukadoji Maharaj Nagpur University, Nagpur, Maharashtra 440001",
    approvals: { ugc: true, aicte: false, nmc: false, bci: true, coa: false, pci: false },
  },
  {
    name: "Sant Gadge Baba Amravati University",
    universityCode: "SGBAU_MH",
    state: "Maharashtra",
    city: "Amravati",
    type: "public",
    establishedYear: 1983,
    naacGrade: "A",
    description: "Sant Gadge Baba Amravati University is a well-known public university in Amravati offering programs in arts, science, commerce, engineering, and law.",
    website: "http://sgbau.ac.in",
    address: "Sant Gadge Baba Amravati University, Amravati, Maharashtra 444602",
    approvals: { ugc: true, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
  {
    name: "Savitribai Phule Pune University",
    universityCode: "SPPU_MH",
    state: "Maharashtra",
    city: "Pune",
    type: "public",
    establishedYear: 1949,
    naacGrade: "A++",
    description: "Savitribai Phule Pune University (formerly University of Pune) is one of India's premier public universities, established in 1949. It is known for its academic rigor, research output, and sprawling 411-acre campus.",
    website: "http://pu.ac.in",
    address: "Savitribai Phule Pune University, Ganeshkhind, Pune, Maharashtra 411007",
    approvals: { ugc: true, aicte: false, nmc: true, bci: true, coa: true, pci: false },
  },
  {
    name: "Shivaji University",
    universityCode: "SHIVAJI_MH",
    state: "Maharashtra",
    city: "Kolhapur",
    type: "public",
    establishedYear: 1962,
    naacGrade: "A+",
    description: "Shivaji University is a prominent public university in Kolhapur, established in 1962, serving the western Maharashtra region with a wide range of academic programs.",
    website: "http://shivajiuniversity.ac.in",
    address: "Shivaji University, Vidyanagar, Kolhapur, Maharashtra 416004",
    approvals: { ugc: true, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
  {
    name: "SNDT Women's University",
    universityCode: "SNDT_MH",
    state: "Maharashtra",
    city: "Mumbai",
    type: "public",
    establishedYear: 1916,
    naacGrade: "A",
    description: "Shreemati Nathibai Damodar Thackersey Women's University (SNDT) is India's first women's university, established in 1916, dedicated to women's education and empowerment.",
    website: "http://sndt.ac.in",
    address: "SNDT Women's University, Churchgate, Mumbai, Maharashtra 400020",
    approvals: { ugc: true, aicte: false, nmc: false, bci: true, coa: false, pci: false },
  },
  {
    name: "Swami Ramanand Teerth Marathwada University",
    universityCode: "SRTMU_MH",
    state: "Maharashtra",
    city: "Nanded",
    type: "public",
    establishedYear: 1994,
    naacGrade: "A",
    description: "Swami Ramanand Teerth Marathwada University is a public university in Nanded, serving the Marathwada region with academic programs in diverse disciplines.",
    website: "http://srtmu.ac.in",
    address: "Swami Ramanand Teerth Marathwada University, Nanded, Maharashtra 431606",
    approvals: { ugc: true, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
  {
    name: "Yashwantrao Mohite Open University",
    universityCode: "YCMOU_MH",
    state: "Maharashtra",
    city: "Nashik",
    type: "public",
    establishedYear: 1989,
    naacGrade: "A++",
    description: "Yashwantrao Mohite Open University (YCMOU) is a premier open university in Maharashtra, established in 1989, providing distance and open education to millions of learners.",
    website: "http://ycmou.maharashtra.gov.in",
    address: "YCMOU, Nashik, Maharashtra 422005",
    approvals: { ugc: true, aicte: false, nmc: false, bci: false, coa: false, pci: false },
  },
];

async function seedPublicUniversities() {
  try {
    await connectDB();
    console.log('[seed] Connected to MongoDB');

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const uniData of publicUniversities) {
      const classification = normalizeUniversityClassification(uniData);
      const slug = uniData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const updateData = {
        name: uniData.name,
        slug,
        universityCode: uniData.universityCode,
        state: uniData.state,
        city: uniData.city,
        ...classification,
        establishedYear: uniData.establishedYear,
        naacGrade: uniData.naacGrade,
        description: uniData.description,
        website: uniData.website,
        address: uniData.address,
        approvals: uniData.approvals,
        status: 'published',
      };

      try {
        const existing = await University.findOne({ universityCode: uniData.universityCode });
        if (existing) {
          await University.updateOne(
            { _id: existing._id },
            { $set: updateData }
          );
          updated++;
          console.log(`[seed] Updated: ${uniData.name} (${uniData.universityCode})`);
        } else {
          await University.create(updateData);
          created++;
          console.log(`[seed] Created: ${uniData.name} (${uniData.universityCode})`);
        }
      } catch (err) {
        skipped++;
        console.error(`[seed] Skipped ${uniData.name}: ${err.message}`);
      }
    }

    console.log(`\n[seed] Summary: ${created} created, ${updated} updated, ${skipped} skipped`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[seed] Fatal error:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

seedPublicUniversities();
