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
 * `Vary: User-Agent` splits the cache by the exact UA string, and Googlebot
 * alone sends many variants — so a one-hour TTL meant most crawls missed the
 * edge and went to the origin, which is a free-tier host that sleeps. That
 * round-trip is what a 4.8s average response time is made of, and Google
 * throttles crawl rate against exactly that number.
 *
 * A day of freshness with a week of stale-while-revalidate means a crawler
 * almost always gets an edge hit, and a university's edits still appear within
 * a day. `must-revalidate` is deliberately absent: a stale page served instantly
 * beats a fresh one served after a cold start.
 *
 * Unless the render is degraded. When the backend does not answer inside the
 * six-second budget the page still returns 200, but with meta and no content —
 * and a sleeping free-tier host makes that likely on the first request of the
 * day. Caching that for a day would pin a thin page in front of crawlers long
 * after the backend woke up, so a failed render is cached for two minutes and
 * retried instead.
 */
const cacheHeader = (degraded) =>
  degraded
    ? 'public, max-age=60, s-maxage=120'
    : 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800';

export default async function handler(req, res) {
  const host = req.headers.host;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Bot and human variants live at the same URL — tell caches to keep them apart.
  res.setHeader('Vary', 'User-Agent');

  try {
    const params = new URL(req.url, `https://${host}`).searchParams;
    const slug = (req.query?.slug || params.get('slug') || '').toString();
    const isList = (req.query?.list || params.get('list') || '') === '1';

    const template = await getTemplate(host);
    const ua = req.headers['user-agent'] || '';
    const isBot = BOT_RE.test(ua);

    // Humans always get the shell instantly and never wait on the backend.
    if (!isBot || (!slug && !isList)) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.status(200).send(template);
      return;
    }

    /**
     * The universities index for crawlers: the page that carries the links to
     * every university. Without it a crawler has no path to those pages except
     * the sitemap, which is why they sit at "Discovered – currently not indexed"
     * with no referring page.
     */
    if (isList) {
      const { status, html, degraded } = await renderUniversityList(template);
      res.setHeader('Cache-Control', cacheHeader(degraded));
      res.status(status).send(html);
      return;
    }

    // Crawlers: inject per-university meta, JSON-LD and page content.
    const { status, html, degraded } = await renderUniversity(slug, template);
    res.setHeader('Cache-Control', cacheHeader(degraded));
    res.status(status).send(html);
  } catch {
    // Never fail a page load because of SEO — fall back to the shell.
    try {
      const t = await getTemplate(host);
      res.status(200).send(t);
    } catch {
      res.status(200).send('<!doctype html><html><body><div id="root"></div></body></html>');
    }
  }
}
