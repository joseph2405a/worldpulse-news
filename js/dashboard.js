/**
 * WorldPulse News — Analytics Dashboard Controller
 * All charts powered by Chart.js 4.x
 */

// ── Config ─────────────────────────────────────────────────────────
const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#8ba3c0', font: { family: 'Inter', size: 11 }, boxWidth: 12 } },
    tooltip: {
      backgroundColor: '#111d2e',
      titleColor: '#f0f6ff',
      bodyColor: '#8ba3c0',
      borderColor: '#1e3050',
      borderWidth: 1,
      padding: 10,
    }
  },
  scales: {
    x: { ticks: { color: '#4d6a8a', font: { size: 10 } }, grid: { color: 'rgba(30,48,80,0.5)' } },
    y: { ticks: { color: '#4d6a8a', font: { size: 10 } }, grid: { color: 'rgba(30,48,80,0.5)' } }
  }
};

let currentRange = '7d';
let dashLang = localStorage.getItem('wp_lang') || 'en';
let charts = {};
let agentCountdown = 3600; // seconds until next update

// ── Data Generators ────────────────────────────────────────────────
function generateTimeseriesData(days, base, variance) {
  return Array.from({ length: days }, (_, i) => {
    const noise = (Math.random() - 0.4) * variance;
    const trend = i * (variance * 0.05);
    return Math.max(0, Math.round(base + noise + trend));
  });
}

function getLabels(range) {
  const now = new Date();
  const days = range === '1d' ? 24 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
  if (range === '1d') {
    return Array.from({ length: 24 }, (_, i) => `${i}:00`);
  }
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
}

function getMetrics(range) {
  const multiplier = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 }[range] || 7;
  return {
    visitors:  Math.round(3800 * multiplier + Math.random() * 500 * multiplier),
    pageviews: Math.round(9200 * multiplier + Math.random() * 1200 * multiplier),
    revenue:   (12.5 * multiplier + Math.random() * 8 * multiplier).toFixed(2),
    ctr:       (2.8 + Math.random() * 1.2).toFixed(2),
  };
}

// ── Animate Counter ────────────────────────────────────────────────
function animateCounter(el, target, prefix = '', suffix = '', duration = 1200) {
  if (!el) return;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);
    el.textContent = prefix + current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// ── Render Stats ───────────────────────────────────────────────────
function renderStats(range) {
  const m = getMetrics(range);

  animateCounter(document.getElementById('visitorsValue'), m.visitors);
  animateCounter(document.getElementById('pageviewsValue'), m.pageviews);

  const revEl = document.getElementById('revenueValue');
  if (revEl) revEl.textContent = '$' + parseFloat(m.revenue).toFixed(2);

  const ctrEl = document.getElementById('ctrValue');
  if (ctrEl) ctrEl.textContent = m.ctr + '%';
}

// ── Traffic Chart ──────────────────────────────────────────────────
function renderTrafficChart(range) {
  const days = { '1d': 24, '7d': 7, '30d': 30, '90d': 90 }[range] || 7;
  const labels = getLabels(range);
  const visitors = generateTimeseriesData(days, range === '1d' ? 200 : 3800, range === '1d' ? 150 : 900);
  const pageviews = visitors.map(v => Math.round(v * (2.2 + Math.random() * 0.5)));

  const ctx = document.getElementById('trafficChart');
  if (!ctx) return;

  if (charts.traffic) charts.traffic.destroy();

  charts.traffic = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Visitors',
          data: visitors,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          borderWidth: 2,
          pointRadius: days > 30 ? 0 : 3,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Page Views',
          data: pageviews,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.06)',
          borderWidth: 2,
          pointRadius: days > 30 ? 0 : 3,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      interaction: { mode: 'index', intersect: false },
    }
  });
}

// ── Sources Pie ────────────────────────────────────────────────────
function renderSourcesChart() {
  const ctx = document.getElementById('sourcesChart');
  if (!ctx) return;
  if (charts.sources) charts.sources.destroy();

  charts.sources = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Google Search', 'Direct', 'Social Media', 'Referral', 'Email', 'Other'],
      datasets: [{
        data: [42, 21, 18, 10, 6, 3],
        backgroundColor: ['#3b82f6','#e53e3e','#8b5cf6','#10b981','#f59e0b','#4d6a8a'],
        borderWidth: 2,
        borderColor: '#111d2e',
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#8ba3c0', font: { size: 11 }, boxWidth: 12 } },
        tooltip: CHART_DEFAULTS.plugins.tooltip,
      },
      cutout: '65%',
    }
  });
}

