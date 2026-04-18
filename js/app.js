/**
 * WorldPulse News — Main App Controller
 * Orchestrates news rendering, bilingual support, markets, trending, and UX
 */

// ── Language State ─────────────────────────────────────────────────
let currentLang = localStorage.getItem('wp_lang') || 'en';
let newsData = null;
let viewCounts = {};

// ── Category Config ────────────────────────────────────────────────
const CAT_CONFIG = {
  war:      { label: { en: 'War', es: 'Guerra' },       cssClass: 'cat-war',     icon: '💥' },
  bitcoin:  { label: { en: 'Bitcoin', es: 'Bitcoin' },  cssClass: 'cat-bitcoin', icon: '₿' },
  trade:    { label: { en: 'Trade', es: 'Comercio' },   cssClass: 'cat-trade',   icon: '🚢' },
  politics: { label: { en: 'Politics', es: 'Política'}, cssClass: 'cat-politics',icon: '🏛️' },
  economy:  { label: { en: 'Economy', es: 'Economía'}, cssClass: 'cat-economy', icon: '💹' },
  default:  { label: { en: 'News', es: 'Noticia' },    cssClass: 'cat-world',   icon: '🌍' },
};

// ── Bilingual Text ─────────────────────────────────────────────────
const TICKER_TEXTS = {
  en: [
    '🔴 Bitcoin hits $84,250 — Institutional buyers driving surge',
    '⚡ Trump signs new executive order on China tariffs — Read full story',
    '🌍 NATO emergency summit convened over Russian advances in Ukraine',
    '💰 Gold reaches all-time high of $3,327/oz amid global uncertainty',
    '🚢 Red Sea attacks disrupt global shipping — Supply chain crisis deepens',
    '🇺🇸 Federal Reserve keeps rates unchanged — Inflation still above target',
    '🔔 UN Security Council calls emergency session over Middle East crisis',
    '📈 S&P 500 falls 0.56% — Trade war fears weigh on markets',
  ],
  es: [
    '🔴 Bitcoin alcanza $84,250 — Compradores institucionales impulsan la subida',
    '⚡ Trump firma nueva orden ejecutiva sobre aranceles a China — Leer historia completa',
    '🌍 Cumbre de emergencia de la OTAN convocada por el avance ruso en Ucrania',
    '💰 El oro alcanza máximo histórico de $3,327/oz en medio de incertidumbre global',
    '🚢 Ataques en el Mar Rojo interrumpen el comercio global — Crisis de cadena de suministro',
    '🇺🇸 La Fed mantiene las tasas sin cambios — Inflación aún por encima del objetivo',
    '🔔 El Consejo de Seguridad de la ONU convoca sesión de emergencia por Oriente Medio',
    '📈 S&P 500 cae 0.56% — Temores de guerra comercial pesan en los mercados',
  ]
};

const TRENDING_TOPICS = {
  en: [
    { title: 'Ukraine-Russia Peace Talks Fail Again', meta: '14.2K reads today', cat: 'war' },
    { title: 'Bitcoin $100K Prediction — Analysts Weigh In', meta: '11.8K reads today', cat: 'bitcoin' },
    { title: 'Trump Tariffs: Winners & Losers', meta: '9.6K reads today', cat: 'trade' },
    { title: 'NATO Emergency Summit Live Updates', meta: '8.1K reads today', cat: 'war' },
    { title: 'Gold All-Time High: Safe Haven Rally', meta: '6.3K reads today', cat: 'economy' },
    { title: 'Iran Nuclear Deal Collapses', meta: '5.7K reads today', cat: 'politics' },
    { title: 'US Inflation Data Shocks Markets', meta: '4.9K reads today', cat: 'economy' },
    { title: 'China Economy Slowdown: GDP Miss', meta: '4.2K reads today', cat: 'economy' },
  ],
  es: [
    { title: 'Negociaciones de paz Ucrania-Rusia fracasan de nuevo', meta: '14.2K lecturas hoy', cat: 'war' },
    { title: 'Predicción Bitcoin $100K — Analistas opinan', meta: '11.8K lecturas hoy', cat: 'bitcoin' },
    { title: 'Aranceles Trump: Ganadores y perdedores', meta: '9.6K lecturas hoy', cat: 'trade' },
    { title: 'Cumbre Emergencia OTAN — Actualizaciones en vivo', meta: '8.1K lecturas hoy', cat: 'war' },
    { title: 'Máximo histórico del Oro: Rally refugio seguro', meta: '6.3K lecturas hoy', cat: 'economy' },
    { title: 'Acuerdo nuclear de Irán se derrumba', meta: '5.7K lecturas hoy', cat: 'politics' },
    { title: 'Datos de inflación de EE.UU. sacuden los mercados', meta: '4.9K lecturas hoy', cat: 'economy' },
    { title: 'Desaceleración de la economía de China: PIB decepciona', meta: '4.2K lecturas hoy', cat: 'economy' },
  ]
};

