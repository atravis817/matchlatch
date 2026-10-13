# MATCHLATCH Awin advertiser onboarding — POC-05

**Date:** October 9, 2026. **Awin publisher:** MATCHLATCH (publisher account 3118944).

**Latest update:** Two *different* US programmes, ZazzMode (117849) and Cacio Pepe (126793), are now **Joined**, with independently generated affiliate tracking links. Their product feeds remain unverified and product publication disabled. The six programme statuses below reflect the initial POC-05 inspection. See [POC-06 joined partners and web discovery](JOINED-RETAILERS-WEB-DISCOVERY.md).
**Live account status:** Zero joined programmes, zero pending applications. These six targets were all confirmed **Not joined** by the connected Awin MCP, with active US programmes and deep linking allowed at the programme level.

**Application submission status:** NOT SUBMITTED. The connected Awin tools can read programmes and create links after joining, but do not include any operation to apply or accept advertiser terms. Awin requires the publisher to select the promotional method and accept each advertiser's terms directly in its UI. Do not claim membership, approval, accessible product feed, or commission until the live programme status proves it.

## First-wave application checklist

In [Awin](https://ui.awin.com), use **Advertisers → Join Programmes**. Search by programme name or Awin ID, review the merchant's current terms, choose the most accurate promotional type for AI-assisted curated fashion shopping, add the optional short description, accept terms, and submit. There is no public programme-application URL to invent.

| Priority | Advertiser | Awin advertiser ID | Best assortment role | Status Oct 9 |
|---|---|---:|---|---|
| 1 | W Concept (US) | 6016 | Independent-designer wardrobe | Not joined |
| 1 | Suitsupply (US) | 16225 | Tailoring and menswear | Not joined |
| 1 | MESHKI US | 15378 | Womenswear and occasions | Not joined |
| 1 | Under Armour US | 15431 | Activewear and sports-inspired looks | Not joined |
| 2 | Loci Wear Ltd | 83063 | Contemporary vegan footwear | Not joined |
| 2 | Varley US | 106789 | Modern women's daily wardrobe | Not joined |

Optional application descriptions (all under 150 characters; edit to reflect your actual promotional method):

- **W Concept:** MATCHLATCH curates designer fashion around each shopper's style, size and budget, linking to relevant individual pieces.
- **Suitsupply:** MATCHLATCH helps shoppers find tailored menswear matched to occasion, fit and budget, with direct retailer product handoffs.
- **MESHKI:** MATCHLATCH curates women's fashion to match personal aesthetic, occasion, size and budget before suggesting retailers.
- **Under Armour:** MATCHLATCH matches activewear and shoes to personal preferences, size and price limits, with savings considered second.
- **Loci:** MATCHLATCH recommends contemporary footwear based on each shopper's fit, color, style and budget.
- **Varley:** MATCHLATCH presents personalized women's clothing recommendations, with verified products ahead of promotions.

After submission, check **Advertisers → My Programmes → Pending**. Approval may require review; a Joined status can take time to appear. The API and production data must recheck status before any product is exposed.

## Backend pieces that are now in place

### Supabase
Project: MATCHLATCH (`odxqxymwlwnbqginqems`).

Migration `awin_retailer_catalog_gated` **applied** October 9. It created:

- `public.matchlatch_awin_partners`: six private candidate rows, joined/feed/browse/checkout readiness tracked separately. Not readable to anonymous users.
- `public.matchlatch_awin_products`: indexed catalog with exact variants, price, size, color, merchant domain, Awin referral link, reported availability, US shipping eligibility, feed timestamps and public availability gate.
- RLS and triggers: public listing reads require `is_public=true`, listed availability, US shipping eligibility and unexpired feed; publication requires recently verified joined membership, feed verification and explicitly enabled browsing. Downgrading partner readiness unpublishes listings.

**Verified:** six candidate rows, zero imported products, zero public products. Supabase security advisor's informational notice that the private partner table has no anonymous policies is intentional.

### Vercel
`MATCHLATCH_SUPABASE_URL` and `MATCHLATCH_SUPABASE_PUBLISHABLE_KEY` are configured as encrypted environment variables for **Preview and Production**. The catalog browser uses the public key under RLS, NEVER a privileged role. Existing `AWIN_API_TOKEN` and `AWIN_PUBLISHER_ID` remain **Production only**. Variable values must not be exposed in browser responses or GitHub.

New environment variables apply only on a **new Vercel deployment**; production has not been redeployed.

### Application code (unreleased)
- `lib/awin-retailers.mjs`: shortlist, verified advertiser IDs, approved merchant-domain patterns and membership gate.
- `lib/awin-public-catalog.mjs`: bounded RLS-only Supabase search and exact-variant verification, never downloads feeds in a shopper request.
- `api/shop.mjs`: combines existing Shopify Global Catalog results with **only published Awin rows**, independently isolating provider failures.
- `library.js`: Awin rows can enter the existing single MATCHLATCH cart, but product identity and feed status are rechecked before any retailer handoff.
- `scripts/sync-awin-feeds.mjs`: private, manual Enhanced JSONL importer. It checks Awin joined programmes, allows only the six registered merchants and their domains, filters valid US fashion products, rejects incomplete feeds, writes staged products to Supabase, and respects Awin's feed throttling.
- `scripts/test-awin-integration.mjs`: repeatable no-network contract tests for account/domain/offer gating and exact-variant handoff.

**There are no live Awin fashion products in MATCHLATCH at present.** Awin publisher programme membership is not identical to accessible feed permission, and a successful feed download is not proof of live inventory or native checkout.

## Steps needed after approvals

1. Obtain a **Supabase service-role secret** via your Supabase project settings, then store it securely as `MATCHLATCH_SUPABASE_SERVICE_ROLE_KEY` in your trusted sync runner's secret manager. Do **not** add this key to frontend code, publishable Vercel variables or messages.
2. Configure the four sync credentials for a trusted Node 20+ environment: `AWIN_API_TOKEN`, `AWIN_PUBLISHER_ID`, `MATCHLATCH_SUPABASE_URL`, `MATCHLATCH_SUPABASE_SERVICE_ROLE_KEY`.
3. Keep `AWIN_PUBLISH_APPROVED` unset and run `node scripts/sync-awin-feeds.mjs` to stage approved, accessible Enhanced en_US feeds **privately**. The script attempts no downloaded feeds for nonjoined merchants. Its 20 MB / 10,000-row per-feed beta limits must be reviewed before production-scale imports.
4. Audit actual feed completeness: price, size, color, stock signals, images, US shipping, valid merchant domain, fresh import, Awin tracked deep link availability, and manual checkout handoff. Nonqualifying offers must stay private.
5. After validating the product experience, set `AWIN_PUBLISH_APPROVED=1` in the trusted sync runner and rerun to publish only current qualified rows. Schedule future guarded refreshes **only after** a reliable job runner and monitoring are configured, because entries expire after 23 hours.
6. Deploy the POC-05 code to **Vercel staging first**, test iPhone browse → cart → exact-item retailer handoff with current feed data, and request sign-off before touching production.

If Enhanced JSONL is not available for an approved advertiser, inspect Awin's **Toolbox → Create-a-Feed**. Legacy CSV downloads use a **separate Product Feed API key**, not the standard Publisher Bearer token, and need their own importer/field mapping before activation. Do not use website crawling as a substitute.

## Checkout and style constraints

- Personal style, size, color, material restrictions, occasion and budget remain hard gates on **both providers**. Affiliate revenue, vouchers and offers cannot change which garments qualify.
- Shopify may offer a retailer checkout permalink. **Awin feed records do not create retailer shopping baskets, checkout sessions or a MATCHLATCH payment.**
- An Awin saved piece is rechecked against the currently published, unexpired feed. The user is then offered a transparent merchant-page handoff, preferably via an Awin tracking link only when actually supplied and valid.
- Users are told to confirm **current stock, size, tax, delivery and final price** on the retailer's site. Feed stock is not real-time stock.
- Affiliate links are disclosed in the checkout review when applicable. The shopping experience remains visually minimalist: product, price, cart and handoff, with no advertiser dashboard or promotion wall.

References:
- [Awin: How to join a programme](https://success.awin.com/s/article/How-do-I-join-an-advertiser-programme?language=en_US)
- [Awin: Enhanced Feed download](https://help.awin.com/apidocs/retail-publisher-productapidocumentation-1)
- [Awin: Product Feed List](https://help.awin.com/developers/docs/product-feed-list-download)

**Release:** Database schema and public-read Vercel configuration are prepared. New application code has not been deployed to staging or production. No programme applications have been submitted. No merchant stock, tracked sales or checkout orders have been fabricated.
