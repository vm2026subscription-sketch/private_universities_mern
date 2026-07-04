import { Helmet } from 'react-helmet-async';
import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE, absoluteUrl } from '../../utils/seo';

/**
 * Single source of truth for a page's <head> SEO tags.
 * Emits title, meta description, canonical, Open Graph, Twitter Card and robots.
 *
 * Props:
 *  - title        full <title> text (already includes the brand where wanted)
 *  - description  meta description
 *  - canonical    absolute URL or path; defaults to SITE_URL + pathname passed in `path`
 *  - path         pathname used to build canonical/og:url when `canonical` is omitted
 *  - image        og/twitter image (absolute URL or path)
 *  - type         og:type (default "website")
 *  - noindex      when true, emit "noindex, follow"
 *  - keywords     optional meta keywords
 *  - children     extra head tags (e.g. JSON-LD <script>) — used from Phase 3
 */
export default function Seo({
  title,
  description,
  canonical,
  path,
  image,
  type = 'website',
  noindex = false,
  keywords,
  jsonLd,
  children,
}) {
  const url = canonical ? absoluteUrl(canonical) : absoluteUrl(path || '/');
  const img = absoluteUrl(image || DEFAULT_OG_IMAGE);
  // Escape "<" so a description containing "</script>" can't break out of the tag.
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd).replace(/</g, '\\u003c') : null;

  return (
    <Helmet prioritizeSeoTags>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, follow' : 'index, follow'} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      {(title || description) && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={img} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={img} />

      {jsonLdText && <script type="application/ld+json">{jsonLdText}</script>}
      {children}
    </Helmet>
  );
}
