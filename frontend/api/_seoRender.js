// Framework-agnostic server-side SEO rendering used by the Vercel function
// (api/render.js). Kept in plain Node (no Vite import.meta) so it runs in the
// serverless runtime, and pure (fetch is injectable) so it is unit-testable.
// Files in /api starting with "_" are treated as helpers, not routes, by Vercel.

const SITE_URL = (process.env.SITE_URL || 'https://privateuniversity.vidyarthimitra.org').replace(/\/$/, '');
const SITE_NAME = 'Vidyarthi Mitra';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/logo.png`;
const API_BASE = (process.env.SEO_API_URL || 'https://private-universities-mern.onrender.com/api/v1').replace(/\/$/, '');

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const truncate = (t, max = 155) => {
  const c = String(t || '').replace(/\s+/g, ' ').trim();
  return c.length <= max ? c : `${c.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

const typeLabel = (u = {}) => {
  const seg = u.segment || u.type;
  if (seg === 'twinning') return 'Twinning University';
  if (seg === 'foreign') return 'Foreign University';
  return (u.institutionKind || u.type) === 'deemed' ? 'Deemed University' : 'Private University';
};

export function buildUniversitySeo(u = {}) {
  const seo = u.seo || {};
  const loc = [u.city, u.state].filter(Boolean).join(', ');
  const title = seo.seoTitle || `${u.name}${loc ? ` — ${typeLabel(u)} in ${loc}` : ''} | ${SITE_NAME}`;
  const description =
    seo.metaDescription ||
    truncate(u.description) ||
    `Explore ${u.name}${loc ? `, ${loc}` : ''}: courses, fees, placements${
      u.naacGrade ? `, NAAC ${u.naacGrade}` : ''
    }${u.nirfRank ? `, NIRF rank ${u.nirfRank}` : ''} and admissions.`;
  return {
    title,
    description,
    canonical: seo.canonicalUrl || `${SITE_URL}/universities/${u.slug}`,
    image: seo.ogImage || u.bannerImageUrl || u.logoUrl || DEFAULT_OG_IMAGE,
    ogTitle: seo.ogTitle || title,
    ogDescription: seo.ogDescription || description,
    noindex: seo.indexStatus === 'noindex',
  };
}

const compact = (o) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export function universityJsonLd(u = {}) {
  const s = buildUniversitySeo(u);
  const org = compact({
    '@type': 'CollegeOrUniversity',
    name: u.name,
    url: s.canonical,
    description: s.description,
    logo: u.logoUrl || undefined,
    image: u.bannerImageUrl || u.logoUrl || undefined,
    telephone: u.phone || undefined,
    email: u.email || undefined,
    foundingDate: u.establishedYear ? String(u.establishedYear) : undefined,
    sameAs: u.website ? [u.website] : undefined,
  });
  org.address = compact({
    '@type': 'PostalAddress',
    streetAddress: u.address || undefined,
    addressLocality: u.city || undefined,
    addressRegion: u.state || undefined,
    addressCountry: 'IN',
  });
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Universities', item: `${SITE_URL}/universities` },
      { '@type': 'ListItem', position: 3, name: u.name, item: s.canonical },
    ],
  };
  return { '@context': 'https://schema.org', '@graph': [org, breadcrumb] };
}

// Build the replacement <head> SEO block as an HTML string.
function metaBlock({ title, description, canonical, image, noindex, jsonLd }) {
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow'}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ];
  if (jsonLd) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
    );
  }
  return tags.join('\n    ');
}

/**
 * Server-rendered page content for crawlers.
 *
 * Until now the prerender filled in <head> and left <div id="root"> empty, so a
 * crawler received a correct title, description and JSON-LD wrapped around a
 * page with about a hundred characters of text. Google can execute JavaScript to
 * find the rest, but that work is queued separately and costs far more crawl
 * budget than fetching HTML — which is why 39% of crawl requests on this site are
 * JavaScript, and why 747 sitemap URLs were drawing only ~50 crawls a day.
 *
 * The markup below is what the page is actually about: the name as an <h1>, the
 * description, the facts a student searches for, and the course list. Course
 * names in particular are the long-tail queries this site should win, and they
 * were invisible without JS.
 *
 * React replaces these children when it mounts — createRoot().render() clears
 * the container — so this is prerendered content, not hydration, and the app
 * behaves exactly as before for real visitors.
 */
