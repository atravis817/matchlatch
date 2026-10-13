# MATCHLATCH — Savings Check

**Stage:** V3 Shopping Infrastructure — UI implemented; Awin publisher credentials are configured in Vercel production, **but account feed eligibility, real promotions and checkout use have not been live-verified**.

**User-facing name:** **Savings Check.** In the next staged curation release, it runs only for a selected, personally suitable product, or within its saved product detail. A shopper can see active publisher-listed discount codes and copy one to try at the merchant's checkout. All user-facing surfaces remain MATCHLATCH branded.

## Current provider: Awin

**Core principle:** Personal curation is the hard gate. Awin promotions appear only after a suitable product has been chosen; affiliate revenue, coupons and advertiser payments never influence garment selection. See [POC-04 Awin Curation Priorities](AWIN-CURATION-PRIORITIES.md).

Awin publisher approval was recorded October 8, 2026. As of October 9, Vercel lists AWIN_API_TOKEN and AWIN_PUBLISHER_ID for production; their secret values were not viewed. This proves configuration presence only, not API success, eligible joined retailers, or working codes. A legacy product-feed download key is a different credential and is not currently configured.

- Source: [Awin Publisher Offers API](https://help.awin.com/apidocs/promotions), **POST** \`https://api.awin.com/publisher/{publisherId}/promotions\`.
- Auth: [Awin Bearer token](https://help.awin.com/apidocs/api-authentication), using the \`Authorization\` header on the **server only**. The user's "API key" needs to be the Awin Publisher API access token, not an Advertiser Create Transactions API key.
- Advertiser mapping: [GET joined programmes](https://help.awin.com/apidocs/get-program-information), using merchant \`displayUrl\` and \`validDomains\` rather than fuzzy store-name matching.
- Only joined advertisers with visible voucher codes; requested \`US\` region, active status and voucher type. Exclude unknown advertisers, missing codes, invalid dates and regional mismatches.
- Response status \`listed_not_checkout_verified\` means that Awin currently lists the code, **not** that a particular user's basket qualifies or that checkout has accepted it.
- Awin API rate limit: **20 calls/minute/user**. The beta endpoint uses in-instance 30-minute caching, a short failure cooldown and a bounded offer scan (maximum 3 pages of 200 offers). **Serverless instances do not share this cache.** Production-scale use needs a shared snapshot, global rate limit and scheduled refresh.
- Product prices and outfit budget totals are **never reduced** by a code until a partner's cart API can verify applicability.

## Validate current Awin configuration on Vercel (production)

1. Obtain your numeric Awin Publisher ID from the Publisher Dashboard. The ID is not the API credential.
2. Open [Vercel MATCHLATCH project settings](https://vercel.com/dashboard) → matchlatch → Settings → Environment Variables.
3. Confirm these two existing variables are configured for the **Production** environment; do not duplicate or expose their values:

   | Variable | Type | Value |
   | --- | --- | --- |
   | \`AWIN_API_TOKEN\` | **Sensitive / encrypted** | Your private Awin Publisher API access token |
   | \`AWIN_PUBLISHER_ID\` | Plain (non-secret ID) | Your numeric publisher account ID |

4. **Never paste the access token into ChatGPT, client JavaScript, GitHub, or a URL query string.** Awin credentials are personal and grant API access to all associated publisher accounts.
5. If any environment variable is changed, redeploy when the next approved build is ready (environment changes are not retroactive to existing deployments).
6. Visit \`https://matchlatch.vercel.app/api/savings?domain=retailer-domain.com\` with a retailer you have joined on Awin. This is a public, read-only merchant lookup; never put the token in the URL.
7. Check \`status\`: \`not_configured\` (credentials missing), \`provider_unavailable\` (API or mapping failed), or \`listed_not_checkout_verified\` (Awin request succeeded). A valid response with zero offers can mean **no joined advertiser match**, no currently active voucher code, or the beta's bounded page scan.
8. In Private Shop test the listed code against a retailer test basket without purchasing. Confirm the retailer's restrictions and that the displayed MATCHLATCH price has not silently changed.

## Key data and trust boundaries

| What we know | Safe label |
| --- | --- |
| No Awin config | "Savings Check · Feed not connected" |
| Awin error/limit | "Savings Check · Unavailable" |
| No codes in consulted joined advertiser feed | "No listed codes" |
| Awin currently lists a voucher | "Public code listed · Checkout eligibility unconfirmed" |
| Merchant cart confirms this product/basket qualifies (**future**) | "Applied when tested at [retailer]" with timestamp and actual price |

Don't scrape restricted retailer checkout systems, attempt fake account signup, bypass anti-bot measures, guess codes or promise that listing means guaranteed savings. We must comply with Awin/advertiser terms, including any attribution and compensation disclosure requirements.

## How the code is organized

- \`api/savings.mjs\`: reads only \`AWIN_API_TOKEN\` / \`AWIN_PUBLISHER_ID\` from private server environment; queries joined advertiser programmes and active US vouchers; maps a voucher to a known merchant hostname. Its outbound hostname is fixed at \`api.awin.com\`. It neither accepts arbitrary upstream URLs nor exposes private tokens.
- \`savings.js\`: user-facing, provider-neutral automatic lookups; batches up to 15 hostnames per request, short-lived local cache, expandable details and copy-code action.
- \`savings.css\`: accessible, understated details display.
- \`scripts/audit.mjs\`: static checks for credential isolation and link wiring.

For additional providers later, retain the normalized response shape, merchant match and "unverified until retailer acceptance" policy. The former unconfigured LinkMyDeals prototype has been replaced rather than left as unused production integration code.

## Beta test gates

- [x] Product UI, price-preserving offer display, copy-code flow and merchant-domain validation implemented.
- [x] Awin backend adapter and normalized provider fields implemented.
- [x] Mocked Awin filtering/security test: matched joined advertisers, excluded unrelated/expired/region-mismatched vouchers, cache, missing credentials, cross-origin protection.
- [x] Production Vercel lists Awin Publisher ID and private token variable names (secret values were not inspected).
- [ ] Confirm real Awin API calls and retailer assortment; adjust any live response differences.
- [ ] Test on iPhone and desktop with real selected Private Shop products.
- [ ] Before inviting broad users, add centralized caching/rate limiting and handle full-pagination feed coverage.
- [ ] Before advertising "verified working" codes, integrate actual merchant-cart validation for supported retailers.
