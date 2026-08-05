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

  let res;
  try {
    res = await fetchImpl(`${API_BASE}/universities/${encodeURIComponent(slug)}`);
  } catch {
    return { status: 200, html: template };
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
  return { status: 200, html: injectSeo(template, block) };
}

