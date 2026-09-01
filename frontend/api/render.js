import { renderUniversity, renderUniversityList } from './_seoRender.js';

// Known crawler / link-preview user agents. Only these get the (slightly slower)
// server-rendered <head> + real 404. Human browsers get the static SPA shell
// instantly and never wait on the backend — so cold starts never hurt UX.
const BOT_RE =
  /bot|crawl|spider|slurp|bing|google|facebookexternalhit|facebot|twitter|linkedin|whatsapp|telegram|slack|discord|embed|preview|pinterest|quora|reddit|applebot|baidu|yandex|duckduck|ia_archiver|vkshare|skype|semrush|ahrefs|petalbot/i;

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#002147" />
    <!--SEO-START-->
    <title>Vidyarthi Mitra - Find Your Perfect University in India</title>
    <meta name="description" content="Explore 700+ private, deemed and international universities across India. Compare fees, NAAC grades, NIRF rankings, courses, placements and admissions." />
    <!--SEO-END-->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

let TEMPLATE = null;
async function getTemplate(host) {
  if (TEMPLATE) return TEMPLATE;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`https://${host}/index.html`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      TEMPLATE = await res.text();
      return TEMPLATE;
    }
  } catch {
    // Fall back to embedded template instantly if self-fetch fails or times out
  }
  return DEFAULT_TEMPLATE;
}

/**
 * Cache hard at the edge, and keep serving while refreshing.
 *
 * If the render is degraded (backend timed out or failed), use a very short
 * cache so crawlers retry quickly but don't hammer the endpoint. no-store
 * causes Google to re-fetch on every request, which wastes crawl budget on
 * a page that will fail again immediately.
 */
const cacheHeader = (degraded) =>
  degraded
    ? 'public, max-age=30, s-maxage=60, stale-while-revalidate=120'
    : 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800';

export default async function handler(req, res) {
  const host = req.headers.host;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  try {
    const params = new URL(req.url, `https://${host}`).searchParams;
    const slug = (req.query?.slug || params.get('slug') || '').toString();
    const isList = (req.query?.list || params.get('list') || '') === '1';

    const template = await getTemplate(host);

    if (!slug && !isList) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.status(200).send(template);
      return;
    }

    /**
     * The universities index: pre-rendered HTML with links to every university.
     */
    if (isList) {
      const { status, html, degraded } = await renderUniversityList(template);
      res.setHeader('Cache-Control', cacheHeader(degraded));
      res.status(status).send(html);
      return;
    }

    // Per-university page: pre-rendered HTML with meta, JSON-LD and page content.
    const { status, html, degraded } = await renderUniversity(slug, template);
    res.setHeader('Cache-Control', cacheHeader(degraded));
    res.status(status).send(html);
  } catch {
    // Never fail a page load because of SEO — fall back to the shell.
    try {
      const t = await getTemplate(host);
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60');
      res.status(200).send(t);
    } catch {
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60');
      res.status(200).send('<!doctype html><html><body><div id="root"></div></body></html>');
    }
  }
}

