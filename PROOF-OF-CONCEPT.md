# MATCHLATCH — Proof of concept (POC-01)

**Stage:** Functional checkout handoff validation. **Status:** Prepared in source only; not deployed.

## The question we're testing
Can a first-time shopper go from clothing inspiration to a real, currently available product, save the selected variant in MATCHLATCH, and continue directly toward buying that exact variant with minimal friction?

The shopper sees: **Find → Add to cart → Checkout**. Catalogs, merchant differences, revalidation and authentication are handled behind the scenes.

## What POC-01 adds to the production commerce shells
1. In Checkout, a retailer item uses its saved Shopify product + variant IDs to request a **fresh** `/api/shop?mode=verify` lookup. The server uses Shopify Global Catalog's `get_product`.
2. Only a matching, available USD variant with a HTTPS merchant URL passes validation.
3. If Shopify supplies a variant-specific `checkout_url`, the checkout button takes the shopper to that retailer-issued permalink. Nothing is invented client-side.
4. If only a product URL is available, the UI explicitly offers **View item at retailer**, without describing that fallback as a one-click checkout.
5. If the price changed, the shopper sees the current price and confirms before leaving MATCHLATCH. If inventory or network verification fails, the shopper stays on MATCHLATCH with a clear message.
6. Each merchant continues to own payment, tax, shipping and order fulfillment. Different retailers require separate checkouts.

**This POC does not create a MATCHLATCH payment, order, buyer account, merchant cart session or multi-store purchase.**

## Live acceptance tests — run after authorizing the next staging preview

| Test | Pass criteria |
| --- | --- |
| Inspiration → look | A new shopper completes photo-upload or guided inspiration styling without assistance |
| Look → shopping | Shopper can find at least one relevant real listing within their chosen budget |
| Selected product | Correct variant, currency, size (when supplied), seller and checkout URL can be retrieved from Shopify |
| Add to cart | Single tap saves the item; repeat tap doesn't duplicate it; guest cart survives refresh |
| Checkout | Server rechecks product and variant; returned checkout permalink opens the intended seller's checkout for that item |
| No permalink | Clearly labeled merchant product-page fallback; no imaginary cart or payment |
| Price change | Updated price shown, requires explicit second confirmation |
| Sold out or network error | No redirect to checkout; helpful recovery path |
| Mobile | iPhone Safari, light/dark appearance, accessible tap targets, safe-area navigation |
| Multi-retailer | Separate retailer handoffs clearly indicated, not one combined MATCHLATCH payment |

These are **test criteria**, not yet measured results. The cart-code and checkout-action unit checks passed with simulated responses; live retailer and human-user tests are still outstanding.

## Initial validation targets (chosen for this pilot)
- Recruit **10 independent first-time users** to attempt the flow.
- Aim for **8/10** to reach a verified retailer checkout destination without coaching, within **four minutes**.
- Aim for **7/10** to identify a product they would genuinely consider buying.
- Aim for **5/10** to say they'd use MATCHLATCH again.
- Observe at least **one genuine purchase** only with explicit shopper permission or voluntary receipt confirmation; opening a checkout URL is **not** proof of purchase.
- Record where people abandon the journey and how often catalog lookups fail. Avoid collecting payment credentials or unnecessary personal information.

Thresholds are proposed POC goals rather than statistically established benchmarks.

## Next capability after POC-01
- Add live size/color selection using Shopify `get_product` option metadata.
- Support grouping multiple same-merchant variants in a retailer cart (permalinks or Cart MCP) where appropriate.
- Explore Checkout MCP when authenticated access and merchant permissions are in place.
- Add consent-respecting funnel analytics and a small opt-in feedback prompt.
- Evaluate genuine affiliate attribution, transaction economics and retailer relationships separately.

## Release gate
POC-01 is an **unreleased GitHub commit**. Do not advance `main` or staging or deploy to Vercel until the build stage is approved.
