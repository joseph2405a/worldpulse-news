<?php
/**
 * WorldPulse News — PHP Proxy for NewsAPI
 * =========================================
 * Replaces server.py for Hostinger Shared Hosting.
 * Endpoints:
 *   proxy.php?endpoint=everything&q=bitcoin&pageSize=20
 *   proxy.php?endpoint=top-headlines&category=general&country=us&pageSize=15
 *   proxy.php?endpoint=status
 */

// ── Configuration ──────────────────────────────────────────────────
define('NEWS_API_KEY', 'd9d4032029ad4fa5a2743ac6041a300e');
define('CACHE_DIR', __DIR__ . '/cache/');
define('CACHE_TTL', 900); // 15 minutes cache

// ── CORS Headers ───────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only allow GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// ── Create cache directory ─────────────────────────────────────────
if (!is_dir(CACHE_DIR)) {
    @mkdir(CACHE_DIR, 0755, true);
    // Protect cache directory
    @file_put_contents(CACHE_DIR . '.htaccess', "Deny from all\n");
}

// ── Route Handling ─────────────────────────────────────────────────
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : 'status';

switch ($endpoint) {
    case 'status':
        echo json_encode([
            'status' => 'ok',
            'server' => 'WorldPulse News PHP Proxy v1.0',
            'timestamp' => date('c'),
            'api_configured' => !empty(NEWS_API_KEY),
            'cache_ttl' => CACHE_TTL,
            'php_version' => phpversion()
        ]);
        break;

    case 'everything':
        proxyEverything();
        break;

    case 'top-headlines':
        proxyTopHeadlines();
        break;

    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Unknown endpoint: ' . $endpoint]);
        break;
}

// ── Proxy: /v2/everything ──────────────────────────────────────────
function proxyEverything() {
    $q = isset($_GET['q']) ? $_GET['q'] : 'world news';
    $pageSize = isset($_GET['pageSize']) ? intval($_GET['pageSize']) : 20;
    $pageSize = min($pageSize, 100); // Cap at 100

    $params = http_build_query([
        'q' => $q,
        'sortBy' => 'publishedAt',
        'language' => 'en',
        'pageSize' => $pageSize,
        'apiKey' => NEWS_API_KEY
    ]);

    $url = "https://newsapi.org/v2/everything?{$params}";
    $cacheKey = 'everything_' . md5($q . $pageSize);

    fetchAndRespond($url, $cacheKey);
}

// ── Proxy: /v2/top-headlines ───────────────────────────────────────
function proxyTopHeadlines() {
    $category = isset($_GET['category']) ? $_GET['category'] : 'general';
    $country = isset($_GET['country']) ? $_GET['country'] : 'us';
    $pageSize = isset($_GET['pageSize']) ? intval($_GET['pageSize']) : 15;
    $pageSize = min($pageSize, 100);

    $params = http_build_query([
        'category' => $category,
        'country' => $country,
        'pageSize' => $pageSize,
        'apiKey' => NEWS_API_KEY
    ]);

    $url = "https://newsapi.org/v2/top-headlines?{$params}";
    $cacheKey = 'top_' . md5($category . $country . $pageSize);

    fetchAndRespond($url, $cacheKey);
}

// ── Fetch from NewsAPI with caching ────────────────────────────────
function fetchAndRespond($url, $cacheKey) {
    // Check cache first
    $cacheFile = CACHE_DIR . $cacheKey . '.json';

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
        $cached = @file_get_contents($cacheFile);
        if ($cached !== false) {
            echo $cached;
            return;
        }
    }

    // Fetch from NewsAPI
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: WorldPulse/2.0 PHP\r\n",
            'timeout' => 12,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true
        ]
    ]);

    $response = @file_get_contents($url, false, $context);

    if ($response === false) {
        // If fetch failed, try to serve stale cache
        if (file_exists($cacheFile)) {
            $stale = @file_get_contents($cacheFile);
            if ($stale !== false) {
                echo $stale;
                return;
            }
        }

        http_response_code(502);
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to connect to NewsAPI. Please try again later.'
        ]);
        return;
    }

    // Check HTTP status from response headers
    $httpCode = 200;
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $header) {
            if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
                $httpCode = intval($matches[1]);
            }
        }
    }

    if ($httpCode >= 400) {
        http_response_code($httpCode);
        echo $response;
        return;
    }

    // Validate JSON
    $decoded = json_decode($response, true);
    if ($decoded === null) {
        http_response_code(502);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid JSON response from NewsAPI'
        ]);
        return;
    }

    // Save to cache
    @file_put_contents($cacheFile, $response, LOCK_EX);

    // Output
    echo $response;
}
?>
