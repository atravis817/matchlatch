# WO-ML-015 — Merchant checkout and unified review

Release recommendation: **NO-GO for Production or live shopper checkout activation.** Code and isolated tests are prepared for authorized Preview review. Existing usability-beta restrictions remain enabled. No Production merge/deployment, payment, order, database migration or merchant-setting change is authorized.

## Baseline and branch

Based on recovered Awin/Shopify integration commit `774cd4ab6874bce9ce81e17c6cfc28eebb7a6008`. Dedicated branch: `feature/wo-ml-015-checkout-20261013`; PR base: `feature/v1.2-awin-commerce-20261013`. Existing branches and PRs #2/#3/#4 are preserved. Initial refresh found no newer integrated commit/deployment and no active CI; that does not prove the stalled agent terminated.

## Customer experience

- Store and Studio use the original authenticated cart and cloud-sync record kind. No destructive migration or second cart store.
- New records retain merchant/product/variant identities, original option labels, size, color, image, quantity and merchant product destination. Existing missing quantity defaults to one in the view without rewriting saved data. Studio/Store duplicate checks include merchant and exact identifiers.
- Quantities are whole numbers from 1–20. Cart/removal controls, original purchase-record linkage and Studio/Store return routes are retained.
- Cart and review group by merchant ID plus product-domain identity, rather than display name alone. Known USD merchandise prices are summed in integer cents multiplied by quantity. Ideas/old records without exact variants or usable prices remain saved in a separate review section and are excluded from purchasable merchandise totals.
- Merchant subtotal, combined merchandise subtotal, shipping and tax are separate. Shipping stays unknown without a selected current merchant option. Tax stays unknown: Storefront Cart tax fields are deprecated, so this implementation does not invent a tax amount or treat null as zero. No final charge is presented. Listed Awin coupons do not reduce totals.
- Review uses the existing My Closet checkout subroute. Forest-green controls, shared theme variables, responsive cards, accessible quantity labels/status feedback and minimum-size actions preserve the five-destination design.

## Authorized Storefront adapter

`POST /api/commerce?action=checkout` reuses an existing deployable API function. `lib/checkout-route.mjs` requires Preview, exact same-origin JSON, a verified customer session and a bounded request limit. Authorization is not derived from shopper-supplied merchant/product permissions.

`lib/merchant-checkout.mjs` supports exactly the existing store `pfcdgt-is.myshopify.com`, Storefront API `2026-10`. Before cart creation it queries approved native ProductVariant IDs, verifies the exact Product ID, size/color, positive non-backorder inventory sufficient for the requested quantity, USD price and fixed merchant destination. Global Catalog `gid://shopify/p/...` IDs and Awin feed IDs are not converted into native merchant IDs.

Activation is default-deny and requires all server-only Preview configuration:

- `MATCHLATCH_CHECKOUT_ENABLED=true`
- `MATCHLATCH_CHECKOUT_PERMISSION_EVIDENCE`: reference to reviewed merchant/supplier, channel and checkout authorization (at least eight characters). This records an operator decision; it does not itself prove rights.
- `MATCHLATCH_CHECKOUT_VARIANTS`: JSON array of reviewed exact native ProductVariant IDs, maximum 100.
- `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`: independently authorized Preview token for this store.
- `MATCHLATCH_CHECKOUT_STATE_SECRET`: independently generated secret of at least 32 characters for encrypted cart state.

None of these settings was added or enabled in this task. Production secrets are not read/copied. The shopper UI retains `purchases-disabled`; do not remove that restriction just to exercise the adapter. BASALT diagnostic success is not supplier/publication/customer checkout authorization.

The adapter creates one merchant cart for exact lines and a US destination (state and ZIP; optional street, apartment and city). It independently checks the returned cart's exact products, quantities, currency, selected address and legitimate returned checkout URL. It never constructs checkout paths. Provider redirects are rejected. Checkout URLs must use the configured merchant host and a cart/checkout path; custom checkout domains require future reviewed allowlisting, not an inferred exception.

