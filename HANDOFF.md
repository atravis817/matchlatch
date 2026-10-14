## Current runtime checkpoint — database status PASS

WO-ML-018E runtime database PASS — Founder returned owner-only Sync status from refreshed sync Preview https://matchlatch-3yrc5q4xv-matchlatch.vercel.app/admin.html ; dpl_3trzNfnPp2qnxtCcxqaDaYq2RD1p ; f5f3f91a819dfc8a362e6a3afecce764ce05a31a. Catalog 0 products/0 variants; private/public/approved/blocked/stale=0. Preview scheduler Disabled; last successful run None; no run recorded; Production enabled No. Evidence: Founder-observed sanitized UI result, combined with verified exact-branch redeploy after key update. This establishes owner status plus deployed service-role read/counts success, not full import, recurrence or Shopify authentication. Prior 401 was on pre-key-update deployment; no replacement-key failure now claimed. Shopify auth remains separately NOT VERIFIED; next milestone is existing owner-only GET shopify-sync-auth on this exact Preview, using reviewed snippet in PR comment 6179545202. No sync/dry run/import/publication/schedule/SQL/Production/merge action authorized or executed.

---

## Current owner diagnostic result — database credential rejection

WO-ML-018E-V4 owner-returned diagnostic evidence on diagnostic Preview f63eae29: previewEnvironment/urlPresent/keyPresent/urlValid/expectedIsolatedDestination/configurationGuardPassed=true; shared/customer-auth collision=false; keyWhitespace=false; legacyServiceRoleKey=false; keyProjectMatches=false; databaseUnauthorized=true; forbidden/objectUnavailable/providerFailure=false. Evidence is Founder-returned sanitized output, not connector-owned session. Conclusion: guard/isolation checks pass; downstream database rejects credential with HTTP 401. Saved value is not recognized as a legacy service_role JWT for lqxeizvrdxuhzvipmlkl. Its exact type is UNKNOWN (could be modern secret, wrong key type or malformed value); do not infer or request secret. Corrective action: Founder replaces only branch-scoped MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY with isolated project's Settings → API Keys → legacy service_role JWT; mark Sensitive. Do not use anon/publishable, database password, Shopify secret or shared key. If only sb_secret is offered, report only that key type and stop for adapter compatibility work. Redeploy exact sync branch only after correcting this established credential issue, then owner Sync status. No new SQL/import/dry run/publication/schedule/Production action. Shopify auth remains separate/unverified.

---

## WO-ML-018E-V4 — diagnostic repair checkpoint

Verified current-Preview error cannot establish guard failure: GET catches all configuration, network, REST and JSON errors with the same message. Fixed misleading error classification; owner-only Sync status now returns/displays boolean-only runtime environment/presence/URL validity/expected isolated destination/customer-auth collision/key-shape and REST failure diagnostics. No credential, decoded claim or raw provider body is returned. Key-shape/project booleans are inspection, not cryptographic validation. Existing owner/Preview/isolation guards retained; customer-auth collision also checks SUPABASE_URL alias. No flags, credentials, SQL or data changed. LOCAL_VERIFIED 230 passed, 0 failed, 0 skipped with pinned PGlite 0.5.9; static audit/policy/diff checks passed. Underlying deployed DB failure remains unestablished until owner runs Sync status on this exact diagnostic build. No blind redeploy requested; this build contains a reviewed diagnostic fix. Next: collect owner-visible boolean result, repair only established cause, then validate zero-count status. Shopify auth separate/unverified. No sync/dry run/import/publication/scheduler/Production/merge authorization.

## WO-ML-018E-V1 — 2026-10-14 current runtime evidence

WO-ML-018E-V1 — database runtime BLOCKED; Shopify auth BLOCKED independently. Configuration metadata PASS: isolated URL and Sensitive service key present, Preview-only branch feature/wo-ml-018a-nightly-shopify-sync; additional Preview-wide key entry observed but unchanged. Writes/publication/schedule flags false. Values not read; runtime target/project and key validity not proven by names. Direct SQL to lqxeizvrdxuhzvipmlkl confirms zero products/variants/public/private/jobs and no anon/authenticated SELECT grants (database-layer PASS, not deployed REST proof).

Latest sync branch READY: https://matchlatch-cv86ufsho-matchlatch.vercel.app ; dpl_9oTbSSHSAM94vYJkJN48AWsoWfmQ ; c1a8f3a6715f9c90cc39bb0d86866a86e7251b6e. Newest overall redeploy: https://matchlatch-53wtx1k49-matchlatch.vercel.app ; dpl_7KscmcHfzZ3vG2uDaJQpNtYPLG8x ; main 302fa9c3d83263ca25c3ed6252665fb73f06c569. Thus new configuration is not proven loaded into the sync implementation. Owner sign-in is Founder-reported and not exposed to this connector. Sessionless status check returned 403 Forbidden, proving only owner gate; no Shopify failure inferred.

