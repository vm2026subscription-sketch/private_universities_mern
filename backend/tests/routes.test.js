/**
 * Route-wiring tests.
 *
 * Loads app.js and walks the Express router stack, asserting:
 *  - every registered handler is a function (the classic "Route.post() requires
 *    a callback function but got [object Undefined]" boot crash, which happens
 *    when an export is renamed or a middleware import is mistyped)
 *  - the public write endpoints sit behind a rate limiter
 *  - EVERY multipart upload runs content validation after multer
 *  - the temporary /setup-admin endpoint is not registered anywhere
 *  - the 404 and error handlers are last, in that order
 *
 * No database connection is opened — app.js only builds the router.
 */

const assert = require('assert');
const { test, section } = require('./helpers');

// app.js reads these at require time.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = require('../src/app');

// Express 4 exposes the root router as app._router; Express 5 as app.router.
const rootRouter = app._router || app.router;

/** Flattens the Express router tree into a list of routes. */
const collectRoutes = (router) => {
  const routes = [];

  for (const layer of router?.stack || []) {
    if (layer.route) {
      routes.push({
        methods: Object.keys(layer.route.methods).filter((m) => layer.route.methods[m]),
        path: layer.route.path,
        handlers: layer.route.stack.map((s) => s.handle),
        handlerNames: layer.route.stack.map((s) => s.handle?.name || '<anonymous>'),
      });
    } else if (layer.handle?.stack) {
      routes.push(...collectRoutes(layer.handle));
    }
  }
  return routes;
};

/** Top-level middleware names, in registration order. */
const appMiddleware = () =>
  (rootRouter?.stack || [])
    .filter((layer) => !layer.route)
    .map((layer) => layer.handle?.name || layer.name || '<anonymous>');

const isMulter = (name) => /multer/i.test(name);
const isRateLimiter = (name) => /ratelimit/i.test(name);
const CONTENT_VALIDATORS = ['validateImageUpload', 'validateSpreadsheetUpload'];

module.exports = async () => {
  const routes = collectRoutes(rootRouter);

  section('route wiring');

  await test('app.js builds a router with routes', () => {
    assert.ok(routes.length > 50, `only found ${routes.length} routes`);
  });

  await test('every route handler is a function', () => {
    const bad = [];
    routes.forEach(({ methods, path, handlers }) => {
      handlers.forEach((handler, i) => {
        if (typeof handler !== 'function') {
          bad.push(`${methods.join('/').toUpperCase()} ${path} [position ${i}] is ${typeof handler}`);
        }
      });
    });
    assert.deepStrictEqual(bad, [], `\n       ${bad.join('\n       ')}`);
  });

  section('public write endpoints are rate limited');

  // Paths are matched on the router-local path, since the mount prefix
  // (/api/v1, /api/v1/questions, ...) lives on the parent layer's regexp.
  const rateLimited = [
    ['/contact', 'contact form'],
    ['/newsletter/subscribe', 'newsletter subscribe'],
    ['/newsletter/unsubscribe', 'newsletter unsubscribe'],
    ['/leads/submit', 'lead capture'],
    ['/assist', 'AI assistant'],
  ];

  for (const [path, label] of rateLimited) {
    await test(`POST ${path} (${label}) runs a limiter before its handler`, () => {
      const route = routes.find((r) => r.methods.includes('post') && r.path === path);
      assert.ok(route, `route ${path} is not registered`);
      assert.ok(
        isRateLimiter(route.handlerNames[0]),
        `first handler is "${route.handlerNames[0]}", expected a rate limiter`
      );
    });
  }

  section('uploads validate real file content');

  const multipartRoutes = routes.filter((r) => r.handlerNames.some(isMulter));

  await test('every multipart route was found', () => {
    // image upload, avatar, and the four Excel endpoints
    assert.strictEqual(
      multipartRoutes.length,
      6,
      `found ${multipartRoutes.length}: ${multipartRoutes.map((r) => r.path).join(', ')}`
    );
  });

  await test('NO multipart route accepts a file without a content check', () => {
    const unguarded = multipartRoutes
      .filter((r) => !r.handlerNames.some((n) => CONTENT_VALIDATORS.includes(n)))
      .map((r) => `${r.methods.join('/')} ${r.path} -> ${r.handlerNames.join(', ')}`);
    assert.deepStrictEqual(unguarded, [], `\n       ${unguarded.join('\n       ')}`);
  });

  await test('content validation always runs AFTER multer has buffered the file', () => {
    const wrongOrder = [];
    multipartRoutes.forEach((r) => {
      const multerIndex = r.handlerNames.findIndex(isMulter);
      const validatorIndex = r.handlerNames.findIndex((n) => CONTENT_VALIDATORS.includes(n));
      if (validatorIndex < multerIndex) {
        wrongOrder.push(`${r.path}: validator at ${validatorIndex}, multer at ${multerIndex}`);
      }
    });
    assert.deepStrictEqual(wrongOrder, []);
  });

  await test('Excel endpoints use the spreadsheet validator, image endpoints the image one', () => {
    const excel = multipartRoutes.filter((r) => ['/sheets', '/preview', '/confirm', '/bulk'].includes(r.path));
    assert.strictEqual(excel.length, 4, `found ${excel.length} Excel routes`);
    excel.forEach((r) =>
      assert.ok(r.handlerNames.includes('validateSpreadsheetUpload'), `${r.path}: ${r.handlerNames.join(', ')}`)
    );

    const images = multipartRoutes.filter((r) => !['/sheets', '/preview', '/confirm', '/bulk'].includes(r.path));
    assert.strictEqual(images.length, 2);
    images.forEach((r) =>
      assert.ok(r.handlerNames.includes('validateImageUpload'), `${r.path}: ${r.handlerNames.join(', ')}`)
    );
  });

  section('removed endpoints stay removed');

  await test('no /setup-admin (or any setup) route is registered', () => {
    const setupRoutes = routes
      .filter((r) => /setup/i.test(r.path))
      .map((r) => `${r.methods.join('/')} ${r.path}`);
    assert.deepStrictEqual(setupRoutes, []);
  });

  section('error handling is mounted last');

  await test('the 404 handler precedes the error handler, both at the end', () => {
    assert.deepStrictEqual(appMiddleware().slice(-2), ['notFoundHandler', 'errorHandler']);
  });
};
