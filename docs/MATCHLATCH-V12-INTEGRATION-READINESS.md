# MATCHLATCH V1.2 integration Preview

## Recommendation

**NO-GO for a live-commerce or public Global Catalog release.** Suitable for further isolated Preview review with the existing fictional Studio demo. Public automatic discovery, Shopify AI processing and Preview checkout remain disabled. No Production release is authorized.

## Integrated sources

- Studio/commerce baseline: `4be293b4dc27442949a4ddf1943db253e5e0673a`.
- Global Discovery PR #2: `3d27ed4650d8f8937549c4478f0610b514df6b8f`.
- Integration branch: `integration/v1.2-global-discovery-20261013`.
- Existing Studio form, five navigation destinations, GreenGlass themes, owner Command Center, BASALT Storefront/shipping diagnostics, shortlist and saved-look functionality retained.
- Obsolete PR cart actions replaced with the current beta shortlist behavior. Returned product categories are preserved when adding eligible selections to the shortlist.

## Discovery changes

`lib/global-discovery.mjs` reuses the existing Shopify MCP transport and Store normalization. Nine categories are supported individually; a request permits at most three categories and two concurrent provider calls, with ten queried products and four qualifying variants per category. No retry, result persistence, image download, AI ranking or new deployable function is introduced.

Exact category, variant availability, USD price, explicit strict budget, size/system and solid-color constraints are applied after retrieval. Unknown shipping and taxes remain unknown; merchandise prices are not a complete outfit budget guarantee. Unsafe, ambiguous or contradictory inputs fail before provider calls. No checkout URL is exposed by this new path. Provider failures are sanitized; partial results are distinguished from an empty successful query.

The manual Store discovery control is hidden by default. It is revealed only after the configured capability and the existing verified-owner check succeed. The API independently requires Preview and verified owner authorization and applies its request limit. Navigation/account changes discard outstanding results.

### Configuration gates — leave unset until verified

- `MATCHLATCH_GLOBAL_DISCOVERY_ENABLED=true` — Preview only.
- `MATCHLATCH_GLOBAL_CATALOG_PROFILE_URL` — verified HTTPS MATCHLATCH-controlled agent profile, with the documented Catalog capabilities/extensions.
- `MATCHLATCH_GLOBAL_CATALOG_DISPLAY_EVIDENCE` — reference to reviewed commercial-display evidence, not an invented approval or credential.

These configuration fields record an operator decision; their presence does not independently prove rights. Public discovery is never enabled by them. Owner identity must match the existing verified UUID in `MATCHLATCH_ADMIN_USER_ID`, scoped to this integration branch. Other existing Preview Shopify credentials remain server-side.

## Verification

- `node --test scripts/test-*.mjs`: **138 passed, 0 failed**.
- Six additional discovery tests cover default-deny configuration, all nine synthetic categories, deduplication, two-call concurrency, partial errors, explicit constraints, invalid inputs and owner/guest/customer/Production denial.
- `node scripts/audit.mjs`: passed. Its shortlist category assertion now checks the preserved product category instead of overriding it with the current filter.
- `node scripts/check-commerce-policy.mjs`: passed.
- Authentication security coverage is mocked and is **not** proof of real customer-account isolation.
- No Global Catalog live product search, new cart creation, checkout, payment or order was executed in this integration task.
- Owner-reported BASALT availability and shipping observations from the previous milestone are historical, not fresh agent-executed verification.
- Code commit `74cd93f9d89368b7beaafe2a24bf960d2d283a26` deployed READY to https://matchlatch-jjtp5z4sa-matchlatch.vercel.app after copying the existing owner configuration to this branch. Vercel reports Preview (`target: null`), matching commit SHA; twelve API source functions remain.
- Initial browser attempt reached Vercel protection. After explicit owner approval on October 13, a temporary deployment-scoped share link allowed actual Preview browser QA. Application authentication and owner privileges were not changed. The tested application commit is `15410ffa5a68c5d39ebaab7866eceb9e639414fc`; subsequent QA documentation changes do not change application code.
- Automatic review initially rejected a temporary share link. The owner explicitly approved it in the following turn; one expiring link was then created. It is not committed to GitHub. Deployment protection remains configured.
- Git CLI push failed once because the workspace lacks push credentials. The connected GitHub API published the tested merge tree; its tree SHA exactly matched the local tested tree. The first branch-scoped environment write was rejected because the branch did not yet exist; it succeeded after GitHub branch publication. A fresh Preview loaded that configuration.
- New Global discovery configuration remains unset. No fresh authenticated BASALT or shipping execution was possible without an owner session.

