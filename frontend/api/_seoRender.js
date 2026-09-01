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

        <p>${
          u.state
            ? `<a href="${SITE_URL}/universities/in-${stateSlug(u.state)}">More private universities in ${esc(
                u.state
              )}</a> · `
            : ''
        }<a href="${SITE_URL}/universities">Browse all universities</a></p>
      </main>`;
}

/**
 * The universities index, as crawlable HTML with real links.
 *
 * This is the piece that makes the detail pages reachable. Search Console
 * reports each of the 747 university URLs as "Discovered – currently not
 * indexed" with "Last crawl: N/A" and "Referring page: None detected" — Google
 * knows they exist, from the sitemap, and has never fetched one.
 *
 * A sitemap is a hint. Internal links are the signal that decides crawl
 * priority, and this site had none a crawler could see: /universities renders
 * its list in JavaScript, so the HTML Googlebot receives contains zero <a href>
 * pointing at a university. Prerendering the detail pages fixed what a crawler
 * reads once it arrives; this fixes whether it ever arrives.
 *
 * Links are plain <a href> on purpose — the whole point is that they exist
 * without executing anything.
 *
 * The shape is a directory, not one flat page: the index links to every state
 * page, and each state page links to its universities. That is partly for
 * crawlers — a link two hops from the index carries more weight than one of 706
 * on a single page — and partly forced, because the public list API caps `limit`
 * at 50, so a flat page would cost fifteen backend round-trips on a host that
 * sleeps. Split by state, no page needs more than a handful.
 */

/** The public list endpoint clamps `limit` to 50, whatever we ask for. */
const PAGE_SIZE = 50;

/**
 * Fetch with retry for cold-start resilience.
 *
 * Render free-tier sleeps after ~15 min idle. A cold start can take 30-60s.
 * The first request wakes the instance; a retry 3s later usually succeeds.
 */
async function fetchWithRetry(fetchImpl, url, opts = {}, retries = 2, delayMs = 3000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, opts);
      if (res.ok || attempt === retries) return res;
      // Retry on server errors (5xx) — likely cold start in progress
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
}

/**
 * Reads a list endpoint across its pages.
 *
 * Page one is fetched first because it reports the page count; the rest go out
 * together, so total latency is two round-trips rather than N. `maxPages` is a
 * ceiling, not an expectation — it exists so an unexpectedly large result set
 * cannot stall the function.
 */
async function fetchUniversityPages(fetchImpl, query, maxPages, signal) {
  const url = (page) => `${API_BASE}/universities?limit=${PAGE_SIZE}&page=${page}${query}`;

  const readPage = async (page) => {
    const res = await fetchWithRetry(fetchImpl, url(page), { signal });
    if (!res.ok) return { data: [], pages: 0 };
    const json = await res.json();
    return { data: Array.isArray(json.data) ? json.data : [], pages: Number(json.pages) || 0 };
  };

  const first = await readPage(1);
  const wanted = Math.min(first.pages, maxPages);
  if (wanted <= 1) return { universities: first.data, total: first.data.length, truncated: first.pages > 1 };

  const rest = await Promise.all(
    Array.from({ length: wanted - 1 }, (_, i) => readPage(i + 2).catch(() => ({ data: [] })))
  );

  return {
    universities: [...first.data, ...rest.flatMap((r) => r.data)],
    truncated: first.pages > maxPages,
  };
}

/**
 * Matches the /universities/in-<state> route, and round-trips back to a name.
 * Kept identical to stateSlug in backend/src/controllers/sitemapController.js,
 * which builds the same URLs for the sitemap — the two must agree exactly or the
 * sitemap points at pages this file cannot resolve.
 */
const stateSlug = (state) =>
  String(state || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** One <li> per university — name, city and NAAC grade, all of them search terms. */
const universityItems = (list) =>
  list
    .filter((u) => u?.slug && u?.name)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (u) =>
        `<li><a href="${SITE_URL}/universities/${esc(u.slug)}">${esc(u.name)}</a>${
          u.city ? ` — ${esc(u.city)}` : ''
        }${u.naacGrade ? ` — NAAC ${esc(u.naacGrade)}` : ''}</li>`
    )
    .join('');

export async function renderUniversityList(template, fetchImpl = fetch) {
  const title = `Private & Deemed Universities in India (2026) — Fees, Rankings & Admissions | ${SITE_NAME}`;
  const description =
    'Browse 700+ private, deemed and international universities in India. Compare courses, fees, NAAC grades, NIRF rankings, placements and admissions.';
  const canonical = `${SITE_URL}/universities`;

  let universities = [];
  let stateCounts = {};
  let offshore = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    // State counts drive the directory; two pages of universities give the index
    // itself something to rank on rather than making it a pure hub of hubs.
    const [countsRes, listed, foreign, twinning] = await Promise.all([
      fetchWithRetry(fetchImpl, `${API_BASE}/universities/state-counts`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetchUniversityPages(fetchImpl, '', 2, controller.signal).catch(() => ({ universities: [] })),
      /**
       * Foreign and twinning universities are the reason this is not just the
       * state directory. They carry no Indian state, so `state-counts` omits
       * them and no state page can reach them — 50 of the 747 sitemap URLs had
       * no inbound link at all until they were listed here.
       */
      fetchUniversityPages(fetchImpl, '&type=foreign', 2, controller.signal).catch(() => ({ universities: [] })),
      fetchUniversityPages(fetchImpl, '&type=twinning', 2, controller.signal).catch(() => ({ universities: [] })),
    ]);
    stateCounts = countsRes?.data && typeof countsRes.data === 'object' ? countsRes.data : {};
    universities = listed.universities;
    offshore = [
      ['International & Foreign Universities', foreign.universities],
      ['Twinning & Study-Abroad Programmes', twinning.universities],
    ];
  } catch {
    // Fall through to a meta-only page rather than failing the route.
  } finally {
    clearTimeout(timeout);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Private & Deemed Universities in India',
        url: canonical,
        description,
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Universities', item: canonical },
        ],
      },
    ],
  };

  const block = metaBlock({ title, description, canonical, image: DEFAULT_OG_IMAGE, noindex: false, jsonLd });
  const withHead = injectSeo(template, block);

  const states = Object.entries(stateCounts)
    .filter(([name, count]) => name && count > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  if (!states.length && !universities.length) return { status: 200, html: withHead, degraded: true };

  const total = states.reduce((sum, [, count]) => sum + count, 0);

  const directory = states.length
    ? `<h2>Universities by state</h2><ul>${states
        .map(
          ([name, count]) =>
            `<li><a href="${SITE_URL}/universities/in-${stateSlug(name)}">Private universities in ${esc(
              name
            )}</a> (${count})</li>`
        )
        .join('')}</ul>`
    : '';

  const featured = universities.length
    ? `<h2>Universities A–Z</h2><ul>${universityItems(universities)}</ul>`
    : '';

  const international = offshore
    .filter(([, list]) => list.length)
    .map(([heading, list]) => `<h2>${heading}</h2><ul>${universityItems(list)}</ul>`)
    .join('');

  const body = `
      <main>
        <h1>Private &amp; Deemed Universities in India</h1>
        <p>${esc(description)}</p>
        ${total ? `<p>${total} universities listed across ${states.length} states.</p>` : ''}
        ${directory}
        ${international}
        ${featured}
      </main>`;

  return { status: 200, html: injectBody(withHead, body) };
}

/**
 * The state page: name as stored, plus its universities.
 *
 * The name has to come back from the database rather than from the slug. The
 * list API filters state by exact match, and title-casing every word of
 * "andaman-and-nicobar-islands" yields "Andaman And Nicobar Islands", which
 * matches nothing — that page came back empty. Resolving through the counts
 * endpoint also means the heading reads the way the data does.
 */
async function renderStatePage(slug, fallbackName, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const countsRes = await fetchWithRetry(fetchImpl, `${API_BASE}/universities/state-counts`, { signal: controller.signal });
    const counts = countsRes.ok ? await countsRes.json().catch(() => null) : null;

    const stateName =
      Object.keys(counts?.data || {}).find((name) => stateSlug(name) === slug) || fallbackName;

    // Four pages covers the largest state in the catalogue with room to spare.
    const { universities, truncated } = await fetchUniversityPages(
      fetchImpl,
      `&state=${encodeURIComponent(stateName)}`,
      4,
      controller.signal
    );
    if (!universities.length) return { stateName, body: '' };

    const body = `
      <main>
        <h1>Private Universities in ${esc(stateName)}</h1>
        <p>${universities.length}${truncated ? '+' : ''} private and deemed universities in ${esc(
          stateName
        )}, with courses, fees, NAAC grades and admission details.</p>
        <ul>${universityItems(universities)}</ul>
        <p><a href="${SITE_URL}/universities">Browse universities in every state</a></p>
      </main>`;

    return { stateName, body };
  } catch {
    return { stateName: fallbackName, body: '' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Places prerendered markup inside #root.
 *
 * Matches the empty div specifically. If the template ever ships with content
 * already in there the replace simply does not fire, rather than corrupting it.
 */
export function injectBody(template, bodyHtml) {
  if (!bodyHtml) return template;
  if (/<div id="root">[\s\S]*?<\/div>/.test(template)) {
    return template.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${bodyHtml}\n    </div>`);
  }
  return template.replace('</body>', `${bodyHtml}\n</body>`);
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
    const bare = slug.replace(/^in-/, '');
    const guessed = bare
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Resolved first: the title and the list must name the state identically.
    const { stateName, body } = await renderStatePage(bare, guessed, fetchImpl);

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
    const withHead = injectSeo(template, block);
    // No body means the backend did not answer in time — see `degraded` in render.js.
    return { status: 200, html: body ? injectBody(withHead, body) : withHead, degraded: !body };
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
   * Render free-tier cold starts can take 30-60s. The first request wakes the
   * instance; a retry 3s later usually succeeds. We use 20s per attempt (enough
   * for a warm response) with 1 retry, totaling ~25s worst case — well under
   * Vercel's 10s function limit on Pro but safe for Hobby with streaming.
   */
  const buildFallbackMeta = (slugStr) => {
    const readable = slugStr
      .replace(/^in-/, '')
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const title = slugStr.startsWith('in-')
      ? `Top Private Universities in ${readable} (2026) | Vidyarthi Mitra`
      : `${readable} — Courses, Fees & Admissions | Vidyarthi Mitra`;
    const description = `Explore ${readable}: courses, fees, NAAC grades, rankings and admission details on Vidyarthi Mitra.`;
    return metaBlock({
      title,
      description,
      canonical: `${SITE_URL}/universities/${slugStr}`,
      image: DEFAULT_OG_IMAGE,
      noindex: false,
    });
  };

  let res;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    res = await fetchWithRetry(fetchImpl, `${API_BASE}/universities/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    }, 1, 3000);
  } catch {
    return { status: 200, html: injectSeo(template, buildFallbackMeta(slug)), degraded: true };
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 404) {
    return { status: 404, html: injectSeo(template, notFoundBlock(slug)) };
  }
  if (!res.ok) {
    return { status: 200, html: injectSeo(template, buildFallbackMeta(slug)), degraded: true };
  }

  let data;
  try {
    data = (await res.json()).data;
  } catch {
    return { status: 200, html: injectSeo(template, buildFallbackMeta(slug)), degraded: true };
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

