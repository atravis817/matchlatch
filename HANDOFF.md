# Current resume checkpoint — 2026-10-14 app authentication

PR #9 authentication directive 6179162968 and issue #7 update 6179163204 received and acknowledged. Inspection HEAD 086d73f63ab81b75f1b5b246ff8b0bc2119b5be4; initially clean. Delivery SHA is recorded in PR/hub after commit. Canonical 0–20 governance record remains in PR #10, not merged or overwritten here.

Implemented server-only client-credentials exchange, in-reader cache/single-flight, 60-second early renewal, one bounded 401 renewal, strict read_products/read_inventory scope gate, sanitization/timeouts/response caps, existing read-token compatibility, and owner-only Preview auth diagnostic independent of DB. Setup: docs/SHOPIFY-PREVIEW-AUTH-SETUP.md. New files: lib/shopify-admin-auth.mjs and scripts/test-shopify-admin-auth.mjs; modified reader and sync route. No SQL, workflow or public browser assets changed.

LOCAL_VERIFIED: node --test scripts/test-*.mjs: 218 passed, 0 failed, 1 SQL suite skipped (PGlite absent). Static audit, commerce policy and git diff --check passed. No live app credentials, organization eligibility, token exchange, Admin catalog baseline or scheduled tick verified. Existing Production/Preview metadata below is historical, not reverified for this change. No database writes/migrations, publication, scheduler, Production, purchase, paid-service or Awin activation authorized/performed.

Next action: Alan securely configures the four branch-scoped Preview variables in the setup guide; rebuild protected Preview and run owner-authorized read-only auth diagnostic. Same-organization eligibility must be established; otherwise authorization-code grant is the supported non-embedded alternative. No secret values in this record. Keep all three write/schedule/publication flags false. DB isolation remains a separate blocker. Review risks: client-credential eligibility unknown; exact scope gate intentionally rejects broader grants; token cache is per reader, not durable/global; previous main/governance divergence preserved. Final self-audit: code/docs/test scope inspected, counts reconciled, no secret values, no release implied. Incoming agents must consult PR #10 full handoff/runbook and current hub before overlapping edits.

---
Historical implementation record follows; newer checkpoint above supersedes conflicting authentication/test statements.

# MATCHLATCH handoff — WO-ML-018A

Development branch: `feature/wo-ml-018a-nightly-shopify-sync`.
Base: `feature/wo-ml-017-unified-discovery` at `815e3ca`.

Read `docs/WO-ML-018A-NIGHTLY-SHOPIFY-SYNC.md` before any service activation.
Evidence and remaining gates: `docs/WO-ML-018A-COMPLETION-REPORT.md`.
Draft PR: https://github.com/atravis817/matchlatch/pull/9.
Protected READY Preview: https://matchlatch-nkgaop749-matchlatch.vercel.app.
220 local tests passed with no skips; code commit `458192b` passed GitHub CI.

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
