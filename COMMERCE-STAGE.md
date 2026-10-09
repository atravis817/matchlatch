# MATCHLATCH commerce shell stage

Status: **structural UX only — not released**

Design principle: **Find → Add to cart → Checkout.** The app owns product discovery, selection, saved-cart persistence and review. No retailer setup leaks into the consumer flow.

## What now exists
- Store uses the existing Shopify Global Catalog search endpoint (/api/shop) and presents **Add to cart** on actual returned variants.
- **Product detail** route (#store/product) contains retailer, photo, title, reported price, reported size / variant, and Add to cart.
- There is **one existing cart**, within the MATCHLATCH guest/signed-in library. Store products and Studio selections converge on this cart.
- **Cart** route (#closet/shortlist) shows saved items, estimated totals, removal and Checkout without requiring registration.
- **Checkout review** route (#closet/checkout) shows saved items and indicative totals. Each retailer product currently opens on its HTTPS product page for purchase; MATCHLATCH does not collect payments.
- Existing styling, favorites, look persistence, photo library and GreenGlass navigation remain in place.

## Verified vs. unavailable
| Capability | Status | Enforcement |
| --- | --- | --- |
| Catalog search | Existing; conditional on Shopify Global Catalog | Server filters available USD variants |
| Add real item to cart | Implemented | Requires available=true, USD price, Shopify IDs and HTTPS retailer link |
| Save cart guest / authenticated | Existing persist/sync | One cart collection; no parallel bag |
| Product detail | Implemented | Only shows provider-reported fields |
| Estimated subtotal | Implemented | Informational; excludes shipping, tax and live revalidation |
| Retailer handoff | Implemented | Opens retailer-owned HTTPS product page |
| Direct retailer checkout session | **Not integrated** | Product link does not automatically create a retailer cart |
| Unified multi-retailer checkout | **Not integrated** | No combined charge or order |
| Payment collection / order placement | **Not integrated** | No payment form, fictional order or card storage |
| Revalidate cart at checkout | **Not integrated** | UI states prices and inventory can change |

## Next capabilities (behind the scenes)
1. Confirm retailer protocols, commercial permissions and merchant relationships.
2. Build a provider-backed checkout adapter for real cart sessions, size/variant/quantity, tax, shipping and returns.
3. Support genuine multi-retailer checkout only when providers permit it; otherwise create transparent retailer-owned checkout handoffs.
4. Add server-side validation, expiry, order confirmation callbacks where supported, and optional fulfillment/tracking.
5. Test iPhone Safari, guest/sign-in sync, accessibility, stale inventory, redirects and failure states.

Do not create mock charges, invent retailer relationships, or store payment card data.

## Release discipline
The UX work remains in an **unreleased commit object**. Do not advance main, development or staging refs, or trigger Vercel, until the user approves this commerce stage.