## Release blockers and next actions

1. **Owner / Shopify:** establish MATCHLATCH's own agent identity and applicable API/Partner agreements and commercial product/image display rights. Official current Global Catalog documentation supports MCP discovery and an agent profile; the hosted tutorial profile is not MATCHLATCH commercial authorization. No new agreement has been accepted here.
2. **Owner / supplier:** retain independent Collective relationship, intended Headless publication/token association, usage and destination eligibility evidence. Successful Storefront availability alone does not clear these gates.
3. **Engineering, after evidence:** connect authorized candidates to the existing unified Studio eligibility contract without overriding permissions, shipping or inventory gates. Deterministic ranking first; no third-party AI processing authorized here.
4. **Testing:** real owner and two distinct customer sessions are needed to demonstrate cross-account separation, private catalog protections and owner diagnostic behavior. Do not replace missing sessions with bypasses.
5. **Commerce:** multi-merchant checkout is unsupported. A historical BASALT-only shipping diagnostic is not evidence for Global Catalog merchant delivery or a combined payment flow.

## Rollback / scope

Leave new discovery variables unset to keep the feature disabled. Revert the integration Preview to the prior Studio commit if required; do not promote or merge to main. No database migration, inventory write, catalog publication, supplier permission change, paid service, token rotation or Production change is part of this work.

Official references: https://shopify.dev/docs/agents/catalog ; https://shopify.dev/docs/agents/catalog/quickstart ; https://www.shopify.com/legal/api-terms . Recheck the applicable current terms before enabling commercial usage.

## Actual browser QA after approved Preview access

Tested in cloud Chromium. The 390px and 430px checks use the existing `preview-qa.html` same-origin frames; this is responsive layout evidence, **not physical iPhone/Safari or touch certification**.

| Check | Observed result |
| --- | --- |
| Studio form | One primary Find my outfit action, required Occasion/Style, total USD budget and optional notes visible. |
| Required/invalid budget | Native required-select validation; zero budget rejected with minimum $1. |
| Preferences | More preferences expands/collapses. Work, Business casual, $150, notes and shoe size 11.5 retained across same-page Store/Studio navigation. Unsupported photo styling disabled. |
| Guest submission/navigation | Styling submission, Mood, My Closet, Me and cart entry show sign-in. Store and fictional demo accessible; Studio/Store return navigation works. |
| Loading | Store loading text observed; fictional search disables its submit button and clears prior results while checking. |
| Reviewed Store empty state | A jeans/Bottoms search returned no qualified public Awin products, explicitly excluded private inventory and generated no AI recommendation. No Global Catalog search was requested. |
| Six fictional journeys | Sneakers $79, jeans $89, jacket $95, boots $99, dress $69 and watch $85 rendered as FICTIONAL TEST PRODUCT, with supplied sizes/units (or no size supplied for watch). These are synthetic test values, not real offers. |
| Details / empty state | Boot detail displays original synthetic size US 10 and a non-clickable fixture reference; no save/model/checkout actions. Size 99 returned an honest no-match state. |
| Imagery | Rendered fictional sneaker image decoded in 390px and 430px frames; Studio logo images decoded. Merchant imagery remains unverified. |
| Responsive measurements | Studio 390px, 430px and 1363px frames: no horizontal overflow. Demo 390px and 430px: no horizontal overflow. Studio light/dark themes visually inspected. |
| Guest live server checks | Public capabilities 200 (`staff=false`, Studio live discovery false); private catalog 403; owner fixture 403; demo save 403; fixture styling/save 401. These were actual deployment requests from the existing read-only QA controls. |
| New manual discovery control | Hidden to guest while new Global discovery configuration remains unset. |
| Real customer/owner sessions | **UNVERIFIED**. No signed-in sessions or new accounts were available; no authentication bypass attempted. |

Screenshots: [390px light Studio](qa/v12-20261013/matchlatch-390px-studio-20261013.jpg) and [430px dark Studio](qa/v12-20261013/matchlatch-430px-studio-20261013.jpg).

Browser automation encountered locator timing/name mismatches during fast asynchronous interactions; state-based waits then verified the intended results. No critical application defect was established in the bounded journeys. Full signed-in saved-product behavior, real isolation and provider network-failure visual states are still unverified. Browser QA made no purchases, orders, cart mutations, model calls, account creation, inventory writes or database changes. Recommendation remains NO-GO for public live commerce.
