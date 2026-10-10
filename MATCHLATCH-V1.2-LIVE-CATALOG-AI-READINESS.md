# MATCHLATCH V1.2 live catalog and AI readiness

Verified October 10, 2026. Development branch: `design/v1.2-studio-first-100926`.

**Status: private ingestion and grounded retrieval verified; recurring refresh and live OpenAI testing remain blocked by credential/scheduler provisioning. The storefront is not ready for publication.**

## Verification table

| Area | Result | Evidence / limitation |
|---|---|---|
| Full feed discovery and decoding | PASS | HTTP 200; directory 570 entries; feed 102556 returned 899 rows; GZIP 144,440 bytes, decoded 1,472,011 bytes |
| Field validation | PASS | 899 accepted, zero duplicates and zero rejected rows in this snapshot; missing sizes retained as unknown |
| Initial full private import | PASS | Run `6264b2aa-7d03-4a8e-ae30-f2f382e0f412`: 874 inserted, 25 updated |
| Immediate idempotence test | PASS | Run `6b47eb0f-c14f-45d1-815c-85ba00f0bbe4`: 899 unchanged, zero inserted/updated |
| Fresh independent server refresh | PASS | Run `3f05b28e-7a24-45be-9455-55121fb2679f`, 17:29:46–17:29:47 UTC: 899 unchanged, nine batches, succeeded |
| Actual database readback | PASS | 899 total; 898 available; zero public; all USD, HTTPS images and publisher attribution |
| Price/stock updates, retry/resume/removal | PASS | `scripts/test-awin-database.sql` executed against Supabase; all controlled mutations rolled back |
| Anonymous visibility | PASS | Actual anonymous Data API returned zero rows; anonymous database-role test also returned zero |
| Staff retrieval | PASS | Authenticated database-role test with the authorized staff subject successfully queried the bounded private RPC |
| API guest access | PASS | Real server environment: public catalog 200 with no products; private catalog 403; styling 401 |
| Grounded styling on real inventory | PASS | Actual retrieved watch records selected under budget; outfit marked incomplete with shirt/pants/shoes missing |
| Live OpenAI request / vision | BLOCKED | Separate Preview key is not provisioned; zero actual model calls |
| Structured model adapter | PASS, synthetic | Mocked strict JSON response accepted supplied IDs; fabricated IDs rejected; this is not a live AI result |
| Monthly application budget | PASS | Transactional test signals at $3 and refuses reservations exceeding $5; all usage fixtures rolled back |
| OpenAI project budget and account alert | BLOCKED | Connected tools cannot create a provider project/key or configure account budgets |
| Scheduled feed refresh | PREPARED, INACTIVE | Direct Node Actions workflow committed; no recurring schedule was activated |
| Expiration maintenance | ACTIVE | Supabase cron `matchlatch-catalog-maintenance`, `37 * * * *`; not a feed refresh |
| Browse / Studio browser integration | IMPLEMENTED, VISUAL QA BLOCKED | Controls and real retrieval wired; Chromium installation failed with truncated/non-ZIP download; no passing screenshots claimed |
| Signed-in browser save / favorites | UNTESTED | Save uses owner-authorized records and live product revalidation; existing Closet favorites remain available; live browser session QA pending |
| Syntax / regression tests | PASS | Static audit; nine new styling/security tests; ten importer tests; public policy, delivery, curation and Awin integration suites |
| Production | UNCHANGED | Latest Production still `dpl_35psQBq1wqGoi72B3A45GgKFGuZ3`, main SHA `302fa9c3d83263ca25c3ed6252665fb73f06c569` |

## Inventory and authorization

Source: Watches Of USA, advertiser `116479`, feed `102556`, publisher `3118944`. Current membership is **Not Joined**. Download accessibility is permission to perform the authorized private development test, not evidence of publication permission, commission eligibility, or US delivery suitability. Partner browsing/checkout remain disabled. Joined advertisers ZazzMode and Cacio Pepe did not have downloadable legacy feeds in the inspected directory.

