const University = require('../models/University');

// The public site origin (Vercel domain). Overridable via env for staging.
const SITE_URL = (process.env.SITE_URL || 'https://privateuniversity.vidyarthimitra.org').replace(/\/$/, '');

// Only pages that are genuinely public + indexable belong in a sitemap.
// Mirrors PUBLISHED_UNIVERSITY_FILTER in universityController so the sitemap
// never advertises a URL that the detail endpoint would 404.
const PUBLIC_UNIVERSITY_FILTER = {
  $and: [
    { $or: [{ status: 'published' }, { status: { $exists: false } }] },
    { 'seo.indexStatus': { $ne: 'noindex' } },
  ],
};

const xmlEscape = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * State name to /universities/in-<slug>. Must stay identical to the one in
 * frontend/api/_seoRender.js, which resolves the slug back to a stored name —
 * a mismatch here advertises a URL that renders an empty page.
 *
 * Collapsing every non-alphanumeric run, not just whitespace: a stored name
 * containing a slash would otherwise produce an extra path segment and a URL
 * that does not route at all.
 */
const stateSlug = (state) =>
  String(state || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const sendXml = (res, xml) => {
  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600, s-maxage=21600');
  res.send(xml);
};

const urlTag = ({ loc, lastmod, changefreq, priority }) => {
  const parts = [`    <loc>${xmlEscape(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
};

// GET /sitemap.xml — the index that points crawlers to each child sitemap.
exports.getSitemapIndex = async (req, res) => {
  try {
    const now = new Date().toISOString();
    const children = ['sitemap-static.xml', 'sitemap-universities.xml'];
    const body = children
      .map(
        (name) =>
          `  <sitemap>\n    <loc>${SITE_URL}/${name}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`
      )
      .join('\n');
    sendXml(
      res,
      `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`
    );
  } catch (error) {
    res.status(500).send(`<!-- sitemap error: ${xmlEscape(error.message)} -->`);
  }
};

// GET /sitemap-static.xml — hand-maintained list of evergreen public pages.
exports.getStaticSitemap = async (req, res) => {
  try {
    /**
     * State pages come from the data, not from a hand-written list.
     *
     * The list here named 21 states while the catalogue covers 33, so a dozen
     * state pages were absent from the sitemap — and those pages are how a
     * crawler reaches the universities inside them. A hardcoded list also drifts
     * the other way: a slug that no longer matches a stored state name renders
     * an empty page that the sitemap still advertises.
     */
    const states = await University.distinct('state', {
      $and: [
        PUBLIC_UNIVERSITY_FILTER,
        /**
         * The same segment condition the state pages themselves use. Without
         * it the sitemap advertises buckets like "Global/Online Partnerships",
         * which is not an Indian state, has no state page behind it, and would
         * render empty — a sitemap must only list URLs that resolve.
         */
        {
          $or: [
            { segment: 'normal' },
            { segment: { $exists: false }, type: { $nin: ['foreign', 'twinning'] } },
          ],
        },
      ],
    });

    const stateRoutes = [...new Set(states.map(stateSlug).filter(Boolean))].sort().map((slug) => ({
      path: `/universities/in-${slug}`,
      priority: '0.8',
      changefreq: 'weekly',
    }));

    const naacGrades = ['naac-a-plus-plus', 'naac-a-plus', 'naac-a'];

    const naacRoutes = naacGrades.map((g) => ({
      path: `/universities/${g}`,
      priority: '0.8',
      changefreq: 'weekly',
    }));

    const routes = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/universities', priority: '0.9', changefreq: 'daily' },
      ...stateRoutes,
      ...naacRoutes,
      { path: '/foreign-universities', priority: '0.8', changefreq: 'weekly' },
      { path: '/courses', priority: '0.8', changefreq: 'weekly' },
      { path: '/exams', priority: '0.7', changefreq: 'weekly' },
      { path: '/compare-universities', priority: '0.6', changefreq: 'monthly' },
      { path: '/admission-through-vm', priority: '0.8', changefreq: 'weekly' },
      { path: '/about', priority: '0.4', changefreq: 'monthly' },
      { path: '/contact', priority: '0.4', changefreq: 'monthly' },
      { path: '/privacy-policy', priority: '0.2', changefreq: 'yearly' },
      { path: '/terms-and-conditions', priority: '0.2', changefreq: 'yearly' },
      { path: '/refund-cancellation', priority: '0.2', changefreq: 'yearly' },
    ];
    const body = routes
      .map((r) => urlTag({ loc: `${SITE_URL}${r.path}`, changefreq: r.changefreq, priority: r.priority }))
      .join('\n');
    sendXml(
      res,
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`
    );
  } catch (error) {
    res.status(500).send(`<!-- sitemap error: ${xmlEscape(error.message)} -->`);
  }
};


// GET /sitemap-universities.xml — every published, indexable university page.
exports.getUniversitiesSitemap = async (req, res) => {
  try {
    const universities = await University.find(PUBLIC_UNIVERSITY_FILTER)
      .select('slug updatedAt')
      .lean();

    const body = universities
      .filter((u) => u.slug)
      .map((u) =>
        urlTag({
          loc: `${SITE_URL}/universities/${u.slug}`,
          lastmod: u.updatedAt ? new Date(u.updatedAt).toISOString() : undefined,
          changefreq: 'weekly',
          priority: '0.7',
        })
      )
      .join('\n');

    sendXml(
      res,
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`
    );
  } catch (error) {
    res.status(500).send(`<!-- sitemap error: ${xmlEscape(error.message)} -->`);
  }
};