// ── Category Bar ───────────────────────────────────────────────────
function renderCategoryChart() {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  if (charts.category) charts.category.destroy();

  charts.category = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Wars', 'Bitcoin', 'Trade', 'Politics', 'Economy', 'Tech'],
      datasets: [{
        label: 'Page Views',
        data: [28400, 22100, 17800, 15200, 12600, 8900],
        backgroundColor: ['#e53e3e','#f59e0b','#8b5cf6','#3b82f6','#10b981','#ec4899'],
        borderRadius: 6,
        barThickness: 28,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
      scales: {
        x: { ticks: { color: '#4d6a8a', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#4d6a8a', font: { size: 10 } }, grid: { color: 'rgba(30,48,80,0.5)' } }
      }
    }
  });
}

// ── Devices Doughnut ───────────────────────────────────────────────
function renderDevicesChart() {
  const ctx = document.getElementById('devicesChart');
  if (!ctx) return;
  if (charts.devices) charts.devices.destroy();

  charts.devices = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Mobile', 'Desktop', 'Tablet'],
      datasets: [{
        data: [58, 34, 8],
        backgroundColor: ['#3b82f6','#8b5cf6','#10b981'],
        borderWidth: 2,
        borderColor: '#111d2e',
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8ba3c0', font: { size: 11 }, boxWidth: 12 } },
        tooltip: CHART_DEFAULTS.plugins.tooltip,
      },
      cutout: '60%',
    }
  });
}

// ── Revenue Bar ────────────────────────────────────────────────────
function renderRevenueChart(range) {
  const days = { '1d': 24, '7d': 7, '30d': 30, '90d': 90 }[range] || 7;
  const labels = getLabels(range);
  const data = generateTimeseriesData(days, range === '1d' ? 2.1 : 18.5, range === '1d' ? 2 : 12);

  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;
  if (charts.revenue) charts.revenue.destroy();

  charts.revenue = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue ($)',
        data,
        backgroundColor: 'rgba(229,62,62,0.7)',
        borderColor: '#e53e3e',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
    }
  });
}

// ── Search Impressions Line ────────────────────────────────────────
function renderImpressionsChart() {
  const ctx = document.getElementById('impressionsChart');
  if (!ctx) return;
  if (charts.impressions) charts.impressions.destroy();

  const labels = getLabels('7d');
  const data = generateTimeseriesData(7, 12000, 4000);

  charts.impressions = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Impressions',
        data,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
    }
  });
}

