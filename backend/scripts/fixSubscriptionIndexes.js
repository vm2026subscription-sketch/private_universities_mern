/**
 * Rebuilds the unique index on Subscription.razorpayPaymentId as sparse.
 *
 * Mongoose creates an index the first time a collection is used and never
 * alters it afterwards, so marking the field `sparse` in the schema changed
 * nothing in the database. The live index is unique and non-sparse, which means
 * a second document with a null payment id — every admin-granted trial after the
 * first — is rejected as a duplicate of the first null.
 *
 *   node scripts/fixSubscriptionIndexes.js         # report only
 *   node scripts/fixSubscriptionIndexes.js --yes   # rebuild
 *
 * Safe: it drops and recreates one index. No document is read or written.
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');

const TARGET = 'razorpayPaymentId_1';

const run = async () => {
  const confirmed = process.argv.includes('--yes');
  await connectDB();

  const collection = mongoose.connection.db.collection('subscriptions');
  const indexes = await collection.indexes();
  const current = indexes.find((i) => i.name === TARGET);

  if (!current) {
    console.log(`No ${TARGET} index found — nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  console.log(`Current: unique=${Boolean(current.unique)} sparse=${Boolean(current.sparse)}`);

  if (current.sparse) {
    console.log('Already sparse. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  if (!confirmed) {
    console.log('\nWould drop and recreate it as { unique: true, sparse: true }.');
    console.log('Re-run with --yes to apply:\n');
    console.log('  node scripts/fixSubscriptionIndexes.js --yes\n');
    await mongoose.disconnect();
    return;
  }

  await collection.dropIndex(TARGET);
  console.log('Dropped.');

  await collection.createIndex({ razorpayPaymentId: 1 }, { unique: true, sparse: true, name: TARGET });
  console.log('Recreated as unique + sparse.');

  const after = (await collection.indexes()).find((i) => i.name === TARGET);
  console.log(`Now: unique=${Boolean(after.unique)} sparse=${Boolean(after.sparse)}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Failed:', error.message);
  try { await mongoose.disconnect(); } catch { /* already closed */ }
  process.exitCode = 1;
});
