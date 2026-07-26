#!/usr/bin/env node
/**
 * Builds every index declared in the Mongoose schemas, in the background.
 *
 *   npm run indexes:ensure
 *
 * Why this exists rather than relying on Mongoose's autoIndex:
 *
 *   Mongoose calls createIndexes on model compilation when autoIndex is enabled
 *   (the default). That is convenient in development but a poor fit for a
 *   deploy: index builds start racing the first requests, the process holds the
 *   connection while they run, and a failure is only visible as a log line the
 *   server prints while otherwise appearing healthy. Running it as a deliberate
 *   step means you choose the moment, see exactly what was created, and get a
 *   non-zero exit code if something went wrong.
 *
 * The script is idempotent: an index that already exists is left alone.
 *
 * It also lists indexes that exist in the database but are NOT declared in any
 * schema. It never drops them — an index could be serving a query from a script
 * or an ad-hoc report — it just prints the command you would run to remove it.
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Requiring the models registers every schema (and therefore every index
// declaration) with this mongoose instance.
const MODEL_FILES = [
  'AuditLog', 'Banner', 'ContactSubmission', 'Course', 'Exam', 'FAQ', 'Lead',
  'News', 'Newsletter', 'Notification', 'OtpLog', 'Page', 'Question', 'Session',
  'SiteSetting', 'Testimonial', 'University', 'User',
];

MODEL_FILES.forEach((name) => require(path.join(__dirname, '..', 'src', 'models', name)));

/** Mongoose stores declared indexes as [keys, options] pairs. */
const declaredKeySet = (model) =>
  new Set(model.schema.indexes().map(([keys]) => JSON.stringify(keys)));

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Add it to backend/.env first.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}\n`);

  let created = 0;
  let failed = 0;
  const redundant = [];

  for (const modelName of mongoose.modelNames()) {
    const model = mongoose.model(modelName);
    const collection = model.collection.collectionName;

    const before = new Set();
    try {
      (await model.collection.indexes()).forEach((index) => before.add(index.name));
    } catch (error) {
      // A collection that does not exist yet reports NamespaceNotFound; the
      // createIndexes below will create both it and its indexes.
      if (error.codeName !== 'NamespaceNotFound') throw error;
    }

    try {
      // background:true keeps the collection readable and writable while the
      // index builds — the important part on a live production database.
      await model.createIndexes({ background: true });
    } catch (error) {
      failed += 1;
      console.error(`  x ${collection}: ${error.message}`);
      continue;
    }

    const after = await model.collection.indexes();
    const newNames = after.map((index) => index.name).filter((name) => !before.has(name));

    if (newNames.length) {
      created += newNames.length;
      console.log(`  + ${collection}: created ${newNames.join(', ')}`);
    } else {
      console.log(`  = ${collection}: up to date (${after.length} indexes)`);
    }

    const declared = declaredKeySet(model);
    after.forEach((index) => {
      if (index.name === '_id_') return;
      // Skip indexes Mongoose creates from field-level unique/sparse/index flags
      // rather than schema.index() calls; those are declared, just not listed.
      const keyJson = JSON.stringify(index.key);
      const isSingleField = Object.keys(index.key).length === 1;
      if (declared.has(keyJson) || isSingleField) return;
      redundant.push({ collection, name: index.name, key: index.key });
    });
  }

  if (redundant.length) {
    console.log('\nIndexes present in the database but not declared in any schema.');
    console.log('Nothing was dropped. Review each one, then drop the ones you do not need:\n');
    redundant.forEach(({ collection, name, key }) => {
      console.log(`  ${collection}.${name}  ${JSON.stringify(key)}`);
      console.log(`    db.${collection}.dropIndex("${name}")`);
    });
  }

  console.log(`\nDone. ${created} index(es) created, ${failed} collection(s) failed.`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

run().catch(async (error) => {
  console.error('\nIndex build failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