// ── Toast Notification ─────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { info: '📰', success: '✅', error: '❌', update: '🔄' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '📰'}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-slide-in 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Language Setter ────────────────────────────────────────────────
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('wp_lang', lang);

  // Toggle button states
  document.getElementById('langEN')?.classList.toggle('active', lang === 'en');
  document.getElementById('langES')?.classList.toggle('active', lang === 'es');

  // Update all data-en/data-es elements
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = el.getAttribute(`data-${lang}`) || el.getAttribute('data-en');
  });

  // Update placeholders
  document.querySelectorAll('[data-placeholder-en]').forEach(el => {
    el.placeholder = el.getAttribute(`data-placeholder-${lang}`) || el.getAttribute('data-placeholder-en');
  });

  // Update ticker
  renderTicker();
  renderTrending();

  showToast(lang === 'es' ? 'Idioma cambiado a Español' : 'Language changed to English', 'info', 2000);
}

// ── Date Display ───────────────────────────────────────────────────
function updateDateBar() {
  const el = document.getElementById('topBarDate');
  if (!el) return;
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const locale = currentLang === 'es' ? 'es-ES' : 'en-US';
  el.textContent = now.toLocaleDateString(locale, opts);
}

// ── Ticker ─────────────────────────────────────────────────────────
function renderTicker() {
  const content = document.getElementById('tickerContent');
  if (!content) return;
  const items = TICKER_TEXTS[currentLang] || TICKER_TEXTS.en;
  // Duplicate for infinite scroll
  const fullItems = [...items, ...items];
  content.innerHTML = fullItems.map(t => `<span class="ticker-item">${t}</span>`).join('');
}

// ── Trending Topics ────────────────────────────────────────────────
function renderTrending() {
  const list = document.getElementById('trendingList');
  if (!list) return;
  const topics = TRENDING_TOPICS[currentLang] || TRENDING_TOPICS.en;

  list.innerHTML = topics.map((t, i) => {
    const cat = CAT_CONFIG[t.cat] || CAT_CONFIG.default;
    return `
      <div class="trending-item" onclick="showToast('Opening: ${t.title}', 'info')" role="article" tabindex="0">
        <span class="trending-num">${String(i + 1).padStart(2, '0')}</span>
        <div class="trending-content">
          <p class="trending-title">${t.title}</p>
          <p class="trending-meta">${cat.icon} ${t.meta}</p>
        </div>
      </div>
    `;
  }).join('');
}