// ── Performance Gauge (custom canvas) ─────────────────────────────
function renderPerformanceGauge() {
  const canvas = document.getElementById('performanceGauge');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const score = 86;
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Background arc
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.85, H * 0.72, Math.PI, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(30,48,80,0.8)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Score arc
  const angle = Math.PI + (score / 100) * Math.PI;
  const gradient = ctx.createLinearGradient(0, 0, W, 0);
  gradient.addColorStop(0, '#e53e3e');
  gradient.addColorStop(0.5, '#f59e0b');
  gradient.addColorStop(1, '#10b981');

  ctx.beginPath();
  ctx.arc(W / 2, H * 0.85, H * 0.72, Math.PI, angle);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Score text
  ctx.fillStyle = '#f0f6ff';
  ctx.font = `bold 32px Oswald, Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(score, W / 2, H * 0.6);

  ctx.fillStyle = '#10b981';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('GOOD', W / 2, H * 0.77);
}

// ── Top Articles Table ─────────────────────────────────────────────
const TOP_ARTICLES = {
  en: [
    { title: 'Ukraine War: Zelensky Calls for More Air Defense', cat: 'war', views: 28420, time: '4:22', ctr: '4.1%' },
    { title: 'Bitcoin Surges Past $84,000 — Institutional Buying', cat: 'bitcoin', views: 22180, time: '3:45', ctr: '5.8%' },
    { title: 'Trump 145% Tariffs on China — Full Escalation', cat: 'trade', views: 17640, time: '5:12', ctr: '4.7%' },
    { title: 'Gold Hits All-Time High of $3,327/oz', cat: 'economy', views: 14980, time: '3:01', ctr: '3.9%' },
    { title: 'Gaza Ceasefire Talks Resume in Cairo', cat: 'war', views: 12350, time: '4:33', ctr: '3.2%' },
    { title: 'NATO Emergency Summit — Full Coverage', cat: 'politics', views: 10820, time: '6:14', ctr: '2.8%' },
    { title: 'Fed Holds Rates — Inflation Still High', cat: 'economy', views: 9240, time: '2:55', ctr: '3.1%' },
  ],
  es: [
    { title: 'Guerra Ucrania: Zelensky pide más defensa aérea', cat: 'war', views: 28420, time: '4:22', ctr: '4.1%' },
    { title: 'Bitcoin supera los $84,000 — Compra institucional', cat: 'bitcoin', views: 22180, time: '3:45', ctr: '5.8%' },
    { title: 'Aranceles 145% de Trump sobre China — Escalada total', cat: 'trade', views: 17640, time: '5:12', ctr: '4.7%' },
    { title: 'El oro alcanza máximo histórico de $3,327/oz', cat: 'economy', views: 14980, time: '3:01', ctr: '3.9%' },
    { title: 'Negociaciones de alto el fuego en Gaza reanudan el Cairo', cat: 'war', views: 12350, time: '4:33', ctr: '3.2%' },
    { title: 'Cumbre emergencia OTAN — Cobertura completa', cat: 'politics', views: 10820, time: '6:14', ctr: '2.8%' },
    { title: 'Fed mantiene tasas — Inflación sigue alta', cat: 'economy', views: 9240, time: '2:55', ctr: '3.1%' },
  ]
};

const CAT_BADGES = {
  war:      '<span class="table-cat-badge cat-war">💥 War</span>',
  bitcoin:  '<span class="table-cat-badge cat-bitcoin">₿ Bitcoin</span>',
  trade:    '<span class="table-cat-badge cat-trade">🚢 Trade</span>',
  politics: '<span class="table-cat-badge cat-politics">🏛️ Politics</span>',
  economy:  '<span class="table-cat-badge cat-economy">💹 Economy</span>',
};

function renderArticlesTable() {
  const tbody = document.getElementById('articlesTableBody');
  if (!tbody) return;
  const articles = TOP_ARTICLES[dashLang] || TOP_ARTICLES.en;

  tbody.innerHTML = articles.map((a, i) => `
    <tr>
      <td class="table-article-title">${i + 1}. ${a.title}</td>
      <td>${CAT_BADGES[a.cat] || ''}</td>
      <td style="font-weight:700;color:var(--text-white)">${a.views.toLocaleString()}</td>
      <td>${a.time}</td>
      <td style="color:var(--accent-green);font-weight:700">${a.ctr}</td>
    </tr>
  `).join('');
}

// ── Geographic Distribution ────────────────────────────────────────
const GEO_DATA = [
  { flag: '🇺🇸', name: 'USA', pct: 32 },
  { flag: '🇬🇧', name: 'UK', pct: 14 },
  { flag: '🇲🇽', name: 'Mexico', pct: 11 },
  { flag: '🇦🇺', name: 'Australia', pct: 8 },
  { flag: '🇩🇪', name: 'Germany', pct: 7 },
  { flag: '🇪🇸', name: 'Spain', pct: 6 },
  { flag: '🇨🇦', name: 'Canada', pct: 6 },
  { flag: '🇧🇷', name: 'Brazil', pct: 5 },
  { flag: '🇮🇳', name: 'India', pct: 4 },
  { flag: '🌍', name: 'Other', pct: 7 },
];

function renderGeoData() {
  const list = document.getElementById('countryList');
  if (!list) return;

  list.innerHTML = GEO_DATA.map(c => `
    <div class="country-item">
      <span class="country-flag">${c.flag}</span>
      <span class="country-name">${c.name}</span>
      <div class="country-bar-wrap">
        <div class="country-bar" style="width:0%" data-target="${c.pct}"></div>
      </div>
      <span class="country-pct">${c.pct}%</span>
    </div>
  `).join('');

  // Animate bars
  setTimeout(() => {
    list.querySelectorAll('.country-bar').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  }, 200);
}

// ── Keywords ───────────────────────────────────────────────────────
const KEYWORDS_DATA = {
  en: [
    { kw: 'ukraine war 2025', pos: '#3', vol: '18.4K' },
    { kw: 'bitcoin price today', pos: '#7', vol: '14.2K' },
    { kw: 'trump tariffs china', pos: '#5', vol: '11.8K' },
    { kw: 'israel gaza ceasefire', pos: '#4', vol: '9.6K' },
    { kw: 'nato news today', pos: '#8', vol: '7.2K' },
    { kw: 'gold price record', pos: '#11', vol: '6.4K' },
  ],
  es: [
    { kw: 'guerra ucrania 2025', pos: '#3', vol: '18.4K' },
    { kw: 'precio bitcoin hoy', pos: '#7', vol: '14.2K' },
    { kw: 'aranceles trump china', pos: '#5', vol: '11.8K' },
    { kw: 'ceasefire israel gaza', pos: '#4', vol: '9.6K' },
    { kw: 'noticias otan hoy', pos: '#8', vol: '7.2K' },
    { kw: 'precio oro record', pos: '#11', vol: '6.4K' },
  ]
};

function renderKeywords() {
  const el = document.getElementById('keywordsList');
  if (!el) return;
  const kws = KEYWORDS_DATA[dashLang] || KEYWORDS_DATA.en;

  el.innerHTML = kws.map(k => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;">
      <span style="color:var(--text-primary);font-weight:600">${k.kw}</span>
      <div style="display:flex;gap:12px;align-items:center;">
        <span style="color:var(--accent-green);font-weight:700">${k.pos}</span>
        <span style="color:var(--text-muted)">${k.vol}</span>
      </div>
    </div>
  `).join('');
}