The directory's source timestamp is `2026-10-10 09:01:57` UTC; last checked `14:34:38`. Import selection uses current validated rows rather than hardcoding 899. The default full-import safety ceiling is 10,000 products and fails closed if exceeded.

| Database field | Actual result |
|---|---|
| Rows | 899 |
| Available / unavailable | 898 / 1 |
| Public / private | 0 / 899 |
| Price range | $89.99–$1,349.99 USD |
| Missing size | 899 |
| HTTPS image URLs | 899 |
| Publisher-attributed affiliate URLs | 899 |

Representative database records: Emporio Armani AR11523 Women's Watch, $89.99; Emporio Armani AR11524 Women's Watch, $98.99; Diesel DZ4530 Mens Watch, $111.99. Each has blank size, stock status `1`, an HTTPS `images2.productserve.com` image URL and an Awin `pclick.php` link with `a=3118944&m=116479`. Sizes, fit and live retailer stock are not invented.

## Architecture and safeguards

`awin-feed-discovery` → bounded CSV/GZIP validation → stable advertiser/variant identity → content hash → private transactional batch RPCs → import history → eligible server retrieval → deterministic styling constraints → optional structured model interpretation/ranking → revalidated owner-only save.

The importer remains dry-run by default. Bulk writes require explicit `--write`, Preview environment, the exact private test source, and a fresh source timestamp. Content hashes omit import/expiry timestamps. Unchanged records skip writes except renewal near expiration. Retries are bounded and limited to transient failures; batch receipts make retrying committed writes idempotent. Resume requires a matching failed snapshot and batch size. Concurrent imports have database locking and a lease. Removal invalidation runs only after a fully completed snapshot.

`catalog` uses the publishable key and user JWT, never the service key. Private access requires a fresh Auth user response plus the database staff row; user-editable metadata is not authorization. The staff RPC checks the caller subject inside its private schema implementation. No pre-existing RLS policy was altered. New service-only history/metering tables intentionally deny anon/authenticated access.

Browse has query, category, exact brand, price, sorting, pagination, loading/error/empty states, safe image/title rendering and explicit affiliate retailer handoff. Studio consent and saved-preference use are separate controls. Guest styling does not persist queries. Existing Studio JPEG processing is reused only when the user selects photo use. No new checkout, payment capture or experimental passkeys were enabled.

Studio selects only retrieved eligible records. Price/size/category/availability/brand and negative constraints are enforced after model output. Model rank responses contain only supplied IDs; display facts and explanations are constructed from actual catalog data. Alternatives have separate prices; outfits use integer-cent total budgets and report missing categories.

## AI controls and measurements

Only `MATCHLATCH_PREVIEW_OPENAI_API_KEY` is read by the new styling APIs. There is no fallback to Production `OPENAI_API_KEY`. Model allowlist: `gpt-5.4-mini`. Strict schemas; `store:false`; no tools; reasoning `none`; at most two calls per request; output caps 400/600 tokens; bounded text context, JPEG size/signature checks and timeouts.

Persistent limits: two requests/user/minute, five/user/day, ten globally/day, $0.02 reserved per request and refusal before monthly reserved/measured spend exceeds $5. Failed calls retain reservations. Usage is retained for 90 days so maintenance cannot reset the monthly cap. A $3 reservation threshold emits a protected server warning. Additional per-runtime burst limits apply to catalog and styling routes; these are not a distributed hard catalog quota.

Measured live usage: **0 requests, 0 input tokens, 0 output tokens, $0 model cost**. No live model latency or paid quality measurement exists yet. Metering uses a conservative uncached estimate `(input_tokens × $0.75 + output_tokens × $4.50) / 1,000,000`, based on current published model pricing; actual provider billing should be reconciled after live tests. Reservations are a guard, not a measured per-call cost or evidence that the provider project budget is configured.