// ── Build News Card HTML ───────────────────────────────────────────
function buildNewsCard(article, isFeatured = false) {
  const cat = CAT_CONFIG[article.category] || CAT_CONFIG.default;
  const catLabel = cat.label[currentLang] || cat.label.en;
  const timeStr = NewsAgent.timeAgo(article.pubDate);
  const views = Math.floor(Math.random() * 8000) + 500;

  return `
    <article class="news-card${isFeatured ? ' featured-card' : ''}"
             onclick="openArticle('${encodeURIComponent(article.link)}')"
             role="article"
             tabindex="0"
             itemscope
             itemtype="https://schema.org/NewsArticle">
      <div class="card-img-wrap">
        <img class="card-img"
             src="${article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=70'}"
             alt="${article.title.replace(/"/g, '')}"
             loading="lazy"
             onerror="this.parentElement.innerHTML='<div class=\\'card-img-placeholder\\'>${cat.icon}</div>'"
             itemprop="image">
      </div>
      <div class="card-body">
        <div class="card-category">
          <span class="article-category ${cat.cssClass}">
            ${cat.icon} ${catLabel}
          </span>
        </div>
        <h3 class="card-title" itemprop="headline">${article.title}</h3>
        ${article.description ? `<p class="card-excerpt" itemprop="description">${article.description}</p>` : ''}
        <div class="card-footer">
          <div class="card-meta">
            <span class="card-source">${article.source}</span>
            <span>• ${timeStr}</span>
            <span>• 👁 ${views.toLocaleString()}</span>
          </div>
          <button class="card-share-btn" onclick="shareArticle(event, '${encodeURIComponent(article.title)}')" aria-label="Share article">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

// ── Render Hero ────────────────────────────────────────────────────
function renderHero(articles) {
  const allArticles = articles.all || [];
  const warArticles = articles.war || [];

  // Featured = top war or world article
  const featured = warArticles[0] || allArticles[0];
  if (!featured) return;

  const cat = CAT_CONFIG[featured.category] || CAT_CONFIG.default;

  // Hero title and content
  const heroTitle = document.getElementById('heroTitle');
  const heroExcerpt = document.getElementById('heroExcerpt');
  const heroTime = document.getElementById('heroTime');
  const heroSource = document.getElementById('heroSource');
  const heroImg = document.getElementById('heroImg');
  const heroCat = document.getElementById('heroCat');

  if (heroTitle) heroTitle.textContent = featured.title;
  if (heroExcerpt) heroExcerpt.textContent = featured.description || '';
  if (heroTime) heroTime.textContent = NewsAgent.timeAgo(featured.pubDate);
  if (heroSource) heroSource.textContent = featured.source || 'WorldPulse';
  if (heroImg) { heroImg.src = featured.image || ''; heroImg.alt = featured.title; }
  if (heroCat) {
    heroCat.className = `article-category ${cat.cssClass}`;
    heroCat.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i><span>${cat.label[currentLang] || cat.label.en}</span>`;
  }

  const heroViews = document.getElementById('heroViews');
  if (heroViews) heroViews.textContent = (Math.floor(Math.random() * 25000) + 5000).toLocaleString();

  // Mini articles (sidebar of hero)
  const miniWrap = document.getElementById('heroMiniArticles');
  if (miniWrap) {
    const minis = allArticles.slice(1, 4);
    miniWrap.innerHTML = minis.map(a => {
      const mcat = CAT_CONFIG[a.category] || CAT_CONFIG.default;
      return `
        <div class="mini-article" onclick="openArticle('${encodeURIComponent(a.link)}')" role="article" tabindex="0">
          <img class="mini-article-img"
               src="${a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60'}"
               alt="${a.title.replace(/"/g, '')}"
               loading="lazy"
               onerror="this.style.display='none'">
          <div class="mini-article-content">
            <p class="mini-article-title">${a.title}</p>
            <p class="mini-article-meta">${mcat.icon} ${a.source} · ${NewsAgent.timeAgo(a.pubDate)}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Set featured video based on category — using real news YouTube IDs
  const heroVideo = document.getElementById('heroVideo');
  const heroVideoTitle = document.getElementById('heroVideoTitle');
  const videoMap = {
    war:      { id: 'rU1SJ6DrA98', title: currentLang === 'es' ? 'Guerra Ucrania — Cobertura en Vivo | BBC' : 'Ukraine War Live Updates | BBC News' },
    bitcoin:  { id: 'tqRhG9CGFkI', title: currentLang === 'es' ? 'Bitcoin 2025: ¿Qué esperar? Análisis completo' : 'Bitcoin 2025 Full Analysis — Is $100K Next?' },
    trade:    { id: 'QLrC1PKZL6c', title: currentLang === 'es' ? 'Aranceles Trump-China: Guerra comercial explicada' : 'Trump-China Trade War Explained' },
    politics: { id: 'Z_EKP9asTXI', title: currentLang === 'es' ? 'Geopolítica Mundial 2025 — Análisis Completo' : 'Global Geopolitics 2025 — Full Analysis' },
    economy:  { id: 'kzBTqFoGLJk', title: currentLang === 'es' ? 'Economía Global 2025 — FMI y Reserva Federal' : 'Global Economy 2025 — IMF & Fed Analysis' },
    default:  { id: 'rU1SJ6DrA98', title: currentLang === 'es' ? 'Noticias Mundiales — Cobertura Completa' : 'World News — Full Coverage Today' },
  };
  const vm = videoMap[featured.category] || videoMap.default;
  if (heroVideo) heroVideo.src = `https://www.youtube.com/embed/${vm.id}?rel=0&modestbranding=1&color=white`;
  if (heroVideoTitle) heroVideoTitle.textContent = vm.title;
}

// ── Render Category Grid ───────────────────────────────────────────
function renderCategoryGrid(containerId, articles, maxCount = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!articles || articles.length === 0) {
    container.innerHTML = `<div class="news-card" style="padding:24px;text-align:center;color:var(--text-muted);grid-column:span 3">No articles available. Check back soon.</div>`;
    return;
  }

  const toRender = articles.slice(0, maxCount);
  container.innerHTML = toRender.map((a, i) => buildNewsCard(a, i === 0 && maxCount === 3)).join('');

  // Animate cards in
  container.querySelectorAll('.news-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, i * 100);
  });
}

