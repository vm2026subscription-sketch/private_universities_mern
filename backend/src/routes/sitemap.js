const router = require('express').Router();
const {
  getSitemapIndex,
  getStaticSitemap,
  getUniversitiesSitemap,
} = require('../controllers/sitemapController');

// Served at the site root (proxied onto the Vercel domain via vercel.json) so
// crawlers see them at https://<site>/sitemap.xml — same host as the pages.
router.get('/sitemap.xml', getSitemapIndex);
router.get('/sitemap-static.xml', getStaticSitemap);
router.get('/sitemap-universities.xml', getUniversitiesSitemap);

module.exports = router;
