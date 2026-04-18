/**
 * WorldPulse News — Dynamic SEO Manager
 * Handles dynamic meta tags, structured data, and social sharing
 */

const SEOManager = (() => {

  const SITE = {
    name: 'WorldPulse News',
    url: 'https://worldpulsenew.com',
    logo: 'https://worldpulsenew.com/assets/logo.png',
    twitter: '@WorldPulseNews',
    description: 'AI-powered global news: wars, Bitcoin, tariffs, trade, and world politics. Updated daily.',
    keywords: [
      'world news', 'breaking news', 'ukraine war', 'russia war', 'israel gaza',
      'bitcoin price today', 'trump tariffs', 'china trade war', 'global economy',
      'nato news', 'cryptocurrency news', 'geopolitics', 'international news',
      'noticias del mundo', 'precio bitcoin hoy', 'guerra ucrania', 'aranceles trump'
    ].join(', '),
  };

  // ── Update page meta tags dynamically ───────────────────────────
  function updateMeta(key, val) {
    const selectors = [
      `meta[name="${key}"]`,
      `meta[property="${key}"]`,
      `meta[property="og:${key}"]`,
      `meta[name="twitter:${key}"]`,
    ];
    selectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.setAttribute('content', val);
    });
  }

  function setPageSEO({ title, description, image, url, type = 'article', keywords }) {
    // Title
    if (title) {
      document.title = `${title} | ${SITE.name}`;
      updateMeta('og:title', `${title} | ${SITE.name}`);
      updateMeta('twitter:title', `${title} | ${SITE.name}`);
    }

    // Description
    if (description) {
      const desc = description.substring(0, 155) + (description.length > 155 ? '...' : '');
      updateMeta('description', desc);
      updateMeta('og:description', desc);
      updateMeta('twitter:description', desc);
    }

    // Image
    if (image) {
      updateMeta('og:image', image);
      updateMeta('twitter:image', image);
    }

    // URL
    if (url) updateMeta('og:url', url);

    // Type
    updateMeta('og:type', type);

    // Keywords
    if (keywords) updateMeta('keywords', keywords);
  }

  // ── Add Article Schema.org markup ───────────────────────────────
  function addArticleSchema(article) {
    const existing = document.querySelector('#article-schema');
    if (existing) existing.remove();

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'headline': article.title,
      'description': article.description || '',
      'image': [article.image || SITE.logo],
      'datePublished': article.pubDate || new Date().toISOString(),
      'dateModified': new Date().toISOString(),
      'author': {
        '@type': 'Organization',
        'name': article.source || SITE.name,
      },
      'publisher': {
        '@type': 'Organization',
        'name': SITE.name,
        'logo': {
          '@type': 'ImageObject',
          'url': SITE.logo
        }
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': SITE.url
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'article-schema';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  // ── Add BreadcrumbList schema ────────────────────────────────────
  function addBreadcrumbSchema(crumbs) {
    const existing = document.querySelector('#breadcrumb-schema');
    if (existing) existing.remove();

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': crumbs.map((c, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'name': c.name,
        'item': c.url || SITE.url
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumb-schema';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  // ── Init: Set up home page SEO ───────────────────────────────────
  function init() {
    setPageSEO({
      title: 'Breaking Global News — Wars, Bitcoin, Trade & Politics',
      description: SITE.description,
      image: SITE.logo,
      url: SITE.url,
      type: 'website',
      keywords: SITE.keywords,
    });

    addBreadcrumbSchema([
      { name: 'Home', url: SITE.url }
    ]);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = SITE.url;

    // Add hreflang for bilingual
    addHreflang();

    console.log('[SEO] Meta tags initialized');
  }

  function addHreflang() {
    ['en', 'es'].forEach(lang => {
      const existing = document.querySelector(`link[hreflang="${lang}"]`);
      if (existing) return;
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = lang;
      link.href = `${SITE.url}?lang=${lang}`;
      document.head.appendChild(link);
    });
  }

  // Public
  return { init, setPageSEO, addArticleSchema, addBreadcrumbSchema, SITE };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', SEOManager.init);