Real catalog test outputs (deterministic, not AI): request `watches under $200` included Guess W0638L6 ($139.99), Guess W1288L2 ($159.99), Guess W1228L3 ($169.99). A complete-outfit request selected a $152.99 watch and returned `complete:false`, missing `shirt`, `pants`, `shoes`.

## Scheduler, diagnostics and exact manual setup

`.github/workflows/awin-preview-refresh.yml` runs Node 24 directly, uses a protected `matchlatch-preview` environment, branch guard, read-only repository permission, pinned checkout/setup actions, concurrency control, time bounds, dry-run-before-write and safe failure summaries. `scripts/refresh-preview.mjs` suppresses product samples in scheduler logs. It does not build or deploy the website, expose an anonymous API, or use a Vercel protection bypass.

Required GitHub environment secrets:

- `MATCHLATCH_PREVIEW_AWIN_FEED_KEY`: the existing authorized feed credential.
- `MATCHLATCH_PREVIEW_SUPABASE_SERVICE_ROLE_KEY`: the existing Preview database writer credential.

The connected GitHub tools cannot create secrets or dispatch workflows. The push trigger can run on the development branch once these secrets are supplied. Native cron and `workflow_dispatch` require a workflow on the default branch, so neither is claimed active under the development-only commit restriction. For recurring testing without any default-branch change, provision an isolated trusted Node 24 runner with a read-only checkout of this branch, the two credentials injected by its secret manager, and a daily invocation of `node scripts/refresh-preview.mjs --write`. Configure its job-failure notification to your own account. Do not publish secrets into cron command arguments, source files or logs. A dedicated scheduler repository would require an explicit exception to the commit restriction; it was not created.

Required OpenAI setup by a project/account owner:

1. Create a separate `MATCHLATCH V1.2 Preview` provider project and development-only key/service account, with Responses API access.
2. Set that project's monthly budget to $5 and alert threshold to $3 (60%) where account permissions allow. Confirm provider budget behavior; the application refusal guard is separate.
3. Add the key securely to Vercel project `matchlatch` as a secret named `MATCHLATCH_PREVIEW_OPENAI_API_KEY`, Preview only, restricted to `design/v1.2-studio-first-100926`.
4. Redeploy this development branch, sign in as authorized staff, and test text styling plus a consented Studio photo. Record actual usage, safe selected IDs, budget compliance, missing categories, save/refresh behavior and provider cost.

Do not paste the key into chat. Production credentials were neither read nor modified. Previous automatic approval rejections were not bypassed. No Vercel Deployment Protection bypass was enabled.

## Deployments, checks and remaining risks

Backend commit: `dbd3c15b69cba4a89682091389258e026905676c`. Frontend/report follow in a separate development commit.

Independent verification deployment: `dpl_26pnv32YCpc6fbMWFywCsLgnSJfx`, READY, https://matchlatch-2bcxaudy9-matchlatch.vercel.app . It is protected and contains private diagnostics; no public share URL was created. The preceding full-import deployment was `dpl_6Zvn4jXn3jfcyUR4DFwAu3GE21Hn`. Diagnostic builds are verification runs, not the recurring scheduler.

Static audit fixes preserve the existing `screen-styles` destination and recognize the already-present ranked Store search implementation. Production navigation/deployment is unchanged.

Security advisor: no ERROR findings. Service-only RLS-without-policy notices are intentional deny-by-default behavior. Warnings remain for pg_net extension placement and existing disabled leaked-password protection; unrelated Auth settings were not changed. References: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

Release blockers: separate provider credential/account budget; isolated recurring runner secrets and failure notifications; paid model/vision quality and cost measurements; authenticated browser save/favorite and mobile/desktop/light/dark visual QA; advertiser authorization, US eligibility, freshness and publication review. Until all gates pass, retain `is_public=false` for every Watches Of USA record and keep this work in development.

References: https://developers.openai.com/api/docs/models/gpt-5.4-mini ; https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows ; https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow .
