# MATCHLATCH V2 Commerce Implementation Report

Verified October 10, 2026. Development branch: `design/v1.2-studio-first-100926`. This extends V1.2; no Production release or product publication was performed.

## Implemented

- Preview-only `/api/commerce`: catalog-first retrieval, fresh account/staff authorization, explicit web-research consent and rejection of precise address input.
- Field-evidenced normalization: identifiers, product/affiliate URLs, prices, variants, stock, destination shipping, delivery, returns and promotions. Missing fields stay unknown. Evidence authority, expiry and conflicts prevent silent overwrites.
- Exact size/category/color, fresh stock/price, budget, destination and strict delivery eligibility gates. Unknown shipping prevents total-price comparisons. Commissions are not a ranking input; cross-retailer identity requires exact GTIN evidence.
- Research-only indexed OpenAI search adapter: separate Preview key, exact reviewed domain/product-path filters, one tool call, six sources, 300 output tokens, bounded responses and timeouts. Model prose and unsupported citations cannot become product facts.
- Reviewed API/structured-data adapter contract with permission evidence. **No retailer API or structured-data adapter is approved/enabled. No HTML crawler or JSON-LD page extraction is active.**
- Promotion normalization and applicability checks distinguish verified advertisement, unverified and expired. No checkout, redemption, orders or guaranteed shipping claims.
- Browse and Studio shopping-intelligence controls, safe reference rendering, excluded-match reasons and logout invalidation of pending discovery results. Existing styling/account flows remain intact.
- Five-minute per-user result cache, bounded in-flight coalescing, route limits and service-only database reservations/metering. Shared development cap $5/month, alert $3, search reservation $0.10, five fresh searches globally/day, two/user/day and one/user/minute. Failed/unknown-cost reservations remain held.
- Permanent `MATCHLATCH-AI-COMMERCE-GUARDRAILS.md`, immutable runtime policy hash, CI policy/tests and CODEOWNERS. Required owner-review branch rules still require repository-administrator configuration.

## Actual database and live server evidence

| Measurement | Actual result |
|---|---:|
| `public.matchlatch_awin_products` rows | 899 |
| Feed-advertised available rows | 898 |
| Public rows | 0 |
| Price snapshots within the new one-hour evidence TTL | 0 |
| Verified shopping offers | 0 |
| Anonymous catalog records returned | 0 |
| Guest private request | HTTP 403 |
| Guest external research request | HTTP 401 |
| Live application OpenAI search calls | 0 |
| Actual new application AI expenditure | $0 |

All products remain private Watches Of USA inventory. US shopping eligibility and advertiser publication authorization are unverified; sizes are unknown. Advertised availability is a feed snapshot, not retailer-real-time stock. Zero verified offers is the intended fail-closed outcome, not evidence of an empty database.

Trusted Node 24 read-only Preview diagnostic deployment: `dpl_9Nzd1phjtFw4fhvppwFFcGqXbdxd`, https://matchlatch-dlgtex890-matchlatch.vercel.app. Build emitted `COMMERCE_LIVE_VERIFIED`: 899 database rows, 898 normalized available, zero public/verified offers, anonymous zero, guest private 403 and guest web 401. It validated two reference contracts and explicitly recorded `applicationProviderSearchCalled:false`, `previewKeyConfigured:false`. This diagnostic preceded the final one-hour price TTL and pending-response logout refinements; the price-expiry count above was subsequently verified directly in SQL, and final code passed tests.

Service-only search budget RPCs were tested in a rolled-back database transaction: first reservation allowed, repeated per-minute request denied, shared monthly reservation exhaustion denied, and 2,000 input + 300 output tokens + one search call metered at $0.01285. Test usage rows were rolled back; they are not billed live calls. Existing product RLS policies were not changed.

## Live external retrieval evidence

An independent live search surfaced these authoritative retailer product-reference URLs:

- Nordstrom: https://www.nordstrom.com/s/air-force-1-07-sneaker-women/7041045
- Gap: https://www.gap.com/browse/product.do?pid=7090340020001