Shipping retrieval supports deferred carrier responses, multiple delivery groups/options, provider titles/descriptions/currency and explicit option selection. Every group must match the submitted destination. Unknown rates, partial responses, wrong cart lines, rejected addresses and unavailable inventory fail honestly. Delivery text is an estimate, never a guarantee. No payment/order mutation is implemented.

Cart IDs including their private keys stay inside AES-GCM encrypted state. State is bound to account, merchant, exact lines/options/quantities and destination, with a five-minute expiry. Refresh and shipping selection reuse the same cart. No automatic retries occur after an ambiguous mutation failure. Client state/destination remain in memory, not account records/localStorage; selection or destination changes invalidate the quote. Account changes clear it. Cross-device merchant-cart continuity is not implemented.

## Ordinary retailer and Awin compatibility

When no authorized native cart is available, the review can freshly verify the original catalog/feed reference and present an ordinary product-page link. Merchant, variant, size/color, currency and freshness must still match. Changed pricing is disclosed before a separate user-selected continuation. Product pages cannot promise preselected quantity/size; users confirm those at the retailer. In Preview the existing `/api/shop?mode=verify` beta denial still prevents these outbound actions.

Awin destinations use `merchantProductUrl` where provided. No checkout URL is wrapped, no new affiliate link is generated, and no commission is promised. Existing official Awin eligibility/generation and Savings Check functionality elsewhere remain intact. This work does not activate attribution.

## Validation

All five generated Storefront operations were validated through Shopify's schema validator. The first pass reported deprecated tax fields; these were removed and the second pass validated all operations without warnings. Documentation sources:

- https://shopify.dev/docs/api/storefront/2026-10/mutations/cartCreate
- https://shopify.dev/docs/api/storefront/2026-10/objects/CartDeliveryGroup
- https://shopify.dev/docs/api/storefront/2026-10/mutations/cartSelectedDeliveryOptionsUpdate
- https://shopify.dev/changelog/tax-and-duties-are-deprecated-in-storefront-cart-api

Deterministic checkout tests cover merchant grouping, quantity/removal controls, selected options, stale availability, changed pricing, unknown shipping/tax, multiple services, wrong merchant/cart/address, missing rates, safe URLs, unauthorized guests/customers, Production denial, token tampering/expiry/cross-account replay, mutation timeout/no automatic retry, Awin-free checkout URLs, quote invalidation and actual UI rendering using a minimal DOM harness. Fixture cart/provider data are explicitly synthetic and establish no live merchant result.

Final test counts, CI, deployment and browser evidence are recorded in `WO-ML-015-VERIFICATION.md` after publication. Twelve API source functions remain. No live provider/cart/shipping/purchase calls were executed by this workstream.

## Blockers and next actions

| Dependency | Status | Required evidence/action |
| --- | --- | --- |
| Fresh protected Preview browser QA | Blocked until legitimate access available | Signed-in Vercel session or existing approved access; never disable protection |
| Merchant cart/customer permissions | Owner action | Reviewed supplier/publication/checkout evidence and scoped Preview configuration |
| BASALT live shipping | Unverified here | Authorized customer session and current provider test; historical UPS/USPS report remains historical |
| Product identity mapping | Provider limitation | Global Catalog/Awin records do not automatically map to approved Storefront variants |
| Custom checkout domains | Provider limitation | Reviewed explicit host allowlist before support |
| Customer isolation/cross-device sync | Live QA outstanding | Two independent sessions/devices; mocked tests are insufficient |
| Mobile/Safari, light/dark visuals | Live QA outstanding | Real browser/device measurements and visual inspection |
| Shared anti-abuse/idempotency | Release/scaling requirement | Per-runtime throttling has no distributed coordination; cart mutation must not be blindly retried |
| Tax/complete total | Provider limitation | Confirm at merchant checkout; deprecated tax fields deliberately omitted |
| Affiliate attribution | Existing blocker | Awin Preview token/product-specific attribution validation; no checkout wrapping |

Proceed with legitimate Preview access and owner-authorized merchant proof, then test the full signed-in journey before activation. Public discovery, shopper handoffs and production remain on hold. This is merchant-hosted checkout preparation, not universal payment processing, one order or one shipment across retailers.
