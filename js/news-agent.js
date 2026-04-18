/**
 * WorldPulse News — AI News Agent v3.0
 * =====================================
 * 1) Shows curated fallback articles IMMEDIATELY
 * 2) Fetches REAL live news via local proxy → NewsAPI
 * 3) Classifies, deduplicates, and scores articles
 * 4) Auto-refreshes every 30 minutes
 * 5) Exposes full public API for portal + agent monitor
 */

const NewsAgent = (() => {

  // ── Config ──────────────────────────────────────────────────────
  const CONFIG = {
    CACHE_KEY: 'worldpulse_news_v3',
    CACHE_DURATION_MS: 30 * 60 * 1000,          // 30 min cache
    PROXY_BASE: '/.netlify/functions/news-proxy?endpoint=everything', // Netlify function
    PROXY_TOP: '/.netlify/functions/news-proxy?endpoint=top-headlines', // Netlify function
    MAX_PER_CATEGORY: 8,
    UPDATE_INTERVAL_MS: 30 * 60 * 1000,          // Re-fetch every 30 min
  };

  // ── Queries per category (sent to NewsAPI via proxy) ────────────
  const CATEGORY_QUERIES = {
    war:      'war OR conflict OR ukraine OR gaza OR ceasefire OR military OR airstrike OR Israel OR Russia',
    bitcoin:  'bitcoin OR cryptocurrency OR ethereum OR crypto OR blockchain OR BTC',
    trade:    'tariffs OR trade war OR imports OR sanctions OR supply chain OR exports',
    politics: 'politics OR Trump OR White House OR congress OR diplomacy OR election OR NATO',
    economy:  'economy OR inflation OR recession OR GDP OR interest rate OR oil prices OR stock market OR Federal Reserve',
  };

  // ── Category Keywords for secondary scoring ─────────────────────
  const KEYWORDS = {
    war: ['war','military','attack','troops','bomb','missile','ukraine','russia','conflict',
          'nato','drone','invasion','ceasefire','battle','casualties','israel','gaza','hamas',
          'putin','zelensky','airstrike','frontline','offensive','siege','iran','hezbollah',
          'lebanon','hormuz','torpedo','navy','pentagon'],
    bitcoin: ['bitcoin','btc','crypto','cryptocurrency','ethereum','blockchain','coinbase',
              'binance','defi','nft','digital currency','altcoin','halving','web3','solana',
              'mining','stablecoin','tether','etf','ripple','dogecoin'],
    trade: ['tariff','trade','import','export','sanction','customs','duty','supply chain',
            'wto','protectionism','free trade','chinese goods','shipping','container',
            'port','cargo','oil price','commodities','opec'],
    politics: ['trump','president','congress','senate','election','white house','executive order',
               'g7','g20','united nations','un security','legislation','parliament','pm',
               'diplomacy','ambassador','summit','veto','bipartisan','democrat','republican'],
    economy: ['economy','inflation','gdp','recession','interest rate','federal reserve','stocks',
              'wall street','dollar','oil price','unemployment','growth','debt','bonds','imf',
              'world bank','nasdaq','dow jones','s&p','fiscal','monetary','stimulus'],
  };

  // ── Curated images per Category ─────────────────────────────────
  const CATEGORY_IMAGES = {
    war: [
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=700&q=75',
      'https://images.unsplash.com/photo-1601581987809-a874a81309c9?w=700&q=75',
      'https://images.unsplash.com/photo-1580932077311-4bf34af6ab4a?w=700&q=75',
      'https://images.unsplash.com/photo-1504191904879-f04068a2c073?w=700&q=75',
    ],
    bitcoin: [
      'https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=700&q=75',
      'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=700&q=75',
      'https://images.unsplash.com/photo-1621152788932-f7a31cc5a0fb?w=700&q=75',
      'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=700&q=75',
    ],
    trade: [
      'https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?w=700&q=75',
      'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=700&q=75',
      'https://images.unsplash.com/photo-1586473219010-2ffc57b0d282?w=700&q=75',
      'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=700&q=75',
    ],
    politics: [
      'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=700&q=75',
      'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=700&q=75',
      'https://images.unsplash.com/photo-1568745216882-e7e0e5e13855?w=700&q=75',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=700&q=75',
    ],
    economy: [
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=700&q=75',
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=700&q=75',
      'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=700&q=75',
      'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=700&q=75',
    ],
    default: [
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=700&q=75',
      'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=700&q=75',
      'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=700&q=75',
    ],
  };

  // ── State ───────────────────────────────────────────────────────
  let state = {
    lastUpdate: null,
    articles: { war: [], bitcoin: [], trade: [], politics: [], economy: [], all: [] },
    isLoading: false,
    updateCount: 0,
    liveSourcesUsed: 0,
    errors: [],
  };

  // ── CURATED FALLBACK ARTICLES (real headlines — Apr 17 2026) ─────
  const FALLBACK_ARTICLES = {
    war: [
      {
        title: 'Lebanon-Israel Ceasefire Goes Into Effect After US Brokering',
        description: 'A 10-day ceasefire between Israel and Lebanon has officially commenced, allowing displaced civilians to begin returning home amid reports of minor violations.',
        link: 'https://www.aljazeera.com',
        pubDate: new Date(Date.now() - 3600000).toISOString(),
        source: 'Al Jazeera',
        category: 'war',
        image: CATEGORY_IMAGES.war[0],
      },
      {
        title: 'Iran Reopens Strait of Hormuz to Commercial Shipping',
        description: 'Tehran confirms the critical waterway is now fully open to international shipping traffic, easing fears of a global supply chain disruption.',
        link: 'https://www.reuters.com',
        pubDate: new Date(Date.now() - 7200000).toISOString(),
        source: 'Reuters',
        category: 'war',
        image: CATEGORY_IMAGES.war[1],
      },
      {
        title: 'Ukrainian Drones Strike Russian Oil Refinery in Tuapse',
        description: 'A large fire broke out at a major Russian oil refinery after a Ukrainian drone strike on the Black Sea port city, escalating the energy front.',
        link: 'https://www.bbc.com/news',
        pubDate: new Date(Date.now() - 10800000).toISOString(),
        source: 'BBC World',
        category: 'war',
        image: CATEGORY_IMAGES.war[2],
      },
    ],
    bitcoin: [
      {
        title: 'Bitcoin Trades Near $78,000 Amid Heavy Profit-Taking',
        description: 'Short-term holders capitalize on the recent relief rally, pushing exchange inflows higher as BTC faces strong resistance around the $78K mark.',
        link: 'https://coindesk.com',
        pubDate: new Date(Date.now() - 1800000).toISOString(),
        source: 'CoinDesk',
        category: 'bitcoin',
        image: CATEGORY_IMAGES.bitcoin[0],
      },
      {
        title: 'Bitcoin Miners Face Post-Halving "Triple Threat" Crisis',
        description: 'The mining industry struggles to balance network security, profitability, and the massive shift toward AI data center operations.',
        link: 'https://dlnews.com',
        pubDate: new Date(Date.now() - 5400000).toISOString(),
        source: 'DL News',
        category: 'bitcoin',
        image: CATEGORY_IMAGES.bitcoin[1],
      },
      {
        title: 'Quantum Computing Risk to 1.7M BTC Sparks "Hourglass" Proposal',
        description: 'Security researchers propose the Hourglass protocol to protect older wallets holding 1.7 million BTC from emerging quantum computing threats.',
        link: 'https://cointelegraph.com',
        pubDate: new Date(Date.now() - 9000000).toISOString(),
        source: 'CoinTelegraph',
        category: 'bitcoin',
        image: CATEGORY_IMAGES.bitcoin[2],
      },
    ],
    trade: [
      {
        title: 'IMF Warns Energy Shocks Are Driving European Inflation Higher',
        description: 'The Fund flags that war-related energy price spikes are pushing Euro area inflation well past estimates, with energy costs up 7% in March.',
        link: 'https://ft.com',
        pubDate: new Date(Date.now() - 2700000).toISOString(),
        source: 'Financial Times',
        category: 'trade',
        image: CATEGORY_IMAGES.trade[0],
      },
      {
        title: 'Oil Prices Plunge 10% After Strait of Hormuz Reopens',
        description: 'Energy markets sell off sharply as the critical shipping lane resumes operations. Brent crude drops below $72 for the first time in weeks.',
        link: 'https://www.wsj.com',
        pubDate: new Date(Date.now() - 6300000).toISOString(),
        source: 'Wall Street Journal',
        category: 'trade',
        image: CATEGORY_IMAGES.trade[1],
      },
      {
        title: 'South Korea Unveils $7.1 Billion Stimulus to Shield Economy',
        description: 'Seoul launches a 10.5 trillion won package to cushion industries from the global trade fallout of the Iran conflict.',
        link: 'https://bloomberg.com',
        pubDate: new Date(Date.now() - 12600000).toISOString(),
        source: 'Bloomberg',
        category: 'trade',
        image: CATEGORY_IMAGES.trade[2],
      },
    ],
    politics: [
      {
        title: "Trump Says Deal to End Iran War Is 'Very Close'",
        description: 'The President signals a peace deal with Iran may be reached imminently, with direct diplomatic talks expected in Pakistan.',
        link: 'https://apnews.com',
        pubDate: new Date(Date.now() - 4500000).toISOString(),
        source: 'AP News',
        category: 'politics',
        image: CATEGORY_IMAGES.politics[0],
      },
      {
        title: 'US-Italy Tensions Flare Over Pope Leo and Iran Policy',
        description: 'Washington and Rome clash after President Trump criticizes the Italian government and Pope Leo XIV over their opposition to the war in Iran.',
        link: 'https://bbc.com',
        pubDate: new Date(Date.now() - 8100000).toISOString(),
        source: 'BBC News',
        category: 'politics',
        image: CATEGORY_IMAGES.politics[1],
      },
      {
        title: "RFK Jr. Calls Measles Vaccine 'Safe and Effective' Under Oath",
        description: 'US Health Secretary surprises Congress by publicly endorsing the measles vaccine during a heated committee hearing.',
        link: 'https://reuters.com',
        pubDate: new Date(Date.now() - 14400000).toISOString(),
        source: 'Reuters',
        category: 'politics',
        image: CATEGORY_IMAGES.politics[2],
      },
    ],
    economy: [
      {
        title: 'Global Stocks Surge as Middle East Tensions Ease',
        description: 'International markets rally sharply after the Lebanon-Israel ceasefire takes hold and key shipping lanes reopen in the Persian Gulf.',
        link: 'https://bloomberg.com',
        pubDate: new Date(Date.now() - 3200000).toISOString(),
        source: 'Bloomberg',
        category: 'economy',
        image: CATEGORY_IMAGES.economy[0],
      },
      {
        title: 'IMF Resumes Engagement with Venezuela After 6-Year Freeze',
        description: 'In a historic shift the International Monetary Fund officially re-establishes operational relations with the Venezuelan government.',
        link: 'https://reuters.com',
        pubDate: new Date(Date.now() - 7600000).toISOString(),
        source: 'Reuters',
        category: 'economy',
        image: CATEGORY_IMAGES.economy[1],
      },
      {
        title: 'FIFA Bans Tailgating at 2026 World Cup US Venues',
        description: 'FIFA moves to ban tailgating at all American stadiums hosting the 2026 World Cup, sparking backlash from fans already frustrated with high ticket prices.',
        link: 'https://www.espn.com',
        pubDate: new Date(Date.now() - 11200000).toISOString(),
        source: 'ESPN',
        category: 'economy',
        image: CATEGORY_IMAGES.economy[2],
      },
    ],
  };

  // ── Build fallbacks ─────────────────────────────────────────────
  function buildFallbackData() {
    const all = Object.values(FALLBACK_ARTICLES).flat();
    return { ...FALLBACK_ARTICLES, all };
  }

  // ── Utility: Score article ──────────────────────────────────────
  function scoreArticle(article, kws) {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    return kws.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0);
  }

  // ── Utility: Get image ──────────────────────────────────────────
  function getArticleImage(article, category) {
    if (article.thumbnail && article.thumbnail.startsWith('http')) return article.thumbnail;
    const pool = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.default;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Utility: Time ago ───────────────────────────────────────────
  function timeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 2) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${days}d ago`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  LIVE DATA FETCHING — via local proxy (bypasses CORS)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch news for one category via our Python proxy.
   * @param {string} query - search query
   * @param {string} forcedCategory - category to assign results
   * @returns {Array} normalized article objects
   */
  async function fetchFromProxy(query, forcedCategory) {
    try {
      const url = `${CONFIG.PROXY_BASE}&q=${encodeURIComponent(query)}&pageSize=20`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(data.message || 'Bad API response');

      return (data.articles || [])
        .filter(a => a.title && a.title !== '[Removed]')
        .map(a => ({
          title: a.title,
          description: (a.description || a.content || '').replace(/<[^>]+>/g, '').trim().substring(0, 240),
          link: a.url || '#',
          pubDate: a.publishedAt || new Date().toISOString(),
          thumbnail: a.urlToImage,
          source: a.source?.name || 'WorldPulse',
          _forcedCategory: forcedCategory,
        }));
    } catch (e) {
      console.warn(`[NewsAgent] Proxy fetch failed for "${forcedCategory}":`, e.message);
      state.errors.push({ category: forcedCategory, error: e.message, time: new Date() });
      return [];
    }
  }

  // ── Classify & Map articles ─────────────────────────────────────
  function classifyArticles(rawArticles) {
    const categorized = { war: [], bitcoin: [], trade: [], politics: [], economy: [], all: [] };
    const seen = new Set();

    rawArticles.forEach(raw => {
      const key = raw.title?.toLowerCase().trim();
      if (!key || key === '[removed]' || seen.has(key)) return;
      seen.add(key);

      const article = {
        title: raw.title,
        description: raw.description || '',
        link: raw.link || '#',
        pubDate: raw.pubDate || new Date().toISOString(),
        thumbnail: raw.thumbnail,
        source: raw.source || 'WorldPulse',
      };

      // Use forced category from the query, but also do keyword scoring
      let bestCat = raw._forcedCategory || null;
      let bestScore = bestCat ? 1 : 0;

      if (!bestCat) {
        Object.entries(KEYWORDS).forEach(([cat, kws]) => {
          const score = scoreArticle(article, kws);
          if (score > bestScore) { bestScore = score; bestCat = cat; }
        });
      }

      const finalCat = (bestCat && bestScore > 0) ? bestCat : 'world';
      article.category = finalCat;
      article.image = getArticleImage(article, finalCat);

      if (categorized[finalCat]) {
        categorized[finalCat].push(article);
      }
      categorized.all.push(article);
    });

    return categorized;
  }

  // ── Merge live results with fallbacks ───────────────────────────
  function mergeWithFallbacks(categorized) {
    Object.keys(FALLBACK_ARTICLES).forEach(cat => {
      if ((categorized[cat] || []).length < 3) {
        categorized[cat] = [
          ...(categorized[cat] || []),
          ...FALLBACK_ARTICLES[cat]
        ].slice(0, CONFIG.MAX_PER_CATEGORY);
      }
    });
    if (categorized.all.length < 5) {
      categorized.all = [
        ...categorized.all,
        ...Object.values(FALLBACK_ARTICLES).flat()
      ].slice(0, 30);
    }
    return categorized;
  }

  // ── Cache helpers ───────────────────────────────────────────────
  function saveCache(data) {
    try {
      localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch (e) { /* storage full — ignore */ }
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CONFIG.CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      return (Date.now() - c.ts < CONFIG.CACHE_DURATION_MS) ? c.data : null;
    } catch (e) { return null; }
  }

  // ── Agent status UI ─────────────────────────────────────────────
  function updateAgentStatus(msg, active) {
    const txt = document.getElementById('agentStatusText');
    const bar = document.getElementById('agentStatusBar');
    if (txt) txt.textContent = msg;
    if (bar) {
      bar.style.borderColor = active ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)';
      bar.style.color = active ? 'var(--accent-green)' : 'var(--accent-gold)';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  MAIN FETCH CYCLE — parallel requests to all categories
  // ═══════════════════════════════════════════════════════════════
  async function fetchLiveNews(onUpdate) {
    state.isLoading = true;
    state.errors = [];
    updateAgentStatus('Fetching live news via NewsAPI...', false);

    try {
      // Fire all category queries in parallel through our proxy
      const results = await Promise.all(
        Object.entries(CATEGORY_QUERIES).map(([cat, query]) =>
          fetchFromProxy(query, cat)
        )
      );

      const allRaw = results.flat();
      state.liveSourcesUsed = results.filter(r => r.length > 0).length;

      if (allRaw.length > 5) {
        let categorized = classifyArticles(allRaw);
        categorized = mergeWithFallbacks(categorized);
        saveCache(categorized);
        state.articles = categorized;
        state.updateCount++;
        const total = categorized.all.length;
        updateAgentStatus(`Live • ${total} articles • NewsAPI`, true);
        console.log(`[NewsAgent] ✓ Fetched ${total} live articles across ${state.liveSourcesUsed} categories`);
        if (onUpdate) onUpdate(categorized);
      } else {
        throw new Error(`Only ${allRaw.length} articles fetched — too few`);
      }
    } catch (err) {
      console.warn('[NewsAgent] Live fetch failed — using fallback data:', err.message);
      updateAgentStatus('Curated • Fallback Active', true);
    }

    state.isLoading = false;
    state.lastUpdate = new Date();
  }

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    /**
     * Initialize the agent.
     * 1) Shows cached/fallback data instantly
     * 2) Fetches live news in the background
     * 3) Sets up auto-refresh timer
     */
    init: async function(onLiveUpdate) {
      console.log('[NewsAgent v3] Starting — loading articles immediately...');

      // Step 1: Show fallbacks or cache IMMEDIATELY
      const cached = loadCache();
      if (cached) {
        state.articles = cached;
        state.lastUpdate = new Date();
        updateAgentStatus('Cached data loaded', true);
        console.log('[NewsAgent] Using cached data');
      } else {
        state.articles = buildFallbackData();
        updateAgentStatus('AI Agent Active', true);
        console.log('[NewsAgent] Using curated fallback data');
      }

      // Step 2: Fetch REAL live news in background (non-blocking)
      setTimeout(() => fetchLiveNews(onLiveUpdate), 800);

      // Step 3: Auto-refresh every 30 minutes
      setInterval(() => fetchLiveNews(onLiveUpdate), CONFIG.UPDATE_INTERVAL_MS);

      return state.articles;
    },

    getArticles:    () => state.articles,
    getCategory:    (cat) => state.articles[cat] || [],
    forceUpdate:    (cb) => fetchLiveNews(cb),
    timeAgo,
    getFallbacks:   buildFallbackData,

    getState: () => ({
      lastUpdate:       state.lastUpdate,
      isLoading:        state.isLoading,
      updateCount:      state.updateCount,
      liveSourcesUsed:  state.liveSourcesUsed,
      totalArticles:    state.articles.all?.length || 0,
      errors:           state.errors,
      categories: {
        war:      state.articles.war?.length || 0,
        bitcoin:  state.articles.bitcoin?.length || 0,
        trade:    state.articles.trade?.length || 0,
        politics: state.articles.politics?.length || 0,
        economy:  state.articles.economy?.length || 0,
      }
    }),
  };
})();