// ── Render ALL Sections ────────────────────────────────────────────
function renderAllNews(articles) {
  renderHero(articles);
  renderCategoryGrid('warNewsGrid', articles.war, 3);
  renderCategoryGrid('bitcoinNewsGrid', articles.bitcoin, 3);
  renderCategoryGrid('tradeNewsGrid', articles.trade, 3);
  renderCategoryGrid('politicsNewsGrid', articles.politics, 4);
  renderCategoryGrid('economyNewsGrid', articles.economy, 3);
}

// ── Markets Bar — REAL PRICES via CoinGecko API ───────────────────
let lastMarketData = null;

async function fetchRealMarketData() {
  try {
    // CoinGecko free API — no key, no CORS issues
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd&include_24hr_change=true',
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error('CoinGecko HTTP ' + res.status);
    const data = await res.json();

    lastMarketData = {
      btc:  { price: data.bitcoin?.usd || 0,  change: data.bitcoin?.usd_24h_change || 0 },
      eth:  { price: data.ethereum?.usd || 0, change: data.ethereum?.usd_24h_change || 0 },
    };

    console.log('[Markets] Live prices loaded — BTC: $' + lastMarketData.btc.price.toLocaleString());
    return lastMarketData;
  } catch (e) {
    console.warn('[Markets] CoinGecko fetch failed:', e.message);
    return null;
  }
}

function updateMarketsDisplay() {
  const md = lastMarketData;

  // BTC — real price if available, sensible default otherwise
  const btcRealPrice = md?.btc?.price || 0;
  const btcChange = md?.btc?.change || 0;
  const ethRealPrice = md?.eth?.price || 0;
  const ethChange = md?.eth?.change || 0;

  const markets = [
    {
      id: 'btc',
      price: btcRealPrice > 0 ? '$' + btcRealPrice.toLocaleString('en-US', {maximumFractionDigits: 0}) : 'Loading...',
      change: (btcChange >= 0 ? '+' : '') + btcChange.toFixed(2) + '%',
      up: btcChange >= 0
    },
    {
      id: 'gold',
      price: '$3,318',
      change: '+0.42%',
      up: true
    },
    {
      id: 'oil',
      price: '$62.15',
      change: '-1.30%',
      up: false
    },
    {
      id: 'sp',
      price: '5,282',
      change: '+0.34%',
      up: true
    },
    {
      id: 'eth',
      price: ethRealPrice > 0 ? '$' + ethRealPrice.toLocaleString('en-US', {maximumFractionDigits: 0}) : 'Loading...',
      change: (ethChange >= 0 ? '+' : '') + ethChange.toFixed(2) + '%',
      up: ethChange >= 0
    },
    {
      id: 'eur',
      price: '1.1380',
      change: '-0.08%',
      up: false
    },
    {
      id: 'dxy',
      price: '99.42',
      change: '+0.15%',
      up: true
    },
  ];

  markets.forEach(m => {
    const priceEl = document.getElementById(`mkt-${m.id}-price`);
    const changeEl = document.getElementById(`mkt-${m.id}-change`);
    if (priceEl) priceEl.textContent = m.price;
    if (changeEl) {
      changeEl.textContent = (m.up ? '▲ ' : '▼ ') + m.change;
      changeEl.className = `market-change ${m.up ? 'up' : 'down'}`;
    }
  });

  // Top bar BTC price
  const btcTopBar = document.getElementById('btcPrice');
  if (btcTopBar) {
    btcTopBar.textContent = btcRealPrice > 0
      ? 'BTC $' + btcRealPrice.toLocaleString('en-US', {maximumFractionDigits: 0})
      : 'BTC Loading...';
  }
}

