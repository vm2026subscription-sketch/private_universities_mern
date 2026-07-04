// Central SEO helpers. Keeps title/description/OG generation consistent across
// pages and mirrors the admin `seo` override fields (see University model).

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://privateuniversity.vidyarthimitra.org'
).replace(/\/$/, '');

export const SITE_NAME = 'Vidyarthi Mitra';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/logo.png`;

// Turn a path or partial URL into an absolute URL on the public origin.
export const absoluteUrl = (pathOrUrl = '/') => {
  if (!pathOrUrl) return SITE_URL;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
};

// Trim to a clean length on a word boundary for meta descriptions.
export const truncate = (text, max = 155) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

// Human label for a university's type/segment.
export const universityTypeLabel = (u = {}) => {
  const segment = u.segment || u.type;
  if (segment === 'twinning') return 'Twinning University';
  if (segment === 'foreign') return 'Foreign University';
  return (u.institutionKind || u.type) === 'deemed' ? 'Deemed University' : 'Private University';
};

// Build the effective SEO for a university detail page: admin override first,
// then a sensible auto-generated default. Mirrors backend intent so the same
// values can later be rendered server-side (Phase 4).
export const buildUniversitySeo = (u = {}) => {
  const seo = u.seo || {};
  const location = [u.city, u.state].filter(Boolean).join(', ');
  const typeLabel = universityTypeLabel(u);

  const title =
    seo.seoTitle ||
    `${u.name}${location ? ` — ${typeLabel} in ${location}` : ''} | ${SITE_NAME}`;

  const autoDescription =
    truncate(u.description) ||
    `Explore ${u.name}${location ? `, ${location}` : ''}: courses, fees, placements${
      u.naacGrade ? `, NAAC ${u.naacGrade}` : ''
    }${u.nirfRank ? `, NIRF rank ${u.nirfRank}` : ''} and admissions ${new Date().getFullYear()}.`;
  const description = seo.metaDescription || autoDescription;

  return {
    title,
    description,
    canonical: seo.canonicalUrl || absoluteUrl(`/universities/${u.slug}`),
    image: seo.ogImage || u.bannerImageUrl || u.logoUrl || DEFAULT_OG_IMAGE,
    ogTitle: seo.ogTitle || title,
    ogDescription: seo.ogDescription || description,
    type: 'website',
    noindex: seo.indexStatus === 'noindex',
  };
};

// Drop null/undefined/'' entries so JSON-LD stays clean (Google dislikes empties).
const compact = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));

// Structured data for a university detail page: CollegeOrUniversity + breadcrumb.
export const universityJsonLd = (u = {}) => {
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
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Universities', item: absoluteUrl('/universities') },
      { '@type': 'ListItem', position: 3, name: u.name, item: s.canonical },
    ],
  };

  return { '@context': 'https://schema.org', '@graph': [org, breadcrumb] };
};

// Site-wide structured data for the homepage: Organization + WebSite search box.
export const siteJsonLd = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', name: SITE_NAME, url: SITE_URL, logo: DEFAULT_OG_IMAGE },
    {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/universities?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
});
