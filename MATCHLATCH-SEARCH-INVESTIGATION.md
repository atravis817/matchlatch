# MATCHLATCH V1.2 — Studio catalog search investigation

Read-only database snapshot: 2026-10-11 18:49 UTC (14:49 Eastern). No SQL writes, migrations, refreshes, role grants, environment changes or Production releases.

## Verified diagnosis

899 rows, all advertiser116479 / Watches Of USA / feed102556. 847 stored as watch; 52 stored as shirt, **all 52 have watch titles**. 895 titles contain standalone watch/watches; the other four are three wristwatches and Michael Kors MK8412 Lexington Two Tone Blue. Ten brands are watch brands in this inventory, not proof of apparel coverage. Prices: watch USD89.99–1349.99, misclassified shirt USD147.99–969.99.

Zero footwear slots; zero sneaker titles; zero footwear/sneaker/shoe/boot/trainer terms in combined titles/descriptions. 94 titles contain black. 898 available,899 unexpired,0 public,0 US-eligible,0 supplied sizes,0 supplied colors,0 feed-import timestamps within24h. There are898 fresh private available candidates under the existing48h source policy before all mapping/filter checks. Unknown US shipping is not confirmed ineligibility.

## Request path (code trace, not a recovered user's network capture)

1. `catalog-experience.js`: Studio Find catalog matches / Style with AI → authenticated, consented POST `/api/style`. AI boolean differs; both recommend Awin products only. Optional saved profile adds budget, fit and sizes; unknown size cannot satisfy an exact size.
2. `api/style.mjs`: Preview/origin/rate/session/consent gates → `intentFromText`. Black sneaker becomes shoes, black, requested budget/size.
3. `lib/catalog-server.mjs`: public PostgREST query requires public=true,available=true,USeligible=true,unexpired and price/category/size. Database RLS independently requires public/available/USeligible/unexpired. Mapping adds24h feed age, valid HTTPS imagery/destination/affiliate publisher+advertiser attribution. `search_document` is not currently queried; category retrieval and deterministic ranking are used. Before fix, ranking occurred after a capped60row page, creating future false-negative risk for color/type filters. New public allowlisted color/type predicates run before that page.
4. Zero eligible candidates → no AI reservation, no OpenAI call; `aiSkipped=no_eligible_catalog`,model=null. Model interpretation and supplied-ID ranking only run with coverage. General guided/photo styling and separate AI chat are different flows, not proof of purchasable inventory.
5. Shopping intelligence `/api/commerce` is yet another path: Awin first, approved retailer adapters (currently none), optional authenticated consented indexed research. Research references are not published inventory.
6. Store participating retailer search → GET `/api/shop` → Shopify Global Catalog plus separately qualified Awin retrieval → user preference/variant/category filters. Shopify APIs are not Awin retailer membership or affiliate approval. Source US filtering is not destination-specific delivery proof.

## Safe changes

Files: `lib/styling-engine.mjs`, `lib/catalog-server.mjs`, `api/style.mjs`, `api/catalog.mjs`, `catalog-experience.js`, `app-shell.js`, `scripts/test-catalog-styling.mjs`, new `scripts/test-search-investigation.mjs`, this report.

Normalize singular/plural sneaker/trainers/tennis shoes, timepiece/wristwatch and Unicode/grey; preserve exclusions/budgets/sizes. Require sneaker subtype evidence rather than recommending boots. Withhold watch-titled rows mislabeled as apparel; no shared row updates. Explicit public/private no-match source messaging; no private counts leaked. User-driven Studio→Store handoff preserves query/category/budget/size, asks user to search and does not call AI or silently relax constraints.

81 automated tests pass; static audit passes. New six tests cover synonyms, subtype and misclassification, before-pagination filters, exact black sneaker/black watch empty-model path, owner-vs-catalogstaff and staff fixture search, explicit retailer handoff. Tests use clearly fictional fixtures and mocked auth, not owner impersonation against Supabase. Actual owner has0 catalog-staff rows, so real owner-only private product retrieval is **blocked**. Existing owner endpoint supplies fictional UI fixtures, not real watches. Do not grant catalog staff or expand owner data access without separate authorization/security review. Staff RPC also requires successful recent import; private mapping has48h source/future expiry and attribution checks. SQL administrator inspection is not proof of owner API access.

## Merchants / feeds

Stored authoritative partnership records, not refreshed Awin membership this turn:

| Advertiser | Stored membership | Feed / use |
|---|---|---|
| ZazzMode117849 | joined, checked Oct9 | unverified; candidate statement apparel, no imported rows |
| Cacio Pepe US126793 | joined, checked Oct9 | unverified; candidate menswear, footwear coverage must be demonstrated |
| Under Armour US15431 | pending | unverified; footwear/sportswear expansion candidate only |
| W Concept US6016 | pending | unverified; broader apparel/footwear candidate only |
| Suitsupply US16225 | pending | unverified; tailored apparel/footwear candidate only |
| MESHKI US15378 | pending | unverified; womenswear candidate only |
| Loci83063 | not_joined | unverified; footwear candidate, not authorized |
| Varley106789 | not_joined | unverified; apparel candidate, not authorized |
| Watches Of USA116479 | not_joined | feed verified private only, browse/checkout false |

All9 partners have browse=false and checkout=false. No authorized footwear feed has been demonstrated. Awin registry is a candidate allowlist, not approval. Importer default discovery restricts117849/126793; private v2 write proposal supports116479/102556 only. A fashion-feed write expansion needs separately reviewed scope and approval, not simply a changed allowlist. Feed discovery credentials are not present in this trusted local runtime; no secret was pulled or exposed, no fresh credentialed feed discovery claimed. Awin official feed-list documentation distinguishes membership, accessible feed IDs, and source update/check dates; visibility alone does not grant publication rights.

## Prioritized next steps / approval boundaries

1. Confirm joined merchant status and licensed product/image/data use through Awin; obtain feed IDs or authorized APIs for joined117849/126793. Run bounded read-only discovery in approved Preview runtime with configured feed key, never print credential-bearing URLs. Verify actual footwear/apparel rows, not programme marketing categories.
2. Review canonical classification and variant mapping with known watches and licensed footwear/apparel fixtures. Correct the52 stored watch classifications only after approval for shared-data changes, with before-image and rollback.
3. Select a small qualified sample: USD current price, exact variants/sizes/colors, source stock and freshness, verified merchant/image rights, US shipping product evidence, valid affiliate links. Do not infer these from available feeds.
4. Resolve isolated migration/rollback/recovery gates; obtain separate approval for controlled writes/refresh and source support expansion. Keep flags private until individually reviewed; publication is a separate approval.
5. Unify eligible-provider retrieval for Studio/Store via explicit normalized contracts and policy, then grounded-ID AI ranking; do not silently add Store source to styling before permissions/contract review. Test owner/customer separation, saving and delivery unknown states.
6. Expand footwear then tops/bottoms/outerwear/accessories with approved retailer feeds; monitor per-type qualified counts and freshness. A working model connection is not catalog readiness.

Remaining: live signed-in Studio reproduction and owner catalog tests require an authorized session; historical user's exact request/body was not captured. No real AI expenditure performed. Public stock, coupons, checkout and affiliate conversion remain unverified. Public ranking still retrieves bounded pages; more complex profile/fit filters and private RPC color predicates require further design, not unsafe DB alteration.