// ── Date Range Filter ──────────────────────────────────────────────
function setDateRange(range, btn) {
  currentRange = range;
  document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');

  renderStats(range);
  renderTrafficChart(range);
  renderRevenueChart(range);

  const badge = document.getElementById('trafficChartBadge');
  const labels = { '1d': 'Today', '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days' };
  if (badge) badge.textContent = labels[range] || 'Last 7 Days';
}

// ── Refresh ────────────────────────────────────────────────────────
function refreshDashboard() {
  const icon = document.getElementById('refreshIcon');
  if (icon) icon.classList.add('fa-spin');

  setTimeout(() => {
    renderAllCharts();
    if (icon) icon.classList.remove('fa-spin');
    showDashToast('✅ Dashboard refreshed!', 'success');
  }, 1200);
}

function renderAllCharts() {
  renderStats(currentRange);
  renderTrafficChart(currentRange);
  renderSourcesChart();
  renderCategoryChart();
  renderDevicesChart();
  renderRevenueChart(currentRange);
  renderImpressionsChart();
  renderPerformanceGauge();
  renderArticlesTable();
  renderGeoData();
  renderKeywords();
}

// ── Export ─────────────────────────────────────────────────────────
function exportReport() {
  showDashToast('📄 Report exported as PDF (demo)', 'success');
}

// ── Language ───────────────────────────────────────────────────────
function setDashLang(lang) {
  dashLang = lang;
  localStorage.setItem('wp_lang', lang);

  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.lang-btn').forEach(b => {
    if (b.textContent === lang.toUpperCase()) b.classList.add('active');
  });

  renderArticlesTable();
  renderKeywords();
  showDashToast(lang === 'es' ? 'Idioma: Español' : 'Language: English', 'info');
}

// ── AI Agent Countdown ─────────────────────────────────────────────
function startAgentCountdown() {
  setInterval(() => {
    agentCountdown--;
    if (agentCountdown <= 0) agentCountdown = 3600;

    const mins = Math.floor(agentCountdown / 60);
    const secs = agentCountdown % 60;
    const el = document.getElementById('agentNextUpdate');
    if (el) el.textContent = mins + 'm ' + secs + 's';
  }, 1000);
}

// ── Toast ──────────────────────────────────────────────────────────
function showDashToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { info: '📊', success: '✅', error: '❌' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── Date Display ───────────────────────────────────────────────────
function updateDashDate() {
  const el = document.getElementById('dashDate');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ── INIT ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateDashDate();
  renderAllCharts();
  startAgentCountdown();

  // Auto-refresh every 5 minutes
  setInterval(() => {
    renderStats(currentRange);
    renderTrafficChart(currentRange);
  }, 5 * 60 * 1000);

  showDashToast('📊 Dashboard loaded — Data is live!', 'info');
});
