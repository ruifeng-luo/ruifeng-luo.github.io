# Homepage activity counter

The homepage remains on GitHub Pages. A Cloudflare Worker handles only
`ruifengluo.com/api/site-stats*` and `www.ruifengluo.com/api/site-stats*`.
All other requests continue to GitHub Pages.

## Counting rules

- Starts on 2026-10-23 at zero; no sampled historical analytics are imported.
- One POST per visible browser page load. Reloads count again. This is not UV.
- GET only reads the totals. Local previews never contact the production counter.
- Known bot user agents are skipped. Other automated loads may still count;
  Origin and a custom header prevent casual cross-site browser submissions but
  are not authentication or proof that a visitor is human.
- DNT and Global Privacy Control suppress counting in both client and Worker.
- D1 stores only one total and a set of two-letter country/region codes supplied
  by Cloudflare. It stores no IPs, cookies, identifiers or individual visit log.
- The footer shows a dash on failure; it never invents or resets a count.
- Cloudflare's existing HTTP Analytics is independent and may show higher counts.

## Resources

- Worker and D1 database: `ruifengluo-site-stats`
- Binding: `DB`; configuration: `wrangler.jsonc`
- Schema: `schema.sql` (safe to rerun; never overwrite the existing total)
- Public aggregate endpoint: `https://ruifengluo.com/api/site-stats`
- Account and database identifiers in configuration are resource IDs, not secrets.
- No periodic job, new paid plan or third-party analytics vendor is needed.

## Maintenance

Use an authorized Cloudflare session with Workers Scripts Write, Workers Routes
Write and the necessary account/zone read permissions. Never commit credentials.

```sh
node services/site-stats/worker.test.mjs
npx wrangler deploy --dry-run --config services/site-stats/wrangler.jsonc
npx wrangler deploy --config services/site-stats/wrangler.jsonc
```

The test uses Node's built-in SQLite module (a recent Node release is required).
Do not rerun live POST tests or reset the database to make the displayed count
look nicer. Verify GET does not change the total and test exclusions locally.

To roll back the counter service, remove its two Worker routes; this leaves the
homepage and its GitHub Pages hosting intact. Preserve D1 to retain the totals.
For frontend changes, revert the corresponding Git commit and republish Pages.
