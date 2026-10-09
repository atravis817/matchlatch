# MATCHLATCH — Savings Check

**Stage:** V3 Shopping Infrastructure (early feature); optional beta integration built, **not connected to a live coupon account and not checkout-verified**.

**User-facing name:** **Savings Check**. It automatically checks publicly listed merchant coupons alongside individual retailer products in **Private Shop**, **Your Styles favorites**, and the **Cart**. The user can expand the result, copy a code and apply it at the **retailer's own checkout**.

## What exists

- \`api/savings.mjs\`: server-only adapter for the LinkMyDeals Coupon API.
- \`savings.js\` + \`savings.css\`: opt-in-to-open details (automatic lookup on product display), batched domain queries, short-lived browser cache and copy action.
- Domain-based matching using the retailer URL: a code for an unrelated store is **never** shown against the wrong item. We do not guess a match from a merchant display name.
- Expired, not-yet-active, suspended, invalid-format or code-less deal entries are filtered out. Existing valid-looking offers show original title and conditions when provided.
- Product and cart prices remain **unchanged**. We do **not** deduct an estimated discount until an eligible checkout/cart actually accepts that code.
- **No coupon feed records, API secrets or codes are persisted in account collections or cloud wardrobe data.**

## Provider & real-world limitations

**Source:** LinkMyDeals public coupon/deal feeds: https://linkmydeals.com/api-documentation/

As checked in October 2026, the service advertises a **limited $0 plan with 25 downloads/API requests per day**, although its API documentation also describes API-key access for an advanced pack. Actual API key eligibility, available stores, data license and current limits must be confirmed in the user's LinkMyDeals account. Pricing: https://linkmydeals.com/plans-pricing/

**Critical accuracy contract:**

| State | What we may say | What we cannot say |
| --- | --- | --- |
| Feed not connected | "Savings feed not connected" | "No deals exist" |
| Provider unavailable | "Codes could not be checked" | "There are no codes" |
| Feed returned no matching codes | "No current codes found in this feed for this merchant" | "No coupons exist anywhere" |
| Valid, nonexpired code **listed by provider** | "Public coupon listed; try at retailer checkout" | "Verified working", "guaranteed savings", or a reduced item price |
| **Merchant cart API confirms code applicable to current items** (future) | "Applied to this cart when checked" with timestamp, merchant and actual adjusted amount | "Guaranteed at checkout forever" |

Publishing/activation does **not** prove an individual shopper meets minimum spend, new-user, product/category, geography, customer or stacking rules. **Only merchant-cart / checkout confirmation can reasonably demonstrate applicability.** Shopify's Storefront \`cartDiscountCodesUpdate\` returns per-code \`applicable\`, but MATCHLATCH Global Catalog discovery does not grant access to each merchant's authenticated cart API. See https://shopify.dev/docs/api/storefront/latest/mutations/cartDiscountCodesUpdate.

## Activation steps (not yet performed)

1. Create an account with LinkMyDeals and confirm current coupon-feed access for the merchants and countries relevant to MATCHLATCH. No paid plan has been purchased or approved.
2. Obtain an **API key** from the provider's publisher dashboard if your chosen plan grants one. **Never send the API key in chat, put it in JavaScript, or commit it to GitHub**.
3. Add **\`LINKMYDEALS_API_KEY\`** as a **sensitive Production environment variable** in Vercel → MATCHLATCH → Settings → Environment Variables.
4. Deploy a new production build. Vercel environment changes require a new deployment.
5. Open \`https://matchlatch.vercel.app/api/savings?domain=your-supported-retailer.com\` to inspect status. \`enabled:false\` means not configured. \`status:"listed_not_checkout_verified"\` means feed data loaded, not that the code applies. Then use Private Shop and confirm real domain, expiry, terms and copy-to-clipboard. Check checkout manually on supported retailer test items **without purchasing**.
6. Monitor provider requests and test any rate/quota restrictions. The adapter currently has a **12-hour in-process cache** and a 10-minute browser cache. **Serverless instances do not share this memory.** For real traffic, introduce a shared durable feed snapshot and a single scheduled, quota-limited refresh job before broadly enabling the provider. The free limit is *not* protected by the current cache alone.

**Endpoint:** \`GET /api/savings?domains=store-a.com,store-b.com\` (max 15 valid domains) or \`?domain=store-a.com\`. The API key is used **only server-side**, against a fixed HTTPS upstream host. MATCHLATCH sends **merchant hostnames only**—never account identifiers, user photos or style profiles—to its own server function. The server rejects bad domains and never uses client domains as fetch URLs, avoiding arbitrary URL fetches. If the provider's HTTPS feed is not available, the endpoint fails closed rather than transferring secrets over HTTP.

## Next release gate

- [x] Build source integration, merchant-domain matching, offer-date filtering, honest user labels, copy button and connection-off fallback.
- [x] Add Private Shop / favorites / cart hooks without disrupting existing shopping and account features.
- [ ] Obtain a valid provider API key and confirm **actual real feed data and applicable stores**.
- [ ] Confirm live Vercel endpoint, provider response format, daily allowance and browser-device UX.
- [ ] Add globally shared rate limiting and durable cache before opening to broad traffic.
- [ ] For a **"verified working"** badge: partner with merchant cart API, create an eligible test cart and check \`applicable:true\` / actual discount before showing confirmed savings.
- [ ] Optional after V3: automatic restock/price/discount alerts for signed-in users with explicit opt-in and approved provider terms.

**Privacy, compliance & user trust:** Do not scrape private checkout systems, automate fake account signups, bypass anti-bot systems, or invent/guess codes. Respect each provider's API rights, store terms, affiliate rules and rate limits.
