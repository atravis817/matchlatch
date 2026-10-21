# MATCHLATCH — Search & AI Discovery Architecture

## 1. Executive summary
Controlled foundation phase, 2026-10-14. Baseline: 815e3ca, PR #6. Static HTML/JavaScript with Vercel API functions; no framework migration. Production remains NO-GO. This branch prepares truthful content and machine understanding, not live search visibility or commerce activation.

## 2. Current architecture audit
Root index.html contains Studio, Store, My Closet, account and cart hash routes. about.html provides mission content. Supabase and server-side commerce gates remain unchanged. Latest observed baseline Preview: matchlatch-p1sig8rnv-matchlatch.vercel.app READY. PRs #2–#6 remain open. No newer remote branch commits observed after git fetch. Existing branches remain untouched.

## 3. SEO findings and implementation
NEW: canonical and social metadata on home/about. NEW: protected-build robots policy, empty sitemap and deployment-wide noindex header. No product pages indexed. NEW: 404.html recovery page; deployed HTTP status must be checked. Public crawl activation requires a separate release policy rather than shipping this noindex configuration unchanged.

## 4. AEO findings and implementation
IMPROVED: about.html answers digital closet, discovery, payment and getting-started questions with explicit limitations. Semantic HTML answers are available without client rendering. No fabricated FAQ rich-result claims.

## 5. GEO findings and implementation
IMPROVED: consistent brand description, no invented customers, ratings, endorsements or availability. Useful explanations can support future discovery, but protected Preview cannot earn public indexing. Search demand, competitive positioning and AI citation research remain unperformed.

## 6. AIO findings and implementation
NEW: minimal Organization/WebSite/WebPage graph with consistent entity IDs. No Product, Offer, reviews or unsupported application feature schema. JSON syntax and graph consistency are tested; external Schema.org/Google validators remain pending. llms.txt omitted because no authorized public knowledge surface currently needs one.

## 7. SXO findings and implementation
IMPROVED: About explains current value and links to existing Studio/Store destinations without adding a primary navigation item. Existing selection, size/date filtering and account boundaries remain intact. No success claimed for signed-in live discovery.

## 8. Brand entity architecture
Canonical intended origin: https://matchlatch.company (connected project domain, public release health still unverified). Organization /#organization; WebSite /#website; page-specific #page IDs. Founder identity omitted pending public-display approval.

## 9. Structured data
Brand-level statements only. JSON-LD is separately parsed by regression tests; audit no longer attempts to execute data scripts as JavaScript. No merchant data is copied into structured markup.

## 10. Public content strategy
Prioritize helpful how-it-works and trust answers after capability verification. Current About improvements remain protected. Keyword themes from the directive are hypotheses, not verified search-volume opportunities. Avoid bulk product/category pages.

## 11. Internal linking
About links to /#studio and /#store. Existing app navigation preserved. Static home/about canonicals distinguish documents, not private hash views.

## 12. Shopify catalog discovery boundaries
Internal imported inventory, live Global Catalog and Awin feeds remain distinct. No private 899-record publication, Global Catalog caching or model-processing expansion. Awin expansion paused. Nightly synchronization untouched.

## 13. Crawlability and crawler strategy
All root HTML carries noindex,nofollow; Vercel headers extend exclusion to assets and nested paths. robots.txt disallows crawling as an additional signal, not authentication. Empty sitemap deliberately lists no protected URLs. Vercel Authentication remains required. Before future release, create environment-aware public allowlists and retain noindex on account/admin/cart and previews.

## 14. Performance and accessibility
Added static text and a small graph, no external library or images. Logical h2/h3 questions and native links. Existing responsive styles retained. No Lighthouse/Core Web Vitals, assistive-technology or physical Safari results claimed.

## 15. Customer conversion architecture
Arrival → accurate explanation → Studio/Store → permitted discovery → save/review → authorized retailer handoff. Live outfit, full owned-item Closet and purchases remain unavailable. Copy explicitly distinguishes those limits.

