const https = require('https');
const http = require('http');

function initKeepAlive() {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || 'https://private-universities-mern.onrender.com/health';
  if (!targetUrl || !targetUrl.startsWith('http')) return;

  const INTERVAL_MS = 9 * 60 * 1000; // Ping every 9 minutes (Render sleeps after 15m)

  const ping = () => {
    try {
      const client = targetUrl.startsWith('https') ? https : http;
      client.get(targetUrl, (res) => {
        res.resume(); // Consume response stream
      }).on('error', () => {});
    } catch {
      // Ignore network errors during keep-alive ping
    }
  };

  // Initial ping 1 minute after server start
  setTimeout(ping, 60 * 1000);
  setInterval(ping, INTERVAL_MS);
}

module.exports = { initKeepAlive };
