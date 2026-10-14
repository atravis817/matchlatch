# WO-ML-017 — Unified Shopify + Awin discovery

October 13, 2026. Preview only; Production and purchases remain on hold. Based on checkout commit `f77cee899544d85c8a81a3d149d29b0e888e8e0a`. Dedicated branch: `feature/wo-ml-017-unified-discovery`, stacked on checkout PR #5. Existing checkout/owner/Awin branches are preserved.

## What changed

`GET /api/shop?mode=unified` uses `lib/unified-discovery.mjs` and the existing Shopify MCP client plus published Awin adapter. One bounded Shopify request (10 products), one independently bounded published-feed query, no retries/fan-out/model call/cache/database mutation. Provider statuses distinguish results, empty, unavailable, disabled, owner-required and unconfigured. Successful results survive another source's failure or empty inventory. Prices remain USD merchandise prices; shipping/tax and delivery deadlines are not invented.

Original product/variant/merchant references, source, size/system/unit/color, price, imagery and destination remain attached. Safe ordinary product URLs replace feed tracking destinations in this search; no affiliate link is generated. Native checkout eligibility is always false. Deduplication requires reliable identical merchant/product URL and original option evidence; similar titles do not merge. Ranking uses query relevance and price, never commission.

Store defaults to **All available products**, sends legitimate account authorization for owner evaluation, and exposes source limitations without disguising them. Existing separate sources remain selectable for compatibility. Studio adds **Search products in Store**, independent of outfit-generation/AI submission. Occasion, style and full notes are retained in session context; garment category, exact size/system, explicit color and strict merchandise budget transfer. Multi-garment or conflicting-color requests require an explicit single garment/color choice. Negative color/material constraints remain enforced in the shared service. Full outfit generation remains separately gated and is not claimed by product search.

The new Shopify path is owner-only Preview evaluation. Its results/images are not saved to cart, looks, favorites, cloud records or localStorage; shortlist controls are withheld and library intake rejects evaluation records. Navigation/account changes discard evaluation results. Images are rendered directly from provider URLs in connection with the current listing; they are not downloaded to our server. Awin published records retain existing permitted shortlist behavior. Existing checkout quantity/grouping/totals/purchase-denial and owner authorization are unchanged.

## Shopify reconnaissance and actual evidence

Current official sources:

- https://shopify.dev/docs/agents/catalog
- https://shopify.dev/docs/agents/catalog/global-catalog
- https://shopify.dev/docs/agents/get-started/profile
- https://shopify.dev/docs/agents/get-started/search-catalog
- https://www.shopify.com/legal/api-terms

The old `catalog/quickstart` URL was unavailable; the linked current get-started guides were used. Official documentation describes keyless agent-profile Catalog access, bounded queries, no search-result caching and no image caching/reuse. A headless Storefront token is a separate merchant checkout capability, not arbitrary cross-merchant cart authorization. No merchant agreement was accepted.

Live MCP `tools/list` returned `search_catalog`, `get_product` and `lookup_catalog`; their input schema was inspected. The implemented request uses the documented `meta.ucp-agent.profile` and `catalog` fields with query, available/US/price/attribute filters, context and pagination.

**Actual profile defect:** `https://matchlatch.vercel.app/ucp-agent.json` served only capabilities/version, without services. A genuine search using that profile returned HTTP 422 with `profile_malformed`, `Missing services`. The repository's full profile includes the services, but its immutable GitHub raw URL was rejected with `Invalid content type`. Production was not modified to repair either condition. A protected Preview profile also cannot simply be assumed publicly retrievable by Shopify.

**Working evaluation access:** Shopify's officially hosted tutorial profile successfully negotiated a bounded live search. A direct real search returned five products, of which one passed the existing strict shoe/variant normalization. A subsequent real search through the new shared service returned one qualified sneaker variant. These are real provider responses, not fixtures; their counts/prices vary by request. No search result bulk index or saved response cache was built.

The tutorial profile is a documented evaluation mechanism, not proof of MATCHLATCH's own identity or commercial launch clearance. New unified Shopify search therefore requires verified owner authorization and the Preview evaluation flag. Public/customer Shopify activation remains gated. The pre-existing legacy `mode=search` endpoint was preserved; this work does not certify its public launch permissions.

## Awin reconnaissance and actual evidence

The connected Awin account request succeeded for MATCHLATCH publisher `3118944`, owner role. Current joined US programmes returned five Active advertisers: Salted Avenue (64928), Cosplay Shopper (90655), Moosehill (96701), ZazzMode (117849) and Cacio Pepe US (126793). Moosehill's fresh programme-details response confirmed Joined and enabled deep links. ZazzMode's no-coupon-site restriction remains relevant; no promotional method is activated here.

Vercel metadata, read without decrypting credentials, showed `AWIN_API_TOKEN` Production-only. No publisher API token exists in Preview, so successful connector authentication is **not** proof that the deployed application can authenticate to that publisher API. `AWIN_PRODUCT_FEED_API_KEY` exists for Preview; its value was not read/exported. The publisher ID was previously scoped only to the older Awin branch.

The application adapter queries only explicitly published, recent, USD, US-eligible Awin rows through existing Supabase RLS. The latest checkout Preview's actual catalog-capability request returned `catalogAvailable:false`; a real Store search returned zero Awin listings while Shopify succeeded. No qualifying Awin product-level lookup or feed download was verified in this workstream. Joined advertisers are not fabricated product inventory. No private inventory was modified/published.

## Branch configuration

- `MATCHLATCH_UNIFIED_DISCOVERY_ENABLED=true`: new owner-only Preview evaluation path.
- `MATCHLATCH_ADMIN_USER_ID`: preserve the existing verified owner value from checkout Preview, scoped to this new branch; do not infer identity from test fixtures/email/browser flags.
- `AWIN_PUBLISHER_ID=3118944`: non-secret publisher identity for this Preview branch.
- `AWIN_API_TOKEN`: missing; founder must configure an authorized Preview credential privately. No Production copying.
- Existing Preview Supabase public configuration and feed-key presence are reused; no database/schema change.

No Global Catalog commercial-display evidence, native cart permissions, AI-processing authorization or paid access was invented. All existing purchase-disabled controls remain enabled.

## Validation

Final independent regression: **182 tests passed, 0 failed/skipped**, including fourteen new unified-provider/constraint/permission/Studio tests. Static audit: **174 PASS**. Commerce-policy fingerprint: PASS (2.0.0). **100 JS/MJS files parsed**, twelve API source functions remain. No framework or dependency migration.

Coverage includes Shopify-only/Awin-only/combined results, partial and total failures, actual empty states, unsafe/invalid data, category/size/system/color/budget/brand constraints, source identity/dedup, guest/customer/unverified-owner denial of Shopify, Production denial, stock snapshots, deadline withholding, explicit Studio handoff and actual Studio form dispatch without an AI request. Existing checkout and owner authorization suites pass. Synthetic Awin products in tests are not live product proof.

CI, deployment and HTTP/browser verification references will be recorded after publication. If browser owner/customer sessions are unavailable, mark those acceptance checks blocked rather than reporting them passed.

## Blocker register and shortest next steps

| Item | Status | Next action |
| --- | --- | --- |
| Own MATCHLATCH profile | Reproducible defect | Host full services/capabilities profile at a public application/json URL under MATCHLATCH control; Production repair needs separate approval |
| Shopify public/commercial release | Not certified | Verify applicable developer agreement, display/image handling and own agent identity before public activation |
| Owner evaluation search | Implemented/live provider verified | Verify authenticated deployed owner search in the new Preview |
| Awin publisher API token | Missing from Preview | Configure authorized branch-scoped token privately, then redeploy |
| Awin actual product inventory | Empty/unverified | Verify eligible feeds/product data for joined merchants; use existing reviewed publication workflow only with authorization |
| Affiliate attribution | Unverified | Preserve ordinary links; no unsupported checkout wrapping or claimed commission |
| Signed-in browser/customer isolation | Requires legitimate sessions | Test founder and separate customer; no login bypass or token sharing |
| Mobile/desktop/light-dark QA | Requires browser access | Verify actual layout when protected Preview is legitimately accessible |
| Merchant checkout/AI outfits | Existing gated dependencies | Keep disabled; unified discovery does not grant those permissions |
| Distributed throttling | Release/scaling requirement | Existing limits are per runtime; validate coordination before public launch |

Engineering assessment: the shared search and Studio handoff remove the architectural Awin-only dependency. Real Shopify evaluation works through the documented tutorial route; both-source live product acceptance is not satisfied until Awin inventory/credentials and MATCHLATCH profile/launch requirements are resolved. **NO-GO for Production; appropriate for authorized founder Preview evaluation.**

## Executed deployment and HTTP verification

Application checkpoint `c44ebd7eec9a0b0012f2de89ca6b6bb5200d9e2d` published in [draft PR #6](https://github.com/atravis817/matchlatch/pull/6). Its Git tree exactly matched the local tested tree. [GitHub quality run 38499660535](https://github.com/atravis817/matchlatch/actions/runs/38499660535) passed all configured checks.

The first automatic deployment began before branch-scoped settings were applied and returned a missing-owner 503 plus disabled evaluation. It was not used as the delivered configured Preview. After settings were confirmed, the same exact commit was redeployed with current Preview configuration. The API uses `target=staging` for this non-Production deployment; the initial attempt with `target=preview` was rejected by Vercel's input validator and created no deployment.

Configured READY deployment: `dpl_EDDYH7ppVfBYSJu1Hua89JXE6fFf`, https://matchlatch-rmcfbvh3m-matchlatch.vercel.app . Non-Production target `staging`; correct project and application SHA verified. Vercel Authentication remains enabled. No custom production domains were promoted.

Actual authorized HTTP results on this configured deployment:

| Request | Actual result |
| --- | --- |
| Application HTML | 200, Store/Studio/checkout assets linked and purchases-disabled meta retained |
| Owner capability, guest | 403 Forbidden, proving configured gate now denies guest instead of missing-owner 503 |
| Unified capabilities, guest | 200, enabled=true, ownerEvaluation=false, ownerOnly=true, publicShopify=false, aiProcessing=false |
| Unified sneakers search, guest | 200, Shopify owner_required, Awin empty, zero products; no invented listing |
| Private inventory, guest | 403 Staff access required |
| Checkout verification | 403 BETA_PURCHASES_DISABLED |

These are deployed guest HTTP checks, not owner-session browser tests. A cloud-browser visit still redirected to Vercel login. Owner search, owner Command Center visuals, separate real customer isolation, mobile/desktop/light-dark layout and touch/accessibility remain blocked by unavailable legitimate browser sessions. No screenshot or signed-in pass is claimed.

A follow-up improves broad browsing with **Use my saved size when blank**: uncheck it and leave Exact size blank to inspect products without a hidden saved-size constraint. An explicitly entered size remains mandatory. Source limitations stay visible and unspecified sizes remain labeled; no size is fabricated. The full 182-test suite and audit passed again after this change. The final commit/deployment reference is the current PR head and deployment reported in the completion response.

### Founder test path

1. Open the delivered protected Preview with your Vercel access, then sign into MATCHLATCH with the existing verified owner account.
2. In ME, check Command Center. In Store, leave **All available products** selected, choose Footwear, query sneakers and set a merchandise budget. For a broad initial browse, uncheck the saved-size option and leave exact size/brand/deadline blank. Then repeat with your actual size and preferences; an empty constrained result is legitimate.
3. Confirm source status for Shopify and Awin separately. Shopify owner evaluation should attempt the live catalog; Awin can remain empty until eligible feed data exists. Shopify cards are evaluation-only and cannot be saved. No retailer checkout or payment is enabled.
4. In Studio, choose occasion/style/budget and enter garment notes, then select **Search products in Store**. Verify the context, size and budget carried over. This does not generate or claim a complete AI outfit.
5. Sign out and confirm owner controls disappear. Use a separate ordinary customer session for denial and cart regression tests. Never send login secrets in chat.


### Empty-state correction

Studio outfit generation still requires eligible reviewed feed products; unified Shopify discovery does not generate an outfit. The empty feed status now identifies that source explicitly. Studio disables the unavailable outfit action for customers when the reviewed catalog is empty, while retaining authorized staff access. Store distinguishes owner-required, disabled, unavailable, and actual no-match Shopify responses. No provider permissions or public access were expanded. Signed-in owner browser verification remains outstanding.