Next milestone: select the deployment explicitly labeled feature/wo-ml-018a-nightly-shopify-sync, redeploy Preview with current variables, open that new Preview and sign in as MATCHLATCH owner. In /admin.html click Sync status (read-only, never Run Sync Now or Dry-run), and run independent auth snippet from PR comment 6179545202 on the same Preview. Return sanitized status/counts and auth result only; never credentials/session values. No sync/dry run/migrations/config changes/publication/scheduling/Production/merges performed.

---

## WO-ML-018E — 2026-10-14 runtime checkpoint

WO-ML-018E — DB runtime BLOCKED; Shopify auth separately BLOCKED. Current Vercel metadata still has neither MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL nor MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY; writes/publication/schedule flags false. No credentials read or changed. Latest verified READY sync-branch deployment https://matchlatch-pwuq4pfkz-matchlatch.vercel.app / dpl_86w4t9tM2zdxnzx3DFeWM4DMNn4u / f34b9e3e1825c5d4f5f737528fa49674459d57ed. Direct isolated DB read-back reconfirms all counts/jobs/state/seen/audit zero and no anon/authenticated table SELECT grants; this is not deployed service-key/REST proof. No MATCHLATCH owner session is available to execute owner status or independent Shopify auth. Next milestone: Founder saves the two values from WO-ML-018E directly in Vercel (Preview only, exact sync branch; legacy service_role JWT Sensitive), redeploys correct branch, and signs in as owner. Then validate GET shopify-sync-status and shopify-sync-auth separately. No sync/dry run or other mutations authorized/performed.

---

## WO-ML-018D — schema installation PASS, 2026-10-14

Founder approval “Approve” received in the explicit WO-ML-018D approval context. Exact destination lqxeizvrdxuhzvipmlkl reconfirmed MATCHLATCH-SHOPIFY-PREVIEW, ca-central-1, ACTIVE_HEALTHY; empty application baseline captured in docs/WO-ML-018D-EMPTY-BASELINE.md before execution. Local and GitHub SQL blob matched a5af019bc8da9323a640f2bf3f54065b21d37634.

LOCAL_VERIFIED: pinned @electric-sql/pglite 0.5.9, MATCHLATCH_PGLITE_MODULE=/tmp/matchlatch-sql-018d/node_modules/@electric-sql/pglite/dist/index.js node --test scripts/test-shopify-sync-sql.mjs: 8 passed, 0 failed, 0 skipped. Covers rollback/checkpoints, permissions, fencing, publication rejection/revocation and daily deduplication in ephemeral DB only.

EXTERNAL_VERIFIED: applied exact unmodified SQL once through apply_migration, name wo_ml_018d_shopify_sync_schema, migration version 20261014225422, success=true. Read-back: five tables, RLS true on each; three security-invoker functions; anon/authenticated SELECT and function EXECUTE false, service_role true. Ten total indexes including PK/unique indexes (four explicit secondary indexes). All product counts, jobs, state, seen and audit rows zero; auth users zero.

Security advisor: five INFO rls_enabled_no_policy notices, one per intentionally server-only table. This is consistent with revoked client grants and no client policies; do not add public policies to silence it. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy . No other security findings returned.

Limits: live PostgREST/owner status not verified; Vercel database credential configuration remains unauthorized/unperformed. No synthetic/live data writes after schema install, imports, publication, scheduling, purchases, merge, Production or Awin changes. Shopify authentication separately unverified. Recovery baseline is catalog evidence, not provider backup/PITR; post-commit reversal remains separately authorized.

Next milestone: separately authorize secure branch-scoped Preview database URL/service-key configuration, then read-only REST/owner-status validation. Do not run import/dry-run ledger or activate flags.

---

## WO-ML-018C-V3 — current destination checkpoint

2026-10-14: lqxeizvrdxuhzvipmlkl independently verified MATCHLATCH-SHOPIFY-PREVIEW, ca-central-1, ACTIVE_HEALTHY, same Free organization; distinct host from shared/customer-auth odxqxymwlwnbqginqems. Inspected public schema/routines, auth users, storage objects, subscriptions, foreign servers and Realtime tables all zero; security advisor no lints. No exhaustive external dependency or billing/backup/API exposure proof claimed. Preview DB variables absent; three activation flags false. Read-only inspection only; first metadata query error corrected with successful query. Exact SQL blob a5af019bc8da9323a640f2bf3f54065b21d37634 and gated validation/recovery/config table/approval request: docs/WO-ML-018C-V3-DESTINATION-APPROVAL.md. No migration, imports, configuration, publication, scheduler, Production or Awin changes. Shopify auth separately unverified. Next: exact-destination migration approval after reviewing packet; no approval inferred. Prior records below are historical and superseded where contradictory.

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
