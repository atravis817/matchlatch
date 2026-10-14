# Session Handoff & Runtime Continuity State

## 0. Incoming Agent Quick Start

### Read This First

- MATCHLATCH — Your style, unlocked. Founder/CEO: Alan Travis.
- Read AGENTS.md, the assigned work order, the full runbook and current [issue #7](https://github.com/atravis817/matchlatch/issues/7) body/comments.
- This governance branch is documentation-only, based on Shopify sync draft PR #9.
- Production and the V1.2 protected Previews are different checkpoints; READY is not customer-flow proof.
- WO-ML-018A is P0: engine implemented, actual Admin import and midnight recurrence BLOCKED.
- The shared 899 variants are private, stale Awin Watches Of USA records, not Shopify inventory.
- Search/Growth owns PR #8 and acknowledged governance ownership; preserve its protected noindex policy.
- Prior sync/search handoffs are archived under docs/handoffs; reconcile their separate evidence.
- No real purchases, main merge, Production release/cron, private live publication or added fees are authorized.

### First Action

Read the latest issue #7 comments and verify the current HEAD of your assigned PR/worktree before continuing its documented prerequisite/ownership work. Do not repeat the baseline investigation unless source state changed.

### Do Not Do

Do not reset, clean, stash, force-push, overwrite or recreate another agent's work. Do not release, migrate, publish, place orders or resume Awin expansion because a handoff exists.

## 1. Repository Identity

- Repository: atravis817/matchlatch; remote: https://github.com/atravis817/matchlatch.git — OBSERVED.
- Governance root: /workspace/scratch/2f90234cd71e/matchlatch-governance; branch: docs/wo-ml-gov-001-handoff — OBSERVED.
- Current HEAD at immutable source inspection, 2026-10-14T15:58:36Z: 086d73f63ab81b75f1b5b246ff8b0bc2119b5be4 — OBSERVED.
- The containing documentation commit cannot self-reference its own hash. Delivery/local/remote SHAs are recorded in the PR/hub/final report; run git rev-parse HEAD and inspect the PR head before continuing.
- Initial upstream: origin/feature/wo-ml-018a-nightly-shopify-sync, a base tracking ref rather than a governance remote head. Read actual final tracking from Git.
- Canonical main: 302fa9c3d83263ca25c3ed6252665fb73f06c569 — OBSERVED after fetch.
- Preserved source worktree: /workspace/scratch/2f90234cd71e/matchlatch; branch feature/wo-ml-018a-nightly-shopify-sync; HEAD 086d73f63ab81b75f1b5b246ff8b0bc2119b5be4; clean at inspection. Its upstream tracks unified-discovery incorrectly; its actual remote sync branch matches HEAD.
- Handoff source audit: 2026-10-14T15:58:36Z / 11:58:36 America/New_York. Delivery self-audit is in docs/WO-ML-GOV-001-ADOPTION-REPORT.md.

## 2. Current Production State

- Production URL: https://matchlatch.company; Vercel alias https://matchlatch.vercel.app.
- Production Git SHA: 302fa9c3d83263ca25c3ed6252665fb73f06c569.
- production_alias_deployment_id_at_verification: dpl_35psQBq1wqGoi72B3A45GgKFGuZ3.
- verified_at: governance audit on 2026-10-14, approximately 15:54–15:57Z.
- Alias resolution/read-back: target production, READY, main SHA above — EXTERNAL_VERIFIED metadata only.
- Root HTTP: 200 and MATCHLATCH markup — PRODUCTION_VERIFIED for root delivery only. Auth/customer/checkout/payment health: NOT RUN / NOT VERIFIED.
- Previous/rollback Production deployment: NOT VERIFIED; never infer it from Git history or a Preview.

### Important Production Differences From Local

V1.2 owner/search/checkout/sync code is ahead of main. Sync/governance work is not deployed to Production. Preview gates are not proof of Production behavior. This session performed no Production release or configuration mutation.

## 3. Git & Workspace State

Both starting worktrees were clean. No staged, unstaged, untracked or relevant ignored files or submodules were returned at initial inspection — OBSERVED. The source worktree remains preserved; governance uses a separate worktree.

### Staged Changes

At preparation: none before explicit delivery staging. Only the eight reviewed documentation files below may be staged/committed for the authorized draft PR. Final delivery commit/status is recorded in the adoption report/hub.

### Unstaged Changes

HANDOFF.md and ROADMAP.md are the existing files changed during preparation. The former was fully inspected and archived before replacement; the roadmap receives a dated note without replacing its stage gates/history.

### Untracked Files

AGENTS.md, IMPROVEMENT_PLAN.md, full runbook, two source archives and adoption report are new authorized files during preparation. Their delivery commits are distinct from this immutable inspection checkpoint. Inspect actual status on entry.

| File | Purpose/completeness/validation | Incoming action |
|---|---|---|
| AGENTS.md | Permanent operating rules; source and Search/Growth rules reconciled; doc audit required | Read at startup; coordinate integration into other branches |
| HANDOFF.md | Complete numbered 0–20 current continuity record | Refresh after major sessions; never erase separate source evidence |
| ROADMAP.md | Dated GOV-001/018A/019 priorities; stage gates preserved | Resolve PR #8 overlap manually |
| IMPROVEMENT_PLAN.md | Evidence-based risks and authorized next improvements | No new release authority |
| docs/runbooks/AGENT-HANDOFF-PROTOCOL.md | Full customized procedure, taxonomy/template/self-audit | Canonical protocol in this draft branch |
| docs/handoffs/2026-10-14-WO-ML-018A-before-GOV-001.md | Exact previous sync handoff | Historical, not current runtime |
| docs/handoffs/2026-10-14-WO-ML-019-source-2c3a504.md | Exact Search/Growth source handoff | Preserve during reconciliation |
| docs/WO-ML-GOV-001-ADOPTION-REPORT.md | Scope, audit, adoption limits and delivery pointers | Review with draft PR |

No app/API/policy/workflow/SQL/credential changes belong here. Temporary test logs under /tmp are reproducible scratch. The older temporary PGlite runtime is absent; no cleanup/reset/replay was performed.

### Relevant Recent Commits

| SHA | Work item | Deployment evidence |
|---|---|---|
| 302fa9c3d83263ca25c3ed6252665fb73f06c569 | Main email-logo checkpoint | Current Production alias READY |
| 815e3ca81a824c0301ed2caa0cf7185f068b5b10 | PR #6 category/subtype/date fixes | Separate workstream base; not current Production |
| 458192bb096b654fd75c42abd4ca57cd1cc3761e | Sync application checkpoint/function-limit repair | Historical protected Preview/local/CI proof |
| 086d73f63ab81b75f1b5b246ff8b0bc2119b5be4 | PR #9 sync evidence follow-up | Current sync Preview READY; CI success verified |
| 4f7ba90a8bd8573eee8196089d4092137b8951f9 | Search application checkpoint | READY protected Preview metadata reverified |
| 2c3a50429000fcef4dd69ea3b412ff7248ef4c46 | PR #8 scoped governance follow-up | GitHub PR head; not equated to earlier app deployment |

PR #6, #8 and #9 are open drafts/unmerged — EXTERNAL_VERIFIED. PR #8/#9 target unified-discovery, not main.

## 4. Work Completed This Runtime

### WO-ML-GOV-001 governance preparation

**Status:** Documentation implementation prepared for draft review; main/all-branch adoption pending.
**Evidence:** OBSERVED repository and complete source-protocol inspection; EXTERNAL_VERIFIED GitHub/Vercel/Supabase read-backs; document self-audit recorded in adoption report.
**Problem:** Short/scoped branch handoffs and shared-file ownership conflicts.
**Implementation:** Permanent rules, full protocol/taxonomy/0–20 format, evidence-qualified current record, archives, roadmap/plan integration.
**Files:** Exact eight-file scope in section 3.
**Tests:** Section 6; no application code/tests changed.
**Production State:** Untouched; read-only root/metadata checks.
**Known Limitations:** Draft rules are not on main or every existing branch; no universal agent receipt claimed.

### Shared coordination

**Status:** Posted selected check-ins and read explicit Search/Growth acknowledgment.
**Evidence:** EXTERNAL_VERIFIED issue comments: outgoing 6172470610; Search/Growth 6172484749; governance acknowledgment 6172529569.
**Implementation:** GOV owns canonical protocol; Search/Growth paused shared governance edits and retains app work.
**Limit:** Other private Work workspaces/processes were not inspected; silence is not inactivity.

## 5. Work In Progress

### WO-ML-018A — dedicated active automation transfer

**Current State:** IMPLEMENTED BUT NOT LIVE-VERIFIED; actual import/recurrence BLOCKED. Preserve draft PR #9, do not rebuild completed software.

**Shopify source:** Code/config target pfcdgt-is.myshopify.com, API 2026-10. Actual Admin identity/scopes: UNKNOWN/BLOCKED. Current effective Preview metadata lacks Admin read credential/version; Storefront config names exist. Earlier owner BASALT S diagnostic is historical reported Storefront access, not a newly verified Admin relationship or rights grant. Supplier/channel/display/image/US-shipping/import/publication relationship remains unverified.

**Catalog baseline:** Fresh shared-project read-back: 899 variants; 899 private; 0 public; 898 advertised in stock; 899 stale; one advertiser 116479, Watches Of USA — EXTERNAL_VERIFIED. Prior source audit reported 0 duplicates/missing variant IDs/images/destinations, categories watch 847/shirt 52; those quality details were not rerun here and remain historical provider evidence. No verified Shopify baseline/eligible count. Variants are not necessarily product counts; 42 discovered Shopify listings are a bounded sample.

**Synchronization engine:** Bounded Admin product/variant pagination, incremental overlap, stable identity/hashes/normalization; SQL proposal supplies atomic page/cursor/counters, completion-only successful watermark, leases/fencing/per-shop locks/daily ledger and retirement retaining references. Fixtures and prior ephemeral PostgreSQL tests prove scoped behavior, not live Supabase. No sync tables exist in the inspected shared public schema.

**Scheduler:** Target midnight America/New_York with DST awareness. Full nightly stock/removal sweep complements incremental mode. Isolated pg_cron/pg_net/Vault tick is proposed; no cron is registered by the proposal. Native Vercel Production cron cannot establish Preview recurrence. Branch write/schedule/publication flags remain false — EXTERNAL_VERIFIED metadata. Last actual successful/attempted run, watermark, cursor/checkpoint, failed batches and retries: UNKNOWN/BLOCKED without isolated runtime access. Fixture run IDs/timestamps must never substitute.

**Publication:** Shared 899 live records remain private; no verified live Shopify approval or publication occurred. Imports never grant visibility. Source/product scope, material hash, current eligibility and rights expiry required before owner review. Founder must explicitly approve live policy/publication. Reversal proposal: stop approved scheduling/writes, revoke visibility in the correct authorized environment, preserve rows/audit history/references; no reversal is performed by handoff.

**Search and styling:** Shared bounded eligible Shopify candidate retrieval for Store/Studio under phase flag; category/subtype/size/color/brand/budget/freshness gates tested. Nine slots and zero new spend for self-recorded owned items preserved. Shopify external-model processing disabled. No populated/authenticated live Shopify search or Studio flow verified; missing categories cannot be quantified without source baseline. Snapshot stock/price is not guaranteed US sellable inventory, fit or delivery. Checkout needs separate merchant/variant/source revalidation.

**Outstanding activation dependencies:** Missing protected Admin token/version, isolated Preview database URL/key/destination authorization, source rights/supplier/channel/image/display/shipping evidence and policy, scheduled-job/protection configuration, proposed SQL on the correct isolated destination, actual scheduled completion/recovery/security advisors/PostgREST proof, monitoring/alerts and throughput/cost measurements. No added fee authorized.

**Files Involved:** Existing sync modules and reports, owner API, internal catalog, style/catalog APIs and proposed SQL. This session changes none.
**Next Exact Step:** Coordinate missing access/destination authorization through issue #7; when provisioned, perform authorized read-only identity/scopes/count verification and existing dry-run baseline.
**Do Not Repeat:** Do not reimplement engine, relabel Awin data or infer actual nightly automation.

### WO-ML-019 — Search/Growth

**Current State:** PR #8 protected foundation; public effectiveness remains unverified.
**Completed:** Agent reported metadata/entity graph, accurate beta answers, protected noindex/custom 404 and 196 local tests. This governance audit verified GitHub head and earlier READY deployment, not those tests/rankings.
**Remaining:** Schema/content/accessibility, signed-in/browser/Safari/performance and external discoverability verification. Repository rubric scores are not search performance.
**Files:** Search architecture report, vercel/robots/sitemap/HTML assets on PR #8, not this branch.
**Important Context:** AGENTS/HANDOFF/ROADMAP overlap; Search/Growth explicitly paused shared edits and acknowledged canonical governance ownership.
**Next Exact Step:** Scoped search verification; reconcile evidence with governance draft after link is posted.
**Do Not Repeat:** Do not duplicate search app changes, alter protected noindex or promote it unchanged into public Production.

## 6. Validation Matrix

| Validation | Exact command/source | Result/checkpoint | Evidence |
|---|---|---|---|
| Current local suite | node --test scripts/test-*.mjs | 213 counted; 212 passed, 0 failed, 1 skipped; about 15:55:56Z on 2026-10-14, source 086d73f | LOCAL_VERIFIED unit/internal fixture assertions |
| Prior complete sync suite | Same command with MATCHLATCH_PGLITE_MODULE selecting pinned PGlite 0.5.9 | Historical 220 passed, 0 failed, 0 skipped | Historical LOCAL_VERIFIED, not today's result |
| Sync remote CI | GitHub run 38584165456, full SHA 086d73f63ab81b75f1b5b246ff8b0bc2119b5be4 | Completed success, SQL-runtime/full-suite steps included | EXTERNAL_VERIFIED CI only |
| Static audit | node scripts/audit.mjs | Passed this session | LOCAL_VERIFIED |
| Commerce policy | node scripts/check-commerce-policy.mjs | Passed; reviewed 2.0.0 unchanged | LOCAL_VERIFIED |
| Governance scope/links/sections | Document audit and git diff --check, adoption report | Final audit recorded there | OBSERVED / LOCAL_VERIFIED |
| TypeScript / ESLint | NOT RUN | No configured toolchain discovered | OBSERVED setup |
| Production build/deploy | NOT RUN | No app changes or Production authorization | Authorization boundary |
| Browser/E2E/device | NOT RUN this session | Prior authenticated/browser/device blocks unresolved | BLOCKED |
| Shopify Admin/nightly recurrence | NOT RUN | Protected source/runtime config absent | BLOCKED |

### Known Failures / Warnings

Older temporary PGlite dependency no longer exists. The SQL parent suite is skipped and its seven nested tests are not counted, explaining 213 versus historical 220. Do not conceal skips or reuse old totals. A docs-only session does not justify replaying live operations or creating services for better-looking evidence.

## 7. Database & Migrations

### Current Database State

Shared project odxqxymwlwnbqginqems has nine inspected public tables: matchlatch_records, matchlatch_private_profiles, matchlatch_catalog_staff, matchlatch_ai_usage, matchlatch_refresh_requests, matchlatch_awin_partners, matchlatch_awin_products, matchlatch_awin_import_batches, matchlatch_awin_import_runs. All have RLS enabled — EXTERNAL_VERIFIED metadata, not complete policy/account-isolation tests. Shopify sync/products/publication objects absent from inspected public schema. Shared DB is not isolated Preview.

### Migrations Created This Runtime

None. Existing PR #9 proposals are preserved:

| File | Local | Staging | Production | Notes |
|---|---|---|---|---|
| supabase/PROPOSED_shopify_sync.sql | Historical ephemeral PostgreSQL tested; not rerun | NOT VERIFIED; isolated DB unconfigured | Not applied by this workstream; absent from inspected shared public schema | Proposal is not migration-history proof |
| supabase/PROPOSED_shopify_preview_scheduler.sql | Specified SQL | No real registered/ticked job verified | NOT AUTHORIZED | Defaults disabled |
| Other existing Awin/account SQL | Files/tables observed | Individual migration history NOT VERIFIED | Individual history NOT VERIFIED | No reapplication/remediation during freeze |

### Pending Database Work

After destination/cost/authorization confirmed, inspect isolated schema, validate proposed SQL/security advisors/PostgREST and dry run before authorized test writes. No live DDL/backfill/schedule was performed. Destructive rollback is not a handoff action; preserve identities/history.

## 8. Deployment & Infrastructure

### Production

Section 2 records exact metadata/root scope. Project prj_k6FeB5PgkTY2EvNx19XHpDZwPSgS; team team_kE5wukL6su7GeYNSfb3z39No. Latest deployment does not imply Production alias.

### Preview

| Workstream | Exact deployment and SHA | Scope |
|---|---|---|
| PR #9 sync | dpl_8DH5XH6nUmDWdThs5wAvgqP7kRm7; 086d73f63ab81b75f1b5b246ff8b0bc2119b5be4; https://matchlatch-1pxrlb8hf-matchlatch.vercel.app | READY target null/Preview reverified; prior denied/config-empty HTTP tests remain historical |
| PR #8 search app | dpl_EzyVZcvRecvkzt264v8XfQUTHXvR; 4f7ba90a8bd8573eee8196089d4092137b8951f9; https://matchlatch-pti523o0k-matchlatch.vercel.app | READY Preview metadata; distinct from later PR head |
| Governance | Docs-only isolated branch | No explicit deployment invoked; Git may automatically build Preview, which proves no runtime flows |

### Environment / Configuration Changes

None this governance session. Sync branch metadata reverified: MATCHLATCH_SHOPIFY_FIRST_PHASE true; MATCHLATCH_SHOPIFY_PREVIEW_WRITES_ENABLED, MATCHLATCH_SHOPIFY_PREVIEW_SCHEDULE_ENABLED, MATCHLATCH_SHOPIFY_PUBLICATION_ENABLED false. MATCHLATCH_ADMIN_USER_ID exists; no identifier value copied here. Effective Preview has SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_API_VERSION, SHOPIFY_STOREFRONT_PRIVATE_TOKEN, shared Supabase names.

Missing at audit: SHOPIFY_ADMIN_READ_TOKEN, SHOPIFY_ADMIN_API_VERSION, MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL, MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY, MATCHLATCH_SHOPIFY_SYNC_SECRET, MATCHLATCH_SHOPIFY_PUBLICATION_POLICY. Protected scheduler also needs a separately authorized Vercel-protection credential. Governance reads only metadata, copies no secrets/owner mappings and changes no flags.

### CI/CD

Existing v12-quality workflow preserved. Sync CI success verified; governance base/push branch may not match its allowlist, so absent governance CI is NOT VERIFIED. No workflow edits just to beautify documentation evidence. Static JS/serverless app stays unchanged, including prior Hobby 12-function consolidation.

### Rollback

Leave draft/source branches and archives intact; coordinate any documentation revert. Production rollback target unverified. Scheduler/visibility reversal is a separate owner-authorized operation in its correct environment.

## 9. External Integrations

| Provider | Purpose / status / evidence | Config names/location | Limits / remaining action |
|---|---|---|---|
| GitHub | Source, PRs, hub; EXTERNAL_VERIFIED | Repository, issue #7; private connector auth | No direct Work-tab delivery; read/receipt needed |
| Vercel | Production/Preview metadata; Production root delivery verified | Project/team above; protected server envs | READY is not auth/catalog/checkout proof |
| Supabase | Shared source/tables/RLS flags read back | MATCHLATCH_SUPABASE_URL, MATCHLATCH_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY; future isolated names above | Full RLS behavior/live sync not proven |
| Shopify own store | Import direction; reader implemented/tested | Storefront names present, Admin names missing | Identity/scopes/count/rights BLOCKED |
| Shopify Global Catalog | Separate bounded discovery sample on PR #6 | Agent profile/existing adapter | Own profile hosting/session/commercial rights unresolved; 42 is no total |
| Awin | Existing code/accounts/data preserved, expansion frozen | Existing API/feed/publisher names only, no values | Stale private catalog; no new import/remediation/attribution |
| External AI | Existing beta services distinct from Shopify processing | Existing server-only Preview model key names | Shopify candidate processing disabled; no new model call here |

## 10. Architecture & Product Decisions

### Decision 1 — product continuity

**Decision:** Brand/tagline, five destinations/centered Studio, forest-green/minimal GreenGlass navigation, nine slots and owned-item zero new spend preserved.
**Rationale:** Established Founder identity; governance is no redesign.
**Status:** Founder directive and existing code observed.
**Constraint:** Do not rename stages or change UI during GOV-001.

### Decision 2 — source/rights separation

**Decision:** Own-store ingestion, Global Catalog, Awin, publication, model processing and merchant checkout remain separate.
**Rationale:** Actual provenance differs; API visibility is not rights approval.
**Status:** Active WO-ML-018A direction, live acceptance blocked.
**Constraint:** No relabeling 899, title-only deduplication, public/model/checkout elevation from token access.

### Decision 3 — governance ownership

**Decision:** GOV-001 owns full protocol; PR #8/#9 keep separate branch runtime evidence until reconciled.
**Rationale:** Avoid loss/conflicting shared edits.
**Status:** Search/Growth acknowledgment read; main integration pending.
**Constraint:** Preserve archives, reconcile overlapping lines not entire-file replacements; retain original V1–V4/unpassed gates.

### Decision 4 — reliable synchronization

**Decision:** Midnight Eastern/DST, overlap plus full stock/removal sweep, atomic checkpoints/fencing/private defaults/retirement.
**Rationale:** Avoid duplicates, stale claims and incomplete-scan deletion.
**Status:** Scoped tests/proposals, actual recurrence blocked.
**Constraint:** No blind retry of ambiguous mutations or early watermark; no unapproved paid queue.

## 11. Security, Privacy & Data Integrity Invariants

- No credentials, signed secret-bearing URLs, customer PII/private photos in docs, PRs or logs.
- Preserve RLS/account isolation/private storage; flags alone are insufficient behavior proof.
- No public indexing of authenticated Closet/customer/private/evaluation/merchant-only records.
- Preserve exact source/product/variant identity and genuine supported merchant destination.
- Import/display/model/recommendation/checkout permissions never substitute for one another.
- Keep honest budget/stock/tax/shipping/delivery, zero new spend for owned items, and no speculative coupon reductions.
- No payment-card capture or real orders/payments; purchase-disabled controls remain unchanged.
- No unsafe resets/cleanup/force-push or copying shared/Production credentials into isolated Preview.
- Preserve idempotency, transactional checkpoints/completion watermarks and retirement without deleting saved references.
- Protected noindex and engineering rubric are not proof of public rankings/AI visibility.

## 12. Known Risks & Technical Debt

| ID/severity | System / failure / evidence | Impact / mitigation | Permanent fix / authorization / blocker |
|---|---|---|---|
| GOV-1 P0 | Shared docs overlap PR #8/#9; separate heads/acknowledgment verified | State loss/restarts; isolated branch and exact archives | Hub-coordinated reconciliation; main merge not authorized |
| SOURCE-1 P0 | 899 stale Awin records could be mislabeled Shopify/public; provider read-back | False availability/publication; provenance/private gates | Actual Shopify audit; Admin/DB BLOCKED |
| SYNC-1 P0 | Engine exists without actual run/watermark/cron proof | Missed imports/false automation; flags disabled | Real isolated recurrence/recovery/alerts; no Production approval |
| RIGHTS-1 P0 | Supplier/channel/image/display/US-shipping unverified | Restricted/ineligible offers; keep private | Evidence and exact Founder policy/publication decision |
| PRIVACY-1 P0 | RLS enabled but cross-account runtime not retested | Potential exposure if policies wrong; preserve existing guards | Authorized account/storage tests; no broadening |
| SEARCH-1 P1 | Protected noindex could block public indexing if promoted unchanged | Discovery regression; protected scope retained | Reviewed environment-aware release policy; Production gated |
| EVIDENCE-1 P1 | SQL skip differs from old full count | False completion; disclose 212+1 skip vs 220 historical | Pinned runtime when app SQL verification needed |
| RELEASE-1 P1 | Main/Preview differ; READY could be overgeneralized | Untested auth/checkout release; exact SHA/environment labels | Actual acceptance and explicit release approval |

## 13. Authorized Next Work

### Priority 1 — coordination and prerequisite availability

**Objective:** Read current hub/assigned PR and coordinate missing WO-ML-018A Admin/isolated DB prerequisites.
**Why Now:** Live acceptance is blocked; do not rebuild completed code.
**Prerequisites:** Current ownership/work-order evidence and owner-scoped access provisioning.
**Likely Files:** Existing sync reports/modules and proposed SQL for inspection only.
**Constraints:** Read-only identity/scopes/count audit; no secret output/shared DB write/fee/flag activation.
**Definition of Done:** Exact configured/missing inventory and permitted source read-back, with reviewable dry-run plan posted to hub.
**Required Verification:** EXTERNAL_VERIFIED where accessible; BLOCKED otherwise.
**Stopping Point:** Stop the restricted operation; continue independent authorized work.

### Priority 2 — governance/search handoff reconciliation

**Objective:** Review GOV draft alongside PR #8 scoped instructions and PR #9 runtime state.
**Prerequisites:** Current heads and hub ownership check-in.
**Likely Files:** Eight governance docs and other branch's scoped checklist/handoff.
**Constraints:** Preserve source sections/evidence; no app/SQL/workflow changes.
**Definition of Done:** Reviewed non-conflicting integration plan/draft; no main merge.
**Verification:** Full reread, links/sections/scope/secret audit; preserved source clean at original checkpoint.
**Stopping Point:** Obtain exact integration/release approval only when concrete reviewed work is ready.

## 14. Investigation Only

Research Admin scopes/schema, isolated DB/scheduler/costs, rights, monitoring/live search acceptance and environment-aware public indexing. Investigate larger-catalog scaling after measured throughput. Research authorizes no service creation/fees, live SQL, webhook activation, publication or Production. Awin remains frozen.

## 15. Blocked / Requires Human Action

| Item | Blocker | Required human/external action | Resume condition |
|---|---|---|---|
| Admin read | Protected credential/version/relationship absent | Owner provisions least-privilege access securely, no keys in chat | Shop identity/scopes verified read-only |
| Isolated DB | Separate destination/access/authorization absent | Confirm authorized project/cost and protected credentials | Isolation/access verified, no Production secret copy |
| Publication | Source/supplier/channel/image/display/shipping evidence absent | Founder approves exact evidenced policy/action | Current scoped eligibility and explicit authorization |
| Midnight recurrence | Isolated scheduler and actual completion unverified | Authorized protected non-Production setup/observation | Genuine successful tick/checkpoint/day deduplication |
| Browser/device/auth | No current permitted authenticated/physical evidence | Test-account/device access | Actual flows observed without purchases |
| Main-wide governance | Draft not integrated on main/all branches | Review and explicitly authorize intended integration | Exact approved PR/checkpoint, no automatic merge |

## 16. Explicitly Frozen / Not Authorized

Main merge; Production deploy/rollback/cron; private live publication; orders/payments; added fees; live supplier/merchant visibility/agreements; webhook activation without required authorization; Awin import/expansion/remediation/attribution activation; unrelated app edits in GOV-001. Preserve existing records/code/accounts.

## 17. Commands & Operational Reference

From the intended worktree: git rev-parse --show-toplevel; git remote -v; git branch --show-current; git rev-parse HEAD; git rev-parse --abbrev-ref --symbolic-full-name '@{u}'; git status --short --branch; git diff --name-only; git diff --cached --name-only; git log -10 --oneline; git worktree list; git diff --check.

Validation: node --test scripts/test-*.mjs; node scripts/audit.mjs; node scripts/check-commerce-policy.mjs. SQL requires CI-pinned PGlite 0.5.9 and MATCHLATCH_PGLITE_MODULE; absence is skipped.

Read issue #7, PR heads/state, exact Vercel alias metadata and permitted schema read-backs. No reset/clean/stash/force-push/deploy/SQL mutation command is a resume instruction.

## 18. Key Files & Navigation Map

| File/directory | Purpose / why it matters |
|---|---|
| AGENTS.md / full runbook | Permanent startup/handoff procedure in governance draft |
| HANDOFF.md / docs/handoffs | Current continuity + preserved branch evidence |
| ROADMAP.md / IMPROVEMENT_PLAN.md | Release gates/current priorities/authorized improvements |
| docs/WO-ML-018A-*.md | Implementation/baseline/activation blockers |
| lib/shopify-sync*.mjs / api/admin-summary.mjs | Existing engine/store/owner/scheduled paths, function limit preserved |
| lib/shopify-internal-catalog.mjs / catalog/style APIs | Shared candidate and source/privacy/model gates |
| supabase/PROPOSED_shopify*.sql | Proposals, not proof of live migration or job |
| scripts/test-shopify-sync*.mjs / quality workflow | Fixture/SQL assertions and pinned CI runtime |
| policies/commerce-policy.json / checkout modules | Permanent purchase/source restrictions |
| PR #8 search architecture/robots/sitemap/vercel assets | Other branch only; reconcile protected indexing policy explicitly |

## 19. Assumptions Requiring Verification

- ASSUMPTION: Code target/Storefront credentials cover intended Shopify imports; actual Admin identity/scopes/count/rights unverified.
- ASSUMPTION: Isolated DB/scheduler can be provisioned within approved costs; no project/fee permission inferred.
- ASSUMPTION: READY/head metadata means auth/customer/checkout works; rejected pending direct runtime proof.
- INFERENCE: Shared schema cannot supply sync job state because objects absent; this proves nothing about every possible other project.
- ASSUMPTION: Historical source/browser/quality evidence remains current; retain timestamp and recheck when state changes.
- ASSUMPTION: Every Work agent read hub/docs; only recorded Search/Growth response proves that specific receipt.
- ASSUMPTION: Permanent rules already installed on main/all branches; draft adoption only.
- INFERENCE: Governance app tree unchanged from base; verify diff/current incoming HEAD before relying on it.

## 20. Final Continuity Checklist

- Repository/remotes/worktrees/source checkpoint/main inspected; delivery SHA must be resolved from Git/PR/hub.
- Starting dirty state captured; only eight authorized docs may differ; final source preservation checked in adoption report.
- Relevant commits/draft PRs/Production-vs-Preview targets recorded; root HTTP proof narrowly scoped.
- Complete source read, sections 0–20 retained, scoped Search/Growth instructions reconciled.
- Current counts/skips separated from historical CI; no live Admin/schedule/checkout completion claimed.
- Shared source/RLS/schema read back; proposed SQL not represented as applied live.
- Config names/non-secret flags only; no credentials/customer data.
- Decisions/invariants/risks/authorized/frozen work explicit; one first action in section 0.
- Full reread/self-audit/final status results recorded in adoption report and issue #7.

### Handoff Integrity Statement

This record comes from actual repository/workspace and permitted external inspections. Unverified items are historical/time-scoped evidence or explicitly UNKNOWN, NOT RUN, NOT VERIFIED, ASSUMPTION, INFERENCE, BLOCKED or DECISION_REQUIRED. Prefer newer direct evidence after the audit time. Handoff creation and delivery authorize no release, migration, publication or transaction.
