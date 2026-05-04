const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const University = require('../src/models/University');

async function getMissing() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const unis = await University.find({ 
            $or: [
                { logoUrl: { $exists: false } },
                { logoUrl: '' },
                { logoUrl: { $not: /^\/images\/university-logos\// } }
            ]
        }, 'name');
        console.log(unis.map(u => u.name).join('\n'));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getMissing();
