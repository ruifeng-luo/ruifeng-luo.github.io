import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
const env = { DB: {
  prepare(sql) {
    return { sql, args: [], bind(...args) { this.args = args; return this; } };
  },
  async batch(statements) {
    sqlite.exec('BEGIN');
    try {
      const results = statements.map(({ sql, args }) => {
        const stmt = sqlite.prepare(sql);
        return { results: sql.startsWith('SELECT') ? stmt.all(...args) : (stmt.run(...args), []) };
      });
      sqlite.exec('COMMIT');
      return results;
    } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  },
} };
function request(method = 'GET', headers = {}, country = 'CN', path = '/api/site-stats') {
  const req = new Request('https://ruifengluo.com' + path, {
    method,
    headers: { Origin: 'https://ruifengluo.com', 'X-Site-Counter': '1', 'User-Agent': 'Mozilla/5.0 Safari/604.1', ...headers },
  });
  Object.defineProperty(req, 'cf', { value: { country } });
  return req;
}
async function stats(req) { return (await worker.fetch(req, env)).json(); }
assert.deepEqual(await stats(request()), { views: 0, countries: 0, since: '2026-10-23' });
assert.equal((await worker.fetch(request('POST', { Origin: 'https://other.example' }), env)).status, 403);
assert.equal((await worker.fetch(request('POST', { 'X-Site-Counter': '' }), env)).status, 403);
for (const headers of [{ 'User-Agent': 'Googlebot' }, { DNT: '1' }, { 'Sec-GPC': '1' }]) {
  assert.equal((await stats(request('POST', headers))).views, 0);
}
await Promise.all(Array.from({ length: 25 }, () => stats(request('POST'))));
assert.deepEqual(await stats(request()), { views: 25, countries: 1, since: '2026-10-23' });
assert.deepEqual(await stats(request('POST', {}, 'US')), { views: 26, countries: 2, since: '2026-10-23' });
assert.deepEqual(await stats(request('POST', {}, 'XX')), { views: 27, countries: 2, since: '2026-10-23' });
assert.equal((await worker.fetch(request('PUT'), env)).status, 405);
assert.equal((await worker.fetch(request('GET', {}, 'CN', '/'), env)).status, 404);
assert.equal((await worker.fetch(request(), { DB: { batch() { throw new Error('offline'); }, prepare() {} } })).status, 503);
assert.deepEqual(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row => row.name), ['site_countries', 'site_totals']);
console.log('PASS: increments, concurrent loads, unique countries, bot/privacy exclusions, origin guard, read-only GET and failure handling');