These are **manual search/reference-validation evidence**, not application-provider integration evidence. They establish accessible product references only. No price, size stock, shipping forecast, coupon redemption, retailer data reuse permission or affiliate attribution was verified. Neither reference was imported or published. The discovery adapter accepts only completed provider search-source records after exact domain/path validation.

## Automated verification

- Commerce: 15/15 tests passed, including permissions, spoofed URLs, evidence precedence, stale stock, exact size, budgets, coupons, shipping honesty, GTIN comparisons, commission exclusion, catalog-first operation, authorization/consent, prompt injection, adapter permission and isolated-key bounded search/cache behavior.
- Policy checker passed: `29dae4d8d16bd0da152e6fe240ba6ddbbf82986825f442078416cf09a056e339`.
- Existing styling tests (9), importer tests (10), delivery/public-retailer/curation/Awin integration checks and static audit passed during this work.
- JavaScript syntax and Git whitespace checks passed.
- Mock search output: one permitted reference, 2,000 input tokens, 300 output tokens, one search call, estimated $0.01285; repeated request used cache with zero additional provider charge. This is a mock, not a live AI output.
- Interactive browser/rendering QA remains unverified: Chromium is unavailable in the runtime; the earlier browser download failed. Server transport, authorization and normalization were exercised independently.

## Costs and spending protection

Planning rates: gpt-5.4-mini $0.75/million input tokens, $4.50/million output tokens; web search $0.01/call plus content/model tokens. Documentation: https://developers.openai.com/api/docs/pricing and https://developers.openai.com/api/docs/guides/tools-web-search.

| Scenario | 100 shopping requests | 1,000 shopping requests |
|---|---:|---:|
| Catalog/cache only | $0 model/search | $0 model/search |
| Every request a fresh search, assumed 2,000 input / 300 output tokens | $1.285 theoretical | $12.85 theoretical |
| 20% need search, half served from cache | $0.1285 theoretical | $1.285 theoretical |

These are assumptions, not measured live bills, and exclude hosting. Search content/token volume varies. Runtime limits intentionally prevent unlimited execution: $0.10 conservative reservations permit at most 50 search reservations/month before accounting for shared styling usage, with tighter daily/user limits. Thus theoretical request volumes may be denied even when modeled actual cost is lower. No budget increase or automatic reservation relaxation is implemented.

## Remaining authorization and capability gates

1. Create a separate OpenAI development project/key; configure its $5 monthly budget and $3 alert where account permissions allow. Set **only** `MATCHLATCH_PREVIEW_OPENAI_API_KEY` in Vercel Preview for this development branch. Never copy or expand Production keys. Provider budgets may be advisory; application reservations are the enforced guard.
2. Run authenticated, consented live application search and AI styling after that key exists; verify returned source records, actual token/tool usage, database meter and cache hit. This session made no live provider call.
3. Obtain documented retailer API/structured-data permissions and review adapter mappings before enabling merchandise extraction. Approve advertiser/US eligibility/publication separately. No external unverified products may become inventory automatically.
4. Administrator must configure required CODEOWNERS review/branch rules for policy enforcement. Runtime hash and CI catch drift but cannot constrain a privileged contributor editing all enforcement files.
5. Complete authenticated browser QA of Browse/Studio on the final Preview. No deployment-protection bypass was enabled.
6. V1.2 scheduled refresh remains prepared but inactive: GitHub scheduled/workflow-dispatch activation needs default-branch workflow administration and secrets, which this session cannot authorize outside the development-only scope. Prior manual refresh evidence is documented in `MATCHLATCH-V1.2-LIVE-CATALOG-AI-READINESS.md`; do not treat it as proof of recurring scheduler execution.

Production deployment remains `dpl_35psQBq1wqGoi72B3A45GgKFGuZ3`, main SHA `302fa9c3d83263ca25c3ed6252665fb73f06c569`. No DNS, production credentials, storefront publication, passkeys or existing product RLS changes were made.