## 16. Analytics and measurement
No tracking service activated. Proposed aggregate events: successful discovery, zero-result reason, saved look, permitted handoff and onboarding completion. Never include photos, identity, tokens, query text or shopping history. Define consent, retention and provider approval before implementation. Organic metrics require Search Console/Bing ownership; AI citations require observable evidence, not assumed coverage.

## 17. Files changed
NEW: robots.txt, sitemap.xml, vercel.json, 404.html, scripts/test-search-foundation.mjs, this document, HANDOFF.md.
IMPROVED: root HTML noindex; index.html/about.html metadata and brand graph; about.html truthful answers; scripts/audit.mjs JSON-LD handling; quality workflow branch coverage; ROADMAP.md.
Purpose: understandable brand and safe evaluation. Validation: deterministic tests and repository checks. Expected impact: fewer customer misunderstandings and a controlled starting point for later public discovery. Traffic impact is not measured.

## 18. Tests performed
196 tests pass; commerce policy passes; static audit passes; JavaScript syntax checks pass. Four new tests cover Preview exclusion, sitemap/header safety, graph consistency and limitation disclosure. No provider credentials, cart creation, purchases or database writes involved. Deployment and browser evidence appended to HANDOFF.md.

## 19. Remaining blockers
Public crawling/Production approval; branch-specific owner evaluation environment; authenticated customer browser journeys; own-profile public hosting; merchant rights and qualifying inventory; Search Console/Bing ownership; demand research; external schema validation; accessibility/performance field evidence; analytics approval. New branch does not inherit branch-scoped owner settings automatically. Do not silently copy secrets or change identity mappings.

## 20. Five-layer scorecard
Engineering rubric only: each discipline has five checks worth 20 points; partial/unverified checks earn zero. This measures repository evidence, not rankings, revenue or overall product readiness.

| Layer | Checks met after / before | Score after / before |
|---|---|---|
| SEO | metadata; canonicals; indexing controls / metadata | 60 / 20 |
| AEO | direct answers; honest limits; semantic content; actionable links / semantic content | 80 / 20 |
| GEO | consistent brand; grounded claims; capability limits / grounded mission | 60 / 20 |
| AIO | entity graph; graph tests; private separation / private separation | 60 / 20 |
| SXO | relevant CTAs; expectation clarity; navigation continuity / CTAs; navigation | 60 / 40 |
| Total | Repository checklist | 320 / 120 out of 500 |

Unmet checks: SEO deployed behavior and public search measurement; AEO customer usability; GEO external citation evidence and original expertise validation; AIO public profile and external validation; SXO signed-in journey and outcome measurement. Scores are intentionally provisional; no 95/100 claim.

## 21. Recommended next phase
WO-ML-018: verified Shopify-first catalog readiness and founder/tester journeys, before more growth content. Then demand research and customer-validated how-it-works pages, external schema/accessibility checks, approved aggregate measurement, and separately approved public indexing policy. Founder decisions: public capability claims, production/indexing release and analytics provider. No additional approval needed for continuing protected independent verification.

Official references: https://developers.google.com/search/docs/fundamentals/get-started-developers ; https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag ; https://developers.google.com/search/docs/appearance/ai-features . No special GEO schema or guaranteed visibility is asserted.


## Deployed verification — 2026-10-14
Application commit 4f7ba90a8bd8573eee8196089d4092137b8951f9; exact tree 9ec3bcda6d5f302a844bebb50ed43529bb577611 matches locally tested tree. Draft PR #8: https://github.com/atravis817/matchlatch/pull/8 . Protected Preview https://matchlatch-pti523o0k-matchlatch.vercel.app READY, deployment dpl_EzyVZcvRecvkzt264v8XfQUTHXvR. Authorized connector HTTP About check returned 200 with new answers, canonical, graph and X-Robots-Tag noindex,nofollow. Unknown path returned custom page and real HTTP 404. Browser visit reached Vercel login; layout/mobile/signed-in tests blocked. PR-filtered workflow API returned no runs; remote CI completion is not claimed. Local checks passed. Production, secrets, owner mappings and data unchanged.
