#!/usr/bin/env node
/**
 * Test runner.  `npm test`
 *
 * Deliberately framework-free: the project had no test tooling, and these checks
 * need nothing beyond node's built-in `assert`. None of them touch the database
 * or the network, so they are safe to run in CI without a MONGODB_URI.
 *
 * Add a suite by dropping a `*.test.js` file in this folder that exports an
 * async function.
 */

const path = require('path');
const fs = require('fs');
const { summary, state } = require('./helpers');

const SUITES = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith('.test.js'))
  .sort();

const run = async () => {
  console.log(`Running ${SUITES.length} suite(s): ${SUITES.join(', ')}`);

  let skipped = 0;

  for (const file of SUITES) {
    console.log(`\n${'='.repeat(60)}\n${file}\n${'='.repeat(60)}`);

    let suite;
    try {
      suite = require(path.join(__dirname, file));
    } catch (error) {
      // A suite that needs an installed dependency (routes.test.js loads app.js,
      // which needs express) is SKIPPED rather than aborting the whole run, so
      // `npm test` still reports the dependency-free checks before `npm install`.
      if (error.code === 'MODULE_NOT_FOUND') {
        skipped += 1;
        console.log(`  skipped: a dependency is not installed (${error.message.split('\n')[0]})`);
        console.log('           run `npm install` to include this suite.');
        continue;
      }
      state.fail += 1;
      console.log(`  FAIL ${file} could not be loaded\n       ${error.stack}`);
      continue;
    }

    if (typeof suite !== 'function') {
      console.log(`  (skipped: ${file} does not export a function)`);
      continue;
    }

    try {
      await suite();
    } catch (error) {
      state.fail += 1;
      console.log(`  FAIL ${file} threw outside a test\n       ${error.stack}`);
    }
  }

  if (skipped) {
    console.log(`\n${skipped} suite(s) skipped because dependencies are not installed.`);
  }

  process.exit(summary() ? 0 : 1);
};

run();
