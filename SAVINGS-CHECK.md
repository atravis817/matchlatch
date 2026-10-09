# MATCHLATCH — Savings Check

**Stage:** V3 Shopping Infrastructure — UI implemented; **Awin publisher integration code implemented, but credential setup and live verification pending**.

**User-facing name:** **Savings Check.** It runs automatically when Private Shop or the saved-items shopping interface displays a retailer offer. A shopper can see active publisher-listed discount codes and copy one to try at the merchant's checkout. All user-facing surfaces remain MATCHLATCH branded.

## Current provider: Awin

Awin publisher approval obtained October 8, 2026. The user has generated an API credential, but no private credential or Publisher ID is yet configured in MATCHLATCH's Vercel environment.

- Source: [Awin Publisher Offers API](https://help.awin.com/apidocs/promotions), **POST** \`https://api.awin.com/publisher/{publisherId}/promotions\`.
- Auth: [Awin Bearer token](https://help.awin.com/apidocs/api-authentication), using the \`Authorization\` header on the **server only**. The user's "API key" needs to be the Awin Publisher API access token, not an Advertiser Create Transactions API key.
- Advertiser mapping: [GET joined programmes](https://help.awin.com/apidocs/get-program-information), using merchant \`displayUrl\` and \`validDomains\` rather than fuzzy store-name matching.
- Only joined advertisers with visible voucher codes; requested \`US\` region, active status and voucher type. Exclude unknown advertisers, missing codes, invalid dates and regional mismatches.
- Response status \`listed_not_checkout_verified\` means that Awin currently lists the code, **not** that a particular user's basket qualifies or that checkout has accepted it.
- Awin API rate limit: **20 calls/minute/user**. The beta endpoint uses in-instance 30-minute caching, a short failure cooldown and a bounded offer scan (maximum 3 pages of 200 offers). **Serverless instances do not share this cache.** Production-scale use needs a shared snapshot, global rate limit and scheduled refresh.
- Product prices and outfit budget totals are **never reduced** by a code until a partner's cart API can verify applicability.

## Activate Awin on Vercel (production)

1. Obtain your numeric Awin Publisher ID from the Publisher Dashboard. The ID is not the API credential.
2. Open [Vercel MATCHLATCH project settings](https://vercel.com/dashboard) → matchlatch → Settings → Environment Variables.
3. Add exactly these variables for the **Production** environment:

   | Variable | Type | Value |
   | --- | --- | --- |
   | \`AWIN_API_TOKEN\` | **Sensitive / encrypted** | Your private Awin Publisher API access token |
   | \`AWIN_PUBLISHER_ID\` | Plain (non-secret ID) | Your numeric publisher account ID |

4. **Never paste the access token into ChatGPT, client JavaScript, GitHub, or a URL query string.** Awin credentials are personal and grant API access to all associated publisher accounts.
5. Redeploy the production branch **after** saving the environment variables (environment changes are not retroactive to completed deployments).
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
- [ ] Configure Awin Publisher ID and private token in production Vercel.
- [ ] Confirm real Awin API calls and retailer assortment; adjust any live response differences.
- [ ] Test on iPhone and desktop with real selected Private Shop products.
- [ ] Before inviting broad users, add centralized caching/rate limiting and handle full-pagination feed coverage.
- [ ] Before advertising "verified working" codes, integrate actual merchant-cart validation for supported retailers.
