const mongoose = require('mongoose');
const University = require('./src/models/University');
const Course = require('./src/models/Course');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    // A regex to match common course prefixes that were mistakenly added as universities
    const courseRegex = /^(b\.|m\.|bachelor|master|diploma|phd|certificate|pg|ug|btech|mtech|bba|mba|bca|mca|bcom|mcom|bsc|msc|ba|ma|md|ms)/i;
    
    const fakeUnis = await University.find({ name: { $regex: courseRegex } });
    console.log(`Found ${fakeUnis.length} fake universities.`);
    
    let deletedCount = 0;
    for (const uni of fakeUnis) {
        await University.findByIdAndDelete(uni._id);
        deletedCount++;
    }
    console.log(`Deleted ${deletedCount} fake universities.`);
    process.exit(0);
});
