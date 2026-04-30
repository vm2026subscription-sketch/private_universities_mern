/**
 * Seed default site settings into MongoDB.
 * Run: node scripts/seedSettings.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const SiteSetting = require('../src/models/SiteSetting');

const defaultSettings = [
  // General
  { key: 'siteName', value: 'Vidyarthi Mitra', category: 'general', label: 'Site Name', type: 'text' },
  { key: 'tagline', value: 'Find Your Perfect University in India', category: 'general', label: 'Tagline', type: 'text' },
  { key: 'heroTitle', value: 'Find Your Perfect University in India', category: 'general', label: 'Hero Title', type: 'text' },
  { key: 'heroSubtitle', value: 'Explore 500+ Private and Deemed Universities across all major Indian states', category: 'general', label: 'Hero Subtitle', type: 'textarea' },
  { key: 'footerText', value: '© 2026 Vidyarthi Mitra. All rights reserved.', category: 'general', label: 'Footer Text', type: 'textarea' },
  { key: 'maintenanceMode', value: false, category: 'general', label: 'Maintenance Mode', type: 'boolean' },

  // Appearance
  { key: 'logo', value: '', category: 'appearance', label: 'Logo URL', type: 'image', description: 'Upload via Cloudinary and paste URL' },
  { key: 'favicon', value: '', category: 'appearance', label: 'Favicon URL', type: 'image' },
  { key: 'primaryColor', value: '#6366f1', category: 'appearance', label: 'Primary Color', type: 'color' },

  // Contact
  { key: 'contactEmail', value: 'vidyarthimitrauniversity@gmail.com', category: 'contact', label: 'Contact Email', type: 'text' },
  { key: 'contactPhone', value: '', category: 'contact', label: 'Contact Phone', type: 'text' },
  { key: 'address', value: '', category: 'contact', label: 'Office Address', type: 'textarea' },

  // Social
  { key: 'facebookUrl', value: '', category: 'social', label: 'Facebook URL', type: 'text' },
  { key: 'twitterUrl', value: '', category: 'social', label: 'Twitter/X URL', type: 'text' },
  { key: 'instagramUrl', value: '', category: 'social', label: 'Instagram URL', type: 'text' },
  { key: 'youtubeUrl', value: '', category: 'social', label: 'YouTube URL', type: 'text' },
  { key: 'linkedinUrl', value: '', category: 'social', label: 'LinkedIn URL', type: 'text' },
  { key: 'whatsappNumber', value: '', category: 'social', label: 'WhatsApp Number', type: 'text' },

  // SEO
  { key: 'metaTitle', value: 'Vidyarthi Mitra - Find Your Perfect University in India', category: 'seo', label: 'Default Meta Title', type: 'text' },
  { key: 'metaDescription', value: 'Compare 500+ private and deemed universities across India. Check fees, placements, NAAC grades, courses, and admission details.', category: 'seo', label: 'Default Meta Description', type: 'textarea' },
  { key: 'googleAnalyticsId', value: '', category: 'seo', label: 'Google Analytics ID', type: 'text' },

  // Integration
  { key: 'geminiApiEnabled', value: true, category: 'integration', label: 'Gemini AI Chat Enabled', type: 'boolean' },
  { key: 'cloudinaryFolder', value: 'vidyarthi-mitra', category: 'integration', label: 'Cloudinary Root Folder', type: 'text' },
];

async function seed() {
  try {
    await connectDB();
    console.log('[seed] Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const setting of defaultSettings) {
      const exists = await SiteSetting.findOne({ key: setting.key });
      if (exists) {
        skipped++;
        continue;
      }
      await SiteSetting.create(setting);
      created++;
    }

    console.log(`[seed] Done: ${created} settings created, ${skipped} already existed`);
    process.exit(0);
  } catch (error) {
    console.error('[seed] Failed:', error.message);
    process.exit(1);
  }
}

seed();
