/**
 * WorldPulse News — Netlify Serverless Proxy for NewsAPI
 * ======================================================
 * Replaces proxy.php for Netlify deployment.
 * 
 * Endpoints (via /.netlify/functions/news-proxy):
 *   ?endpoint=everything&q=bitcoin&pageSize=20
 *   ?endpoint=top-headlines&category=general&country=us&pageSize=15
 *   ?endpoint=status
 */

const NEWS_API_KEY = "d9d4032029ad4fa5a2743ac6041a300e";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

exports.handler = async (event) => {
  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ status: "error", message: "Method not allowed" }),
    };
  }

  const params = event.queryStringParameters || {};
  const endpoint = params.endpoint || "status";

  try {
    switch (endpoint) {
      case "status":
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            status: "ok",
            server: "WorldPulse News Netlify Proxy v1.0",
            timestamp: new Date().toISOString(),
            api_configured: !!NEWS_API_KEY,
          }),
        };

      case "everything":
        return await proxyEverything(params);

      case "top-headlines":
        return await proxyTopHeadlines(params);

      default:
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ status: "error", message: "Unknown endpoint: " + endpoint }),
        };
    }
  } catch (err) {
    console.error("[news-proxy] Error:", err.message);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ status: "error", message: err.message }),
    };
  }
};

async function proxyEverything(params) {
  const q = params.q || "world news";
  const pageSize = Math.min(parseInt(params.pageSize) || 20, 100);

  const url =
    `https://newsapi.org/v2/everything` +
    `?q=${encodeURIComponent(q)}` +
    `&sortBy=publishedAt&language=en` +
    `&pageSize=${pageSize}` +
    `&apiKey=${NEWS_API_KEY}`;

  return await fetchFromNewsAPI(url);
}

async function proxyTopHeadlines(params) {
  const category = params.category || "general";
  const country = params.country || "us";
  const pageSize = Math.min(parseInt(params.pageSize) || 15, 100);

  const url =
    `https://newsapi.org/v2/top-headlines` +
    `?category=${encodeURIComponent(category)}` +
    `&country=${encodeURIComponent(country)}` +
    `&pageSize=${pageSize}` +
    `&apiKey=${NEWS_API_KEY}`;

  return await fetchFromNewsAPI(url);
}

async function fetchFromNewsAPI(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "WorldPulse/2.0 Netlify" },
  });

  const body = await response.text();

  return {
    statusCode: response.ok ? 200 : response.status,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=300",
    },
    body: body,
  };
}
