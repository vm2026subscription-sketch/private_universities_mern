/**
 * Minimal test helpers.
 *
 * The project has no test framework and adding one (jest/mocha) would mean a new
 * dependency, so these tests run on plain `node` with the built-in `assert`
 * module. `npm test` runs them all.
 */

const state = { pass: 0, fail: 0, failures: [] };

const section = (title) => {
  console.log(`\n${title}`);
};

/** Runs a test. The body may be sync or async. */
const test = async (name, fn) => {
  try {
    await fn();
    state.pass += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    state.fail += 1;
    state.failures.push({ name, error });
    console.log(`  FAIL ${name}`);
    console.log(`       ${error.message.split('\n').join('\n       ')}`);
  }
};

/** Express-like response double: records status and body instead of sending. */
const mockResponse = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  send(body) { this.body = body; return this; },
  set(key, value) { this.headers[key] = value; return this; },
  setHeader(key, value) { this.headers[key] = value; return this; },
  redirect(url) { this.redirected = url; return this; },
});

const summary = () => {
  console.log(`\n${state.pass} passed, ${state.fail} failed`);
  return state.fail === 0;
};

module.exports = { test, section, mockResponse, summary, state };
