const path = require('path');
const mongoose = require('mongoose');
const slugify = require('slugify');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const University = require('../src/models/University');
const Course = require('../src/models/Course');

const cleanMaps = {
    // Delhi Deemed
    "Indian Institute of Fo": "Indian Institute of Foreign Trade (IIFT)",
    "Indian Agricultural Re": "Indian Agricultural Research Institute (IARI)",
    "Indian Institute of He": "Indian Institute of Health Management Research",
    "Indian Institute of Ma": "Indian Institute of Mass Communication",
    "Indian Law Institute (": "Indian Law Institute (ILI)",
    "Institute of Liver and": "Institute of Liver and Biliary Sciences (ILBS)",
    "Morarji Desai National": "Morarji Desai National Institute of Yoga",
    "National Council of Ed": "National Council of Educational Research and Training (NCERT)",
    "National Institute of ": "National Institute of Educational Planning and Administration",
    "TERI School of Advance": "TERI School of Advanced Studies (TERI SAS)",

    // TN Deemed
    "Academy of Maritime Educatio": "Academy of Maritime Education and Training (AMET)",
    "Avinashilingam Institute for": "Avinashilingam Institute for Home Science and Higher Education for Women",
    "B.S. Abdur Rahman Institute ": "B.S. Abdur Rahman Crescent Institute of Science and Technology",
    "Bharath Institute of Higher ": "Bharath Institute of Higher Education and Research",
    "Chennai Mathematical Institu": "Chennai Mathematical Institute (CMI)",
    "Chettinad Academy of Researc": "Chettinad Academy of Research and Education (CARE)",
    "Dr. M.G.R. Educational and R": "Dr. M.G.R. Educational and Research Institute",
    "Hindustan Institute of Techn": "Hindustan Institute of Technology and Science (HITS)",
    "Kalasalingam Academy of Rese": "Kalasalingam Academy of Research and Education",
    "Karpagam Academy of Higher E": "Karpagam Academy of Higher Education",
    "Karunya Institute of Technol": "Karunya Institute of Technology and Sciences",
    "Meenakshi Academy of Higher ": "Meenakshi Academy of Higher Education and Research",
    "National Institute of Techni": "National Institute of Technical Teachers Training and Research (NITTTR)",
    "Noorul Islam Centre for High": "Noorul Islam Centre for Higher Education",
    "Periyar Maniammai Institute ": "Periyar Maniammai Institute of Science and Technology",
    "Ponnaiyah Ramajayam Institut": "Ponnaiyah Ramajayam Institute of Science and Technology (PRIST)",
    "S.R.M Institute of Science a": "SRM Institute of Science and Technology",
    "Sathyabama Institute of Scie": "Sathyabama Institute of Science and Technology",
    "Saveetha Institute of Medica": "Saveetha Institute of Medical and Technical Sciences (SIMATS)",
    "Shanmugha Arts Science Techn": "SASTRA Deemed University",
    "Sri Chandrasekharendra Saras": "Sri Chandrasekharendra Saraswathi Viswa Mahavidyalaya",
    "Sri Ramachandra Institute of": "Sri Ramachandra Institute of Higher Education and Research",
    "St. Peters Institute of Hig": "St. Peter's Institute of Higher Education and Research",
    "The Gandhigram Rural Institu": "The Gandhigram Rural Institute",
    "Vel Tech Rangarajan Dr. Sagu": "Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology",
    "Vellore Institute of Technol": "Vellore Institute of Technology (VIT)",
    "VELS Institute of Science Te": "Vels Institute of Science, Technology & Advanced Studies (VISTAS)",
    "Vinayaka Missions Research ": "Vinayaka Mission's Research Foundation",

    // Foreign
    "Deakin University India (GIFT": "Deakin University India (GIFT City)",
    "University of Wollongong Indi": "University of Wollongong India",
    "University of Southampton Ind": "University of Southampton India",
    "Queen's University Belfast In": "Queen's University Belfast India",
    "Coventry University India (GI": "Coventry University India",
    "University of Liverpool India": "University of Liverpool India",
    "University of York India (Mah": "University of York India",
    "University of Bristol India (": "University of Bristol India",
    "University of Aberdeen India ": "University of Aberdeen India",
    "Illinois Institute of Techno": "Illinois Institute of Technology India",
    "Victoria University India (D": "Victoria University India",
    "Western Sydney University In": "Western Sydney University India",
    "Istituto Europeo di Design (": "Istituto Europeo di Design",
    "La Trobe University India": "La Trobe University India",
    "University of Lancaster Indi": "University of Lancaster India",
    "University of Western Austra": "University of Western Australia India"
};

async function clean() {
    await connectDB();
    console.log('[clean] Connected to DB. Beginning exhaustive cleanup of university names and slugs...');

    const universities = await University.find({});
    console.log(`Found ${universities.length} universities.`);

    let updatedCount = 0;

    for (const uni of universities) {
        let originalName = uni.name.trim();
        let name = originalName;

        // 1. Strip leading digits and hyphens (e.g. "1-", "2-", "10-")
        const match = name.match(/^\d+-\s*(.*)$/);
        if (match) {
            name = match[1].trim();
        }

        // 2. Map known truncated/prefixed names
        for (const [truncated, fullName] of Object.entries(cleanMaps)) {
            if (name === truncated || name.startsWith(truncated)) {
                name = fullName;
                break;
            }
        }

        if (name !== originalName) {
            let baseSlug = slugify(name, { lower: true, strict: true });
            let slug = baseSlug;
            let success = false;
            let attempt = 0;

            while (!success) {
                try {
                    uni.name = name;
                    uni.slug = slug;
                    await uni.save();
                    success = true;
                    console.log(`Updated: "${originalName}" -> "${name}" | Slug: "${slug}"`);
                } catch (err) {
                    if (err.code === 11000) {
                        attempt++;
                        if (attempt === 1 && uni.city) {
                            slug = `${baseSlug}-${slugify(uni.city, { lower: true, strict: true })}`;
                        } else {
                            slug = `${baseSlug}-${attempt}`;
                        }
                        console.log(`Duplicate slug encountered. Retrying as "${slug}"...`);
                    } else {
                        throw err;
                    }
                }
            }

            // Update course slugs and info that referenced the old uni slug
            const courses = await Course.find({ universityId: uni._id });
            for (const course of courses) {
                const cleanCourseName = course.name.trim();
                const newCourseSlug = slugify(`${slug} ${cleanCourseName}`, { lower: true, strict: true });
                course.slug = newCourseSlug;
                await course.save();
            }

            updatedCount++;
        }
    }

    console.log(`[DONE] Exhaustively cleaned ${updatedCount} university names and updated their respective course slugs.`);
    mongoose.connection.close();
}

clean();
