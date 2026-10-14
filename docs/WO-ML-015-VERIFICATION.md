# WO-ML-015 — Verification and release-readiness report

Date: October 13, 2026 (America/New_York). **Production recommendation: NO-GO.** Checkout code is implemented and ready for authorized Preview QA. The full workstream acceptance gate remains incomplete because fresh browser, customer and provider verification is blocked.

## Delivery references

- Branch: `feature/wo-ml-015-checkout-20261013`
- [Draft PR #5](https://github.com/atravis817/matchlatch/pull/5), stacked on Awin PR #4's branch; mergeable at inspection. Do not merge.
- Application commit: `984f4d6caa7689739876d001bc4d5822a8e6511b`
- Tested/published Git tree: `c031cf65bb3e619c98993b0fcb5987c2851c196c`; exact match to the locally tested tree.
- [Application Preview](https://matchlatch-r5q45xskr-matchlatch.vercel.app)
- Deployment: `dpl_BfE8XR2G8zzRqdSoj5qh87VRSdCL`; Vercel READY, Preview (`target:null`), matching application commit.
- [Successful GitHub quality gate](https://github.com/atravis817/matchlatch/actions/runs/38495051730), run 156 on the application commit.
- [Implementation and activation dependencies](WO-ML-015-CHECKOUT.md)

Any subsequent documentation-only commit/deployment must be distinguished from this application checkpoint. This report records tested application code, not an assumption that READY means live functionality passed.

## Implemented

One authenticated Store/Studio cart now preserves exact merchant/product/variant references, size/color/options and quantity. Quantity editing and removal retain existing storage/account boundaries. Checkout review separates merchants by identity/domain and shows each merchandise subtotal plus combined merchandise spending in integer cents. Unknown shipping and taxes are clearly labeled; listed coupons do not reduce totals. Return-to-Store/Studio controls retain saved selections; manually recorded purchases remain available for linked inspiration items.

A fixed-merchant, default-deny Storefront adapter prepares exact approved native variants, verifies stock/quantity/selected address, reads carrier options, accepts current selected delivery options and returns only validated merchant-owned checkout URLs. Sealed cart state expires after five minutes and is bound to user, lines, merchant and destination. Merchant state is independent; account changes clear it. Refresh/selection reuse a prepared cart. Cart keys, address and quotes are not persisted to customer records or browser storage. No payment or order processing exists.

Ordinary product-page fallback requires fresh exact merchant/variant verification. It does not promise preselected quantities or a checkout session. Awin checkout wrapping is never performed. Existing usability-beta outbound/purchase denial remains intact.

## Actual independent checks

Execution environment: Linux, Node v24.19.0. Repository CI uses Ubuntu/Node 22. No new dependency was installed.

| Executed check | Result |
| --- | --- |
| `node --test scripts/test-*.mjs` | **168 passed, 0 failed, 0 skipped/cancelled** |
| New checkout tests within that suite | **17 passed** |
| `node scripts/audit.mjs` | **174 PASS, 0 FAIL** |
| `node scripts/check-commerce-policy.mjs` | **PASS**, policy 2.0.0 |
| `node --check` across JS/MJS | **96 files passed**, no parse errors |
| Git whitespace checks | Passed |
| Shopify schema validation | All **five generated operations valid** after removing deprecated tax fields |
| GitHub quality workflow | Completed/success on application commit |
| Vercel deployment inspection | READY, correct project/Preview/commit |
| Fresh cloud-browser visit | **Blocked** at Vercel login; application was not reached |

Coverage includes exact options and merchant grouping, quantity/removal/navigation controls, integer-cent subtotals, unknown prices/shipping/tax, stale availability, changed prices, invalid merchant/variant/cart/address, multiple services and selection, unsafe URLs, guest/verified-customer/default-deny/Production boundaries, encrypted-state tampering/expiry/cross-account replay, mutation timeout without automatic retry, affiliate-free checkout URLs and actual renderer state invalidation. Provider and DOM harness results are synthetic, not real shopper/browser/provider proof.

## Merchant and shipping verification

**No merchant checkout integration was newly live-verified by this workstream.** No merchant cart was created and no live shipping quote was requested. BASALT's earlier cart/partial-address/UPS/USPS observations remain historical owner-reported evidence. Fixture responses exercised multiple carrier services, unknown rates/taxes, mismatched destination and option selection without any merchant side effect.

The current adapter supports only the existing merchant's approved native ProductVariant IDs, once reviewed permissions/configuration exist. Global Catalog and Awin product IDs do not grant merchant cart API authorization and are not silently converted. Checkout custom domains beyond the fixed merchant host remain unsupported until explicitly reviewed.

## Failed or incomplete acceptance checks

No local regression failed in the final run. Incomplete checks are:

1. Vercel-authenticated browser access and signed-in Store/Studio-to-cart journey.
2. Desktop/iPhone-sized light/dark layout, real Safari/touch/accessibility checks.
3. Two-customer live isolation and cross-device cart/photo/profile synchronization.
4. Current authorized BASALT/native variant discovery, merchant cart creation, real rates/selection and returned checkout destination.
5. Product-specific affiliate attribution and functional Awin Preview credentials.
6. Distributed anti-abuse/idempotency validation for scaling. Current rate controls are per runtime; no blind mutation retry is implemented.

The existing signed-out cloud browser had no usable Vercel authentication for this Preview. No temporary share link was created, deployment protection disabled, login bypassed or application authentication altered. The source and deployment metadata are verified; browser functionality is not certified.

## Remaining owner actions and blocker register

| Blocker | Classification | Required next step |
| --- | --- | --- |
| Protected Preview access | Requires owner action | Supply legitimate authenticated access; keep protection enabled |
| Native merchant permission/publication/supplier evidence | Requires owner action | Review authorization before activating cart functionality |
| Dedicated Preview token/state secret/allowlist | Requires owner action | Configure privately in Vercel using implementation instructions; no Production copying |
| Existing usability beta checkout denial | Intentionally retained | Review activation separately after rights, runtime and shopper QA; do not remove as a test shortcut |
| Live merchant/shipping and account/device tests | Still blocked | Execute with legitimate customer sessions and merchant permission; stop before payment/order |
| Tax and complete checkout total | Provider limitation | Confirm at actual retailer checkout; tax API fields are deprecated |
| Global Catalog/Awin-to-native mapping | Provider limitation | Approved native mapping or ordinary product-page fallback |
| Custom checkout hosts | Deferred | Explicit merchant host authorization/allowlisting |
| Awin credentials/attribution | Existing blocker | Independent Preview configuration and product-specific validation |
| Cross-instance rate/idempotency | Release requirement | Reviewed coordination before production scaling |

## Release decision and safety record

**NO-GO for Production or live shopper checkout activation.** The build is suitable for continued authorized Preview review, but the work order's browser/provider acceptance requirements have not passed. Unified multi-merchant payments, one combined order and one shipment are not implemented or promised.

The dedicated branch, draft PR, implementation, deterministic tests, technical documentation and READY Preview are delivered. Production and main are untouched; existing draft branches remain unchanged. No purchases, payment submissions, order creation, inventory modification, database writes/migrations, supplier agreements, paid infrastructure or external credentials/settings were changed.
