# MATCHLATCH handoff — WO-ML-018A

Development branch: `feature/wo-ml-018a-nightly-shopify-sync`.
Base: `feature/wo-ml-017-unified-discovery` at `815e3ca`.

Read `docs/WO-ML-018A-NIGHTLY-SHOPIFY-SYNC.md` before any service activation.

The shared Supabase baseline is 899 private **Awin** variants from Watches Of USA, not Shopify. No live catalog rows were altered. Awin modules, account relationships and source data remain preserved.

The sync engine, protected owner/scheduler routes, isolated database proposal,
approval checks, Store/Studio integration and tests are implemented. No live
Shopify import or actual nightly scheduler execution has been verified.

Missing prerequisites: authenticated Shopify Admin read access, a separately
authorized isolated Preview database, live source/policy evidence and recurring
scheduler validation. Do not use existing Production or shared database secrets
as substitutes. Query schema execution remains authentication/tool-asset blocked.

Production is 404 for the new sync handler. Never merge main, deploy Production,
schedule Production, publish private live inventory, register webhooks, place
orders or add fees without the specific Founder authorization required by the
work order. Proposed SQL is not a request to apply it to the shared project.

Validation commands:

```sh
node --test scripts/test-*.mjs
node scripts/audit.mjs
node scripts/check-commerce-policy.mjs
```

For actual SQL integration, set `MATCHLATCH_PGLITE_MODULE` to the installed
`@electric-sql/pglite@0.5.9` module. CI provisions this pinned temporary dependency.
