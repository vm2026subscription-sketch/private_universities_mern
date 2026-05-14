const mongoose = require('mongoose');
require('dotenv').config();

const CourseSchema = new mongoose.Schema({
  name: String,
  stream: String
});

const Course = mongoose.model('Course', CourseSchema);

const STREAM_MAPPING = [
  {
    stream: 'Arts',
    keywords: ['BA ', 'MA ', 'B.A.', 'M.A.', 'Arts', 'Humanities', 'Sociology', 'Psychology', 'History', 'Geography', 'Political Science', 'Economics', 'English', 'Hindi', 'Marathi', 'Philosophy', 'Fine Arts', 'Social Work', 'Journalism', 'Mass Comm', 'Media', 'Literature', 'Language', 'Visual Arts', 'Performing Arts', 'Dance', 'Music']
  },
  {
    stream: 'Commerce',
    keywords: ['B.Com', 'M.Com', 'Chartered Accountancy', 'CS ', 'Company Secretary', 'Banking', 'Accountancy', 'Finance', 'Taxation', 'Audit']
  },
  {
    stream: 'Science',
    keywords: ['B.Sc', 'M.Sc', 'Science', 'Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology', 'Mathematics', 'Statistics', 'Microbiology', 'Biotechnology', 'Bio-Informatics', 'Geology', 'Environmental', 'Forensic', 'Agriculture']
  },
  {
    stream: 'Engineering',
    keywords: ['B.Tech', 'M.Tech', 'B.E.', 'M.E.', 'Engineering', 'Polytechnic', 'Diploma in Mechanical', 'Diploma in Civil', 'Diploma in Electrical', 'B.Voc in', 'Automobile', 'Aeronautical', 'Mechatronics']
  },
  {
    stream: 'Management',
    keywords: ['MBA', 'BBA', 'PGDM', 'Management', 'BMS', 'MMS', 'Hospital Administration', 'Marketing', 'Human Resource', 'Logistics', 'Supply Chain', 'Business']
  },
  {
    stream: 'Medical',
    keywords: ['MBBS', 'BDS', 'MDS', 'MS in', 'MD in', 'AYUSH', 'BAMS', 'BHMS', 'BUMS', 'Physiotherapy', 'BPT', 'MPT', 'Medical', 'Surgery', 'Health', 'Optometry', 'MLT', 'Radiology', 'Dialysis', 'Operation Theatre', 'OTT']
  },
  {
    stream: 'Pharmacy',
    keywords: ['B.Pharm', 'M.Pharm', 'Pharm.D', 'Pharmacy', 'Pharmaceutical']
  },
  {
    stream: 'Nursing',
    keywords: ['Nursing', 'B.Sc in Nursing', 'M.Sc in Nursing', 'ANM', 'GNM']
  },
  {
    stream: 'Law',
    keywords: ['LLB', 'LLM', 'Law', 'Jurisprudence', 'Legal', 'Advocate']
  },
  {
    stream: 'Architecture',
    keywords: ['B.Arch', 'M.Arch', 'Architecture', 'Planning']
  },
  {
    stream: 'Agriculture',
    keywords: ['Agriculture', 'Horticulture', 'Fisheries', 'Forestry', 'B.Sc. Agri', 'Agri-Business']
  },
  {
    stream: 'Design',
    keywords: ['Design', 'B.Des', 'M.Des', 'Fashion', 'Interior Design', 'Animation', 'Graphic', 'Product Design', 'UI/UX']
  },
  {
    stream: 'Education',
    keywords: ['B.Ed', 'M.Ed', 'Physical Education', 'B.P.Ed', 'D.Ed', 'Teacher Training']
  },
  {
    stream: 'Hospitality',
    keywords: ['Hospitality', 'Hotel Management', 'BHM', 'Tourism', 'Catering', 'Culinary']
  },
  {
    stream: 'IT',
    keywords: ['BCA', 'MCA', 'Computer Application', 'Information Technology', 'B.Sc in CS', 'B.Sc. IT', 'M.Sc. IT', 'Software', 'Cyber Security', 'Data Science', 'AI', 'Artificial Intelligence', 'Machine Learning']
  }
];

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const allCourses = await Course.find({});
  console.log(`Analyzing ${allCourses.length} courses...`);

  let updatedCount = 0;
  const bulkOps = [];

  for (const course of allCourses) {
    let matchedStream = 'Others';
    const name = course.name;

    for (const mapping of STREAM_MAPPING) {
      // Create a regex that respects word boundaries for specific degree names
      const keywords = mapping.keywords.map(k => {
        const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // If it starts with a degree like BA, MA, B.Sc, use word boundary
        if (/^[A-Z]\./i.test(k) || k.length <= 4) {
          return `\\b${escaped}(\\b|\\s|\\.)`;
        }
        return escaped;
      }).join('|');
      
      const regex = new RegExp(keywords, 'i');
      if (regex.test(name)) {
        matchedStream = mapping.stream;
        break;
      }
    }

    if (course.stream !== matchedStream) {
      bulkOps.push({
        updateOne: {
          filter: { _id: course._id },
          update: { $set: { stream: matchedStream } }
        }
      });
      updatedCount++;
    }

    if (bulkOps.length >= 500) {
      await Course.bulkWrite(bulkOps);
      bulkOps.length = 0;
      console.log(`Updated ${updatedCount} courses so far...`);
    }
  }

  if (bulkOps.length > 0) {
    await Course.bulkWrite(bulkOps);
  }

  console.log(`Migration complete. Total updated: ${updatedCount}`);
  
  const finalDist = await Course.aggregate([
    { $group: { _id: '$stream', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('Final Stream Distribution:', finalDist);

  await mongoose.disconnect();
}

migrate();