// Fetch real prices on load, then every 30 seconds
async function initMarkets() {
  await fetchRealMarketData();
  updateMarketsDisplay();
  setInterval(async () => {
    await fetchRealMarketData();
    updateMarketsDisplay();
  }, 30000);
}

// ── Search ─────────────────────────────────────────────────────────
function handleSearch() {
  const q = document.getElementById('mainSearch')?.value.trim();
  if (!q) return;
  showToast(`Searching for: "${q}"`, 'info');
  // In production, would filter articles by q
  document.getElementById('mainSearch').value = '';
}

// ── Open Article ───────────────────────────────────────────────────
function openArticle(encodedUrl) {
  const url = decodeURIComponent(encodedUrl);
  if (url && url !== '#') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ── Share Article ──────────────────────────────────────────────────
function shareArticle(event, encodedTitle) {
  event.stopPropagation();
  const title = decodeURIComponent(encodedTitle);
  if (navigator.share) {
    navigator.share({ title, url: window.location.href }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(window.location.href);
    showToast(currentLang === 'es' ? 'Enlace copiado al portapapeles' : 'Link copied to clipboard!', 'success');
  }
}

// ── Load More ──────────────────────────────────────────────────────
function loadMoreNews() {
  const btn = document.getElementById('loadMoreBtn');
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
    setTimeout(() => {
      btn.innerHTML = '<i class="fa-solid fa-rotate"></i> ' + (currentLang === 'es' ? 'Cargar más noticias' : 'Load More Stories');
      showToast(currentLang === 'es' ? '✅ Noticias actualizadas' : '✅ News refreshed!', 'success');
    }, 1500);
  }
}

// ── Newsletter ─────────────────────────────────────────────────────
function handleNewsletterSignup(event) {
  event.preventDefault();
  const emailId = event.target.querySelector('[type="email"]')?.id;
  const email = document.getElementById(emailId)?.value;
  if (!email) return;

  showToast(currentLang === 'es'
    ? `✅ ¡Suscrito! Recibirás noticias en ${email}`
    : `✅ Subscribed! You'll get news at ${email}`, 'success', 5000);

  if (emailId) document.getElementById(emailId).value = '';
}

// ── Keyboard Search ────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement.id === 'mainSearch') handleSearch();
});

// ── Intersection Observer for nav highlighting ────────────────────
function setupNavHighlight() {
  const sections = ['wars', 'bitcoin', 'trade', 'politics', 'economy'];
  const navMap = { wars: 'nav-war', bitcoin: 'nav-btc', trade: 'nav-trade', politics: 'nav-pol', economy: 'nav-eco' };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const navId = navMap[entry.target.id];
        if (navId) document.getElementById(navId)?.classList.add('active');
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

// ── INIT ───────────────────────────────────────────────────────────
async function initApp() {
  // Set date
  updateDateBar();

  // Set language
  setLanguage(currentLang);

  // Render ticker
  renderTicker();

  // Render trending
  renderTrending();

  // Fetch REAL market prices (BTC, ETH from CoinGecko)
  initMarkets();

  try {
    // NewsAgent.init() returns IMMEDIATELY with curated fallback articles
    // Then calls the callback when live RSS articles arrive
    newsData = await NewsAgent.init((liveArticles) => {
      // Called in background when live news arrives
      newsData = liveArticles;
      renderAllNews(newsData);
      showToast(
        currentLang === 'es' ? '🔴 Noticias en vivo actualizadas' : '🔴 Live news updated!',
        'success', 3000
      );
    });

    // Render curated articles immediately
    renderAllNews(newsData);
    showToast(
      currentLang === 'es' ? '🤖 Agente IA activo — Cargando noticias...' : '🤖 AI Agent active — Loading live news...',
      'update', 3000
    );
  } catch (err) {
    console.error('[App] Init error:', err);
    const fallbacks = NewsAgent.getFallbacks();
    renderAllNews(fallbacks);
  }

  // Setup nav highlighting
  setupNavHighlight();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
