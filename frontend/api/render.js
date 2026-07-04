import { renderUniversity } from './_seoRender.js';

// Known crawler / link-preview user agents. Only these get the (slightly slower)
// server-rendered <head> + real 404. Human browsers get the static SPA shell
// instantly and never wait on the backend — so cold starts never hurt UX.
const BOT_RE =
  /bot|crawl|spider|slurp|bing|google|facebookexternalhit|facebot|twitter|linkedin|whatsapp|telegram|slack|discord|embed|preview|pinterest|quora|reddit|applebot|baidu|yandex|duckduck|ia_archiver|vkshare|skype|semrush|ahrefs|petalbot/i;

// The built index.html, cached in module scope across warm invocations.
let TEMPLATE = null;
async function getTemplate(host) {
  if (TEMPLATE) return TEMPLATE;
  const res = await fetch(`https://${host}/index.html`);
  TEMPLATE = await res.text();
  return TEMPLATE;
}

export default async function handler(req, res) {
  const host = req.headers.host;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Bot and human variants live at the same URL — tell caches to keep them apart.
  res.setHeader('Vary', 'User-Agent');

  try {
    const slug = (
      req.query?.slug ||
      new URL(req.url, `https://${host}`).searchParams.get('slug') ||
      ''
    ).toString();

    const template = await getTemplate(host);
    const ua = req.headers['user-agent'] || '';

    // Humans (or a missing slug): serve the SPA shell immediately.
    if (!slug || !BOT_RE.test(ua)) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.status(200).send(template);
      return;
    }

    // Crawlers: inject per-university meta + JSON-LD, return the right status.
    const { status, html } = await renderUniversity(slug, template);
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
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
