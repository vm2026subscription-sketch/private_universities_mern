const https = require('https');
const http = require('http');

function initKeepAlive() {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || 'https://private-universities-mern.onrender.com/health';
  if (!targetUrl || !targetUrl.startsWith('http')) return;

  const INTERVAL_MS = 9 * 60 * 1000; // Ping every 9 minutes (Render sleeps after 15m)
  let lastPingOk = false;

  const ping = () => {
    try {
      const client = targetUrl.startsWith('https') ? https : http;
      const req = client.get(targetUrl, (res) => {
        res.resume();
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (ok !== lastPingOk) {
          console.log(`[keep-alive] Ping ${ok ? 'OK' : 'FAILED'} (${res.statusCode})`);
          lastPingOk = ok;
        }
      });
      req.on('error', () => {
        if (lastPingOk) {
          console.log('[keep-alive] Ping failed (network error)');
          lastPingOk = false;
        }
      });
      req.setTimeout(10000, () => {
        req.destroy();
        if (lastPingOk) {
          console.log('[keep-alive] Ping timed out');
          lastPingOk = false;
        }
      });
    } catch {
      // Ignore network errors during keep-alive ping
    }
  };

  // Initial ping 1 minute after server start
  setTimeout(ping, 60 * 1000);
  setInterval(ping, INTERVAL_MS);
}

module.exports = { initKeepAlive };
