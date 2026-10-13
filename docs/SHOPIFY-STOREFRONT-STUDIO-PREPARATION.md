# Shopify merchant Storefront preparation — Preview only

Status: isolated adapter and synthetic tests only. No live Storefront reader,
route wiring, publication, import, inventory write, model call, cart mutation,
image download, persistent result cache, or Supabase change.

## Existing paths

- Store: `api/shop.mjs` -> Shopify Global Catalog UCP (`lib/shopify-discovery.mjs`)
  plus the RLS-published Awin reader (`lib/awin-public-catalog.mjs`). Global
  Catalog products are not the same as this merchant's imported Collective
  inventory. Its separate Studio permissions remain unverified.
- Studio: authenticated and consent-gated `api/style.mjs` ->
  `lib/catalog-server.mjs` -> qualified Awin records -> deterministic qualification
  and budget checks before any optional model reservation. Shopify source
  submissions remain blocked. No changes were made to either route.
- The new adapter is a pure response projection. It cannot access Shopify and
  never handles a token. It reuses `lib/unified-search-contract.mjs`, adding
  `shopify_storefront` as a distinct provider, not `shopify_catalog` or `awin`.

## Owner setup and verification — separate authorization required

1. Confirm Collective merchant and supplier eligibility, an active supplier
   connection/shared product, and actual supplier-backed variant inventory.
   The earlier audit found 48 Love to Kleep products / 292 unavailable variants;
   that historical finding is not a fresh stock check. Do not override supplier
   inventory to manufacture availability. Review Collective's Check requirements.
2. Identify the existing Headless storefront or installed custom application's
   authorized Storefront access. If missing, the owner must separately authorize
   its creation/installation and scopes. The connected assistant's Admin access
   is not a runtime credential for MATCHLATCH.
3. Minimum read scopes: `unauthenticated_read_product_listings` and
   `unauthenticated_read_product_inventory`. Do not request customer, order,
   cart/checkout write, email, or Global Catalog permissions for this task.
4. Verify the intended Storefront channel exposes the exact existing product
   and variant. Online Store/Shop/POS/Copilot publication does not establish
   publication to the selected Headless/custom storefront. Any publication
   change needs separate owner authorization; none is performed here.
5. Document supplier identity with product IDs and reviewed Collective evidence;
   `Product.vendor` is retained as a vendor claim and is not proof of an active
   supplier relationship. Supply a server-owned product/supplier mapping.
6. Confirm rights to display product details and images, use deterministic
   recommendations, and sell to the US destination. A successful API response,
   `@inContext(country: US)`, or a USD price is not shipping/commercial permission.
   Third-party AI use remains separately unverified and disabled.
7. After access is authorized, store the private token in encrypted Vercel
   Preview environment variables restricted to this branch. Never put it in
   browser configuration, source control, screenshots, or logs.

## Proposed runtime configuration (not provisioned or consumed by this adapter)

- `MATCHLATCH_SHOPIFY_STORE_DOMAIN=pfcdgt-is.myshopify.com`
- `MATCHLATCH_SHOPIFY_STOREFRONT_PRIVATE_TOKEN` — secret, server-only
- `MATCHLATCH_SHOPIFY_STOREFRONT_API_VERSION=2026-10`

Future authorized reader endpoint:
`https://pfcdgt-is.myshopify.com/api/2026-10/graphql.json`.
Use `Shopify-Storefront-Private-Token`, not an Admin token or the public-token
header. Buyer-originated requests also require a trusted platform-derived
`Shopify-Storefront-Buyer-IP`. Never accept a shopper-supplied IP/header as trusted
identity. Pin the store host, disallow redirects, bound query/result sizes,
use timeouts/no-store, and return generic errors without provider bodies/tokens.
Do not implement or call that reader until credentials and permissions are verified.

## Read-only GraphQL and evidence

`STOREFRONT_READ_QUERY` was schema-validated for Storefront GraphQL. It requests
US market context, bounded products and variants, and preserves both product and
variant pagination cursors. It is not executed against a live store.

Fields: product `id`, `title`, `vendor`, `productType`, `onlineStoreUrl`; variant
`id`, `title`, `price.amount`, `price.currencyCode`, `availableForSale`,
`currentlyNotInStock`, `quantityAvailable`, `selectedOptions.name/value`,
`image.url/altText`; both `pageInfo.hasNextPage/endCursor`.

Positive quantity, availableForSale true, and currentlyNotInStock false are
required by this conservative adapter. Missing quantities, backorders, zero or
fractional inventory, provider errors, and stale/future snapshots are excluded.
The five-minute observation window is application evidence freshness, not a
reservation, supplier guarantee, or delivery promise. No arbitrary cursor is
followed by the adapter: pagination is returned for the future bounded reader.

## Shared source-aware representation

The existing contract preserves source/merchant/product/variant IDs,
classification and color evidence, price/currency, size/size system, imagery
rights, source timestamps, US shipping evidence, and separate permission gates.
The adapter adds verified supplier identity plus the original vendor claim,
exact price cents, original option names/values, variant stock quantity and
backorder flags, observation expiry, channel-publication evidence, and a
merchant-specific checkout reference. Unknown sizes/units/fit remain unknown.
Product and image destinations are allowlisted; custom product domains require
explicit server-owned approval. All evidence context must come from the server,
not request bodies or product claims. Internal `original` projections must not
be returned as public API payloads.

Checkout remains `enabled:false`, URL null, and no affiliate attribution.
The future permitted destination is Shopify's checkout for this merchant and
variant, obtained from an authorized future Shopify cart flow. Do not construct
checkout links, combine Awin payments, create carts, or insert manual orders.
Collective overselling protection depends on Shopify checkout. Checkout work
requires separate approval. No such flow is added by this task.

## Smallest later integration and acceptance gate

After owner evidence and credentials are available, implement a server-only
read transport under the existing discovery gateway; reuse this projection for
Store and Studio. Verify one existing available variant with the exact owner-
approved source and option IDs. Run deterministic discovery only, retain all
current authentication/consent/rate/budget controls, and show an honest partial
result rather than claiming a complete outfit. Do not connect the new provider
to `api/style.mjs`'s optional AI branch. Refresh quantity/price evidence on each
request; do not persist search results or download images.

Fixture tests verify permission denial, supplier/publication/US evidence,
stock/backorder/freshness rejection, prices and exact constraints, preserved
options/IDs, source separation, disabled checkout/AI, bounded destinations,
provider-error redaction, and no imports from the live Store or Studio routes.
They do not prove real credentials, live inventory, merchant authorization,
publication, shipping, or checkout readiness.

## Official references

- https://shopify.dev/docs/api/storefront/2026-10
- https://shopify.dev/docs/api/usage/access-scopes
- https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api
- https://shopify.dev/docs/api/storefront/latest/objects/ProductVariant
- https://shopify.dev/docs/apps/build/collective/products
- https://help.shopify.com/en/manual/online-sales-channels/shopify-collective/retailers/requirements-and-considerations
