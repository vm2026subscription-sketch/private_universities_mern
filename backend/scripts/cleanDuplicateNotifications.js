const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const Notification = require('../src/models/Notification');

async function cleanDuplicates() {
  try {
    await connectDB();
    console.log('[cleanup] Connected to DB. Analyzing notifications...');

    const allNotifications = await Notification.find().sort({ createdAt: -1 });
    console.log(`[cleanup] Found ${allNotifications.length} total notification records.`);

    const seen = new Set();
    const idsToDelete = [];

    for (const notif of allNotifications) {
      // Key based on userId, title, message, and targetRole
      const key = `${notif.userId || 'nouser'}_${notif.targetRole || 'norole'}_${notif.title}_${notif.message}`;

      if (seen.has(key)) {
        idsToDelete.push(notif._id);
      } else {
        seen.add(key);
      }
    }

    if (idsToDelete.length > 0) {
      const res = await Notification.deleteMany({ _id: { $in: idsToDelete } });
      console.log(`[cleanup] Successfully removed ${res.deletedCount} duplicate notification records.`);
    } else {
      console.log('[cleanup] No duplicate notifications found.');
    }

    // Also update any per-user notifications that had targetRole set on them
    const updatedRes = await Notification.updateMany(
      { userId: { $exists: true, $ne: null }, targetRole: { $exists: true } },
      { $unset: { targetRole: "" } }
    );
    console.log(`[cleanup] Cleaned targetRole on ${updatedRes.modifiedCount} per-user notifications.`);

    process.exit(0);
  } catch (error) {
    console.error('[cleanup] Failed to clean duplicates:', error);
    process.exit(1);
  }
}

cleanDuplicates();