export function renderUniversityBody(u = {}) {
  const loc = [u.city, u.state].filter(Boolean).join(', ');

  const facts = [
    ['Type', typeLabel(u)],
    ['Location', loc],
    ['Established', u.establishedYear],
    ['NAAC Grade', u.naacGrade],
    ['NIRF Rank', u.nirfRank],
    ['Approvals', Array.isArray(u.approvals) ? u.approvals.join(', ') : undefined],
    ['Average Package', u.stats?.avgPackageLPA ? `${u.stats.avgPackageLPA} LPA` : undefined],
    ['Highest Package', u.stats?.highestPackageLPA ? `${u.stats.highestPackageLPA} LPA` : undefined],
    ['Placement Rate', u.stats?.placementPercentage ? `${u.stats.placementPercentage}%` : undefined],
    ['Website', u.website],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');

  const courses = Array.isArray(u.courses) ? u.courses.filter((c) => c && c.name) : [];

  const list = (items, render) =>
    items.length ? `<ul>${items.map(render).join('')}</ul>` : '';

  return `
      <main>
        <h1>${esc(u.name)}</h1>
        ${loc ? `<p>${esc(typeLabel(u))} in ${esc(loc)}</p>` : ''}
        ${u.description ? `<p>${esc(u.description)}</p>` : ''}
        ${u.vision ? `<h2>Vision</h2><p>${esc(u.vision)}</p>` : ''}
        ${u.mission ? `<h2>Mission</h2><p>${esc(u.mission)}</p>` : ''}

        ${facts.length ? `<h2>Key Information</h2>${list(facts, ([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`)}` : ''}

        ${courses.length
          ? `<h2>Courses Offered at ${esc(u.name)}</h2>${list(courses, (c) =>
              `<li>${esc(c.name)}${c.duration ? ` — ${esc(c.duration)}` : ''}${
                c.feesPerYear ? ` — ₹${esc(c.feesPerYear)} per year` : ''
              }${c.eligibility ? ` — Eligibility: ${esc(c.eligibility)}` : ''}</li>`
            )}`
          : ''}

        ${Array.isArray(u.facilities) && u.facilities.length
          ? `<h2>Campus Facilities</h2>${list(u.facilities, (f) => `<li>${esc(f)}</li>`)}`
          : ''}

        ${Array.isArray(u.topRecruiters) && u.topRecruiters.length
          ? `<h2>Top Recruiters</h2>${list(u.topRecruiters, (r) => `<li>${esc(r)}</li>`)}`
          : ''}

        ${Array.isArray(u.scholarships) && u.scholarships.length
          ? `<h2>Scholarships</h2>${list(u.scholarships, (s) =>
              `<li>${esc(s.name)}${s.amount ? ` — ${esc(s.amount)}` : ''}${
                s.eligibility ? ` — ${esc(s.eligibility)}` : ''
              }</li>`
            )}`
          : ''}

        <p><a href="${SITE_URL}/universities">Browse all universities</a></p>
      </main>`;
}

/**
 * Places prerendered markup inside #root.
 *
 * Matches the empty div specifically. If the template ever ships with content
 * already in there the replace simply does not fire, rather than corrupting it.
 */
export function injectBody(template, bodyHtml) {
  if (!bodyHtml) return template;
  return template.replace('<div id="root"></div>', `<div id="root">${bodyHtml}\n    </div>`);
}

// Swap the marked SEO block in the template; fall back to inserting before </head>.
export function injectSeo(template, block) {
  const wrapped = `<!--SEO-START-->\n    ${block}\n    <!--SEO-END-->`;
  if (/<!--SEO-START-->[\s\S]*?<!--SEO-END-->/.test(template)) {
    return template.replace(/<!--SEO-START-->[\s\S]*?<!--SEO-END-->/, wrapped);
  }
  return template.replace('</head>', `    ${block}\n  </head>`);
}

function notFoundBlock(slug) {
  return metaBlock({
    title: `University Not Found | ${SITE_NAME}`,
    description: "The university you're looking for doesn't exist or may have been removed.",
    canonical: `${SITE_URL}/universities/${slug}`,
    image: DEFAULT_OG_IMAGE,
    noindex: true,
  });
}

/**
 * Server-render a university detail page's <head> and resolve the HTTP status.
 * Returns { status, html }. On any backend problem it degrades to the SPA shell
 * (200) so a crawler never sees a hard error for a transient issue.
 */
export async function renderUniversity(slug, template, fetchImpl = fetch) {
  if (slug.startsWith('in-')) {
    const stateName = slug
      .replace(/^in-/, '')
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const title = `Top Private Universities in ${stateName} (2026) | Fees, Ranking & Admissions | ${SITE_NAME}`;
    const description = `Explore top private and deemed universities in ${stateName}. Compare courses, fees, NAAC grades, NIRF rankings, placements and admission guidelines.`;
    const canonical = `${SITE_URL}/universities/${slug}`;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: `Private Universities in ${stateName}`,
          url: canonical,
          description,
          publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Universities', item: `${SITE_URL}/universities` },
            { '@type': 'ListItem', position: 3, name: stateName, item: canonical }
          ]
        }
      ]
    };
    const block = metaBlock({ title, description, canonical, image: DEFAULT_OG_IMAGE, noindex: false, jsonLd });
    return { status: 200, html: injectSeo(template, block) };
  }

  if (slug.startsWith('naac-')) {
    const naacMap = {
      'naac-a-plus-plus': 'A++',
      'naac-a-plus': 'A+',
      'naac-a': 'A',
      'naac-b-plus-plus': 'B++',
      'naac-b': 'B'
    };
    const grade = naacMap[slug] || 'A+';
    const title = `NAAC Grade ${grade} Universities in India (2026) | Fees & Ranks | ${SITE_NAME}`;
    const description = `List of NAAC Grade ${grade} private & deemed universities in India. Compare NIRF ranks, courses, fees and placement details.`;
    const canonical = `${SITE_URL}/universities/${slug}`;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: `NAAC Grade ${grade} Universities in India`,
          url: canonical,
          description,
          publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Universities', item: `${SITE_URL}/universities` },
            { '@type': 'ListItem', position: 3, name: `NAAC ${grade}`, item: canonical }
          ]
        }
      ]
    };
    const block = metaBlock({ title, description, canonical, image: DEFAULT_OG_IMAGE, noindex: false, jsonLd });
    return { status: 200, html: injectSeo(template, block) };
  }

  /**
   * Bounded, because the backend can be asleep.
   *
   * This fetch had no timeout, so a cold free-tier host — which takes tens of
   * seconds to wake — held the serverless function until the platform killed it.
   * The crawler then got nothing at all rather than the shell, and the attempt
   * counted against crawl budget for no page.
   *
   * Six seconds is longer than a warm response by a wide margin and shorter than
   * any function limit, so a sleeping backend costs one slow-but-successful
   * request instead of a hang.
   */
  let res;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    res = await fetchImpl(`${API_BASE}/universities/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    });
  } catch {
    return { status: 200, html: template };
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 404) {
    return { status: 404, html: injectSeo(template, notFoundBlock(slug)) };
  }
  if (!res.ok) {
    return { status: 200, html: template };
  }

  let data;
  try {
    data = (await res.json()).data;
  } catch {
    return { status: 200, html: template };
  }
  if (!data) {
    return { status: 404, html: injectSeo(template, notFoundBlock(slug)) };
  }

  const s = buildUniversitySeo(data);
  const block = metaBlock({ ...s, jsonLd: s.noindex ? null : universityJsonLd(data) });

  // Head first, then the body content — a crawler that only reads the markup
  // now gets the whole page, not just its title.
  const withHead = injectSeo(template, block);
  return { status: 200, html: injectBody(withHead, renderUniversityBody(data)) };
}

