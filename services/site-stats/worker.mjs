// Aggregate activity only. No cookies, IP addresses, user IDs or event history.
const ORIGINS = new Set(['https://ruifengluo.com', 'https://www.ruifengluo.com']);
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|curl|wget|python|httpclient|go-http|facebookexternalhit|preview|monitor|scanner/i;
const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/site-stats') return json({ error: 'Not found' }, 404);
    if (!['GET', 'POST'].includes(request.method)) {
      return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET, POST' } });
    }
    if (request.method === 'POST' && (!ORIGINS.has(request.headers.get('Origin')) || request.headers.get('X-Site-Counter') !== '1')) {
      return json({ error: 'Forbidden' }, 403);
    }
    try {
      const statements = [];
      const ua = request.headers.get('User-Agent') || '';
      const noTrack = request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1';
      if (request.method === 'POST' && ua && !BOT.test(ua) && !noTrack) {
        statements.push(env.DB.prepare("UPDATE site_totals SET views = views + 1 WHERE id = 1"));
        const country = request.cf?.country;
        if (typeof country === 'string' && /^[A-Z]{2}$/.test(country) && !['XX', 'T1'].includes(country)) {
          statements.push(env.DB.prepare('INSERT OR IGNORE INTO site_countries (code) VALUES (?)').bind(country));
        }
      }
      statements.push(env.DB.prepare('SELECT views, (SELECT COUNT(*) FROM site_countries) AS countries FROM site_totals WHERE id = 1'));
      const results = await env.DB.batch(statements);
      const stats = results[results.length - 1].results[0];
      if (!stats) throw new Error('Counter not initialized');
      return json({ views: stats.views, countries: stats.countries, since: '2026-10-23' });
    } catch (_) {
      return json({ error: 'Counter unavailable' }, 503);
    }
  },
};
