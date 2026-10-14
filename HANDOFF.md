## WO-ML-018C — 2026-10-14 current database checkpoint

BLOCKED: only shared project odxqxymwlwnbqginqems visible; no isolated project authorized/identified and both MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL / MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY absent. Writes/publication/schedule flags false. Full exact setup, key compatibility constraint, migration scope, read-only validation, recovery and provisioning approval packet: docs/WO-ML-018C-DATABASE-READINESS.md. Read-only order does not authorize even durable dry-run bookkeeping. Shopify authentication remains separately unverified; database error is not authentication proof. Next milestone: Founder supplies only non-secret authorized isolated project identity, or separately approves a reviewed creation plan/cost. No infrastructure, SQL, imports or application changes performed; no tests rerun for docs only. Prior verification records below remain historical.

## WO-ML-018B-V1 — BLOCKED (2026-10-14 22:07 UTC)

EXTERNAL_VERIFIED configuration metadata: SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (Sensitive), SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_API_VERSION exist for Preview branch feature/wo-ml-018a-nightly-shopify-sync. Values were not read; presence does not prove correctness. SHOPIFY_ADMIN_READ_TOKEN absent. Writes/schedule/publication flags all false. A second Preview-wide SHOPIFY_CLIENT_SECRET entry exists; branch-specific entry is present; no configuration mutated.

Latest sync-branch Preview: https://matchlatch-8q0um6p8d-matchlatch.vercel.app, dpl_6Y5yiqS6AEvEYmzzD7jdkyH1rvSS, READY, commit 4724cb551aa197f2d69613dfcfba0ba1019ad19e. Latest overall Preview is instead https://matchlatch-b26erbvaq-matchlatch.vercel.app, dpl_3NQKhmWeEvdVxEmbLJrLPRkReskk, source main 302fa9c3d83263ca25c3ed6252665fb73f06c569. Thus the reported redeploy is not a verified redeploy of the authentication implementation with the newly saved settings.

Read-only GET to sync-branch /api/admin-summary?action=shopify-sync-auth returned HTTP 403 {"error":"Forbidden"} without an owner session. This verifies the owner gate only; token exchange, shop identity, API version, scopes, sampleProducts and hasMore are NOT VERIFIED (no count invented). No owner session is available through the connector; deployment protection access is not MATCHLATCH owner authentication.

Exact next milestone: Vercel → MATCHLATCH → Deployments → select deployment 6Y5yiqS6AEvEYmzzD7jdkyH1rvSS (branch feature/wo-ml-018a-nightly-shopify-sync, commit 4724cb55) → Redeploy to Preview with current environment. Do not select main or Production. Open that new Preview, sign in as the existing MATCHLATCH owner, then run the same-origin read-only check using the browser's existing session. Never copy tokens/secrets to chat.

No code/test changes, secrets read, database writes/migrations, scheduling/publication activation, Production changes, merge, purchase, spending or Awin work. Prior unit/CI results remain historical. Local source 7b1540d45570a95350852bc0a1783434177933ed has identical tree to remote 4724cb55; initially clean. Only HANDOFF.md updated this session; governance worktree preserved. Current canonical governance record in PR #10 read.

Owner action (Preview browser console, after owner login; reads existing session without printing it):

```js
await (async () => {
 const cfg = await (await fetch('/api/auth-config', {cache:'no-store'})).json();
 const {createClient} = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
 const client = createClient(cfg.url, cfg.publishableKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const {data} = await client.auth.getSession();
 if (!data.session) return console.log('Sign in as the MATCHLATCH owner on this Preview first.');
 const response = await fetch('/api/admin-summary?action=shopify-sync-auth', {headers:{Authorization:'Bearer '+data.session.access_token},cache:'no-store'});
 console.log({status:response.status,result:await response.json()});
})();
```

---

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
