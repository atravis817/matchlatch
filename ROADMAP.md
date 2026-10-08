# MATCHLATCH — Product Development Work Map

> **North star:** Your style, unlocked. Turn a photo into a complete, personal, realistically shoppable outfit, and ultimately into a reliable multi-outfit shopping concierge.
>
> **Roadmap version:** 1.1 · **Last reviewed:** October 8, 2026 · **Canonical location:** `ROADMAP.md` on `main`.
>
> **Current position:** **V1 — The Magic Trick** and **V1.5 — Personal Style** are built and awaiting critical live validation. **V2 — REVEAL** now has a full approved design blueprint (working name; implementation not begun). V2-A camera work can be developed independently, but generation/AR claims and broad testing wait for the necessary security, cost and real-device gates. Selected V3 foundations exist early; V3 itself is **not complete**.

## Status language (important)

- **Done:** Implemented **and** demonstrated through the defined acceptance checks. Never use "done" for code that merely exists.
- **Built / needs validation:** Feature code and structure are present; live or human-device acceptance is still unproven.
- **Seeded early:** Part of a future stage was built to support today's workflow, not enough to complete that stage.
- **Planned:** Scope agreed; implementation not started or not verified.
- **Blocked:** A named dependency prevents meaningful progress.

**Milestone discipline:** Mark a checklist item complete only when we have test evidence. Keep failed and deferred work visible. Avoid adding unrelated features until the current stage's exit criteria are met.

## Overview

| Stage | Mission | Current state | Next gate |
| --- | --- | --- | --- |
| **V0 — The Foundation** *(retrospective)* | Clean, recognizable app, technical groundwork and secure storage | **Done for repository foundation** | Keep quality checks passing |
| **🥚 V1 — The Magic Trick** | Photo → recognition → real products → alternatives → total outfit budget | **Built / needs validation** | Proven live, end-to-end retailer flow |
| **🥚 V1.5 — Personal Style** | Questionnaire + personal wardrobe preferences that persist and affect results | **Built / needs validation** | Proven two-device profile and photo sync |
| **🥚 V2 — REVEAL (Live + Snap)** | Live-first camera + photo try-on, then genuine motion-tracked garments | **UX designed / build next** | V2-A camera foundation; V2-B opt-in generation; V2-C truthful AR |
| **🥚 V3 — Shopping Infrastructure** | Shopping history, retailer integrations, automation and transactions | **Seeded early / mostly planned** | Reliable checkout/order or merchant-handoff path |
| **👹 V4 — MONSTER** | Conversational multi-outfit concierge constrained by budget, event, deadline and delivery | **Vision / planned** | Multi-outfit fulfillment feasibility demonstrated |

## V0 — The Foundation · DONE (codebase foundation)

**Why it exists:** This is a retrospective inventory, **not a replacement for the original V1–V4 stages**.

- [x] MATCHLATCH identity, logo, tagline, responsive monochrome UI and four app screens.
- [x] GitHub repository + Vercel-hosted site.
- [x] Guided Styling path that doesn't require paid image analysis.
- [x] Private beta OpenAI photo-analysis endpoint with server-side API key, gate and no-store request.
- [x] Supabase project, owner-scoped records table, private inspiration-photo bucket and row-level policies applied.
- [x] Static code audit added at `scripts/audit.mjs`; obsolete styles/state and dead logic cleaned up.
- [x] Initial documentation, privacy and integration limitations recorded.
- [ ] **Continuous integration for the audit** — audit script exists, but automatic GitHub Actions execution was **not** confirmed or installed.

**Guardrail:** Reuse existing architecture. Avoid unnecessary frameworks, shadow implementations, duplicate panels and storing retailer search results permanently.

## 🥚 V1 — The Magic Trick · BUILT / VALIDATING

**Original promise:** Upload one clothing/accessory photo. The app identifies the piece, searches, finds purchasable options, compares prices, finds alternatives, builds complementary pieces and gives a total outfit price. **No internal checkout required.** First use should feel magical, not technical.

### Built so far

- [x] Photo upload, preview/compression and optional AI item identification; Guided Styling fallback.
- [x] Three complementary styling recommendations and original inspiration/photo linkage.
- [x] Nine-slot outfit tree in this order: **Hat → Scarf → Jacket → Shirt → Watch → Belt → Pants → Socks → Shoes**; optional slots may be skipped.
- [x] Circular previous/next controls for alternatives to a single slot.
- [x] **Private Shop** in-app drawer to explore/select alternatives. It is **not** incognito and it does **not** embed retailer checkout.
- [x] Shopify Global Catalog connector code with USD-price, availability, category and size filters; links to retailers.
- [x] Merchandise subtotal, per-piece remaining-budget logic and over-budget swap rejection.
- [x] Previously selected retailer variants rechecked when reopening saved outfits/cart/favorites.
- [x] Styling-only recommendations retained as a quiet fallback if live product discovery cannot help.

### Not yet proven or not yet complete

- [ ] **P0:** Successfully return actual product variants/prices/images from the **deployed** `/api/shop` endpoint; validate Shopify profile negotiation, field mapping, seller URL and error responses.
- [ ] **P0:** Verify photo → AI identification → real product discovery → category alternatives → budget total → retailer handoff on actual mobile **and** desktop.
- [ ] **P0:** Verify that stale stock, unavailable sizes and changed prices never appear as guaranteed purchasable options.
- [ ] **P1:** **Meaningful price comparison** between similar alternatives/retailers (cheapest eligible variant, clear side-by-side price differences), not merely a list of prices.
- [ ] **P1:** Evaluate whether retailer assortment and sizing are consistently useful; graceful empty states must not invent products.
- [ ] **P1:** Accessibility, loading and responsiveness on iPhone/mobile; no surprising auto-swaps or obstructive panels.
- [ ] **P1:** Abuse controls / API rate limiting before inviting broad public traffic.

### V1 exit gate

A first-time **guest** can upload one photo and, without help: recognize the item (via AI when beta access is available), view real currently reported offers with genuine prices and sizes, compare and cycle alternatives, create a complete outfit **within its merchandise budget**, and open the chosen retailer. Errors must fail honestly; tax/shipping and stock uncertainty must be disclosed. **Only then mark V1 Done.**

## 🥚 V1.5 — Personal Style · BUILT / VALIDATING

**Original promise:** The questionnaire and persistent profile make suggestions personal, rather than generic.

### Built so far

- [x] Personal preferences: aesthetic, expression, fit, occasion, color palette, climate, coordination and budget.
- [x] Detailed sizing choices across clothing, footwear and accessories; brand-specific fit is **not** assumed.
- [x] Guest preferences saved locally; private signed-in account/profile/cloud-sync code implemented.
- [x] Supabase database and private photo storage, user-specific RLS and an opt-in guest-to-account import.
- [x] Saved outfits, favorites, cart and manual purchase notes linked to original inspirations (also seed V3).

### Not yet proven

- [ ] **P0:** Real email magic-link sign-in/sign-out, site redirects and session restoration on the deployed app.
- [ ] **P0:** Same account on two devices gets the same style profile, original photos, outfits and chosen pieces.
- [ ] **P0:** Two separate accounts cannot access one another's rows/photos; guest data doesn't silently merge.
- [ ] **P1:** Profile changes reliably affect actual outfit and retailer selection (especially budget, category size and aesthetic).
- [ ] **P1:** Handle interrupted network, duplicate events and concurrent edits without misleading "synced" status.
- [ ] **Launch/privacy requirement:** Implement account-data export/deletion and clarify storage lifecycle before public release.

### V1.5 exit gate

A returning user can save their questionnaire, sign in, open a second device and find **their own** preferences, looks and images intact, with meaningful stylistic differences from an unrelated profile. The account switch/privacy tests must pass. **Only then mark V1.5 Done.**

## 🥚 V2 — REVEAL · SIGNATURE EXPERIENCE / DESIGN COMPLETE, BUILD NEXT

**Our V2 signature feature:** **REVEAL — Your look. On you.** This supersedes the generic in-app name "Virtual Try-On." The brand name remains **provisional** pending a trademark/name review.

**[Read the full REVEAL Live + Snap user-flow blueprint →](REVEAL-EXPERIENCE.md)**

### The modes our users will see

- **REVEAL LIVE — hero mode:** Open a real live camera feed, move freely, get framing/body-position guidance, choose **Capture Look**, and—after explicit consent—generate a preview for the currently selected garment. A **true garment overlay that responds to movement** is a further V2 milestone and may need device-specific implementation; never call a camera feed alone "real-time AR."
- **REVEAL SNAP — native still-photo option:** Take a photo in-app, retake/crop it and optionally generate a try-on preview of a selected garment.
- **Use an existing photo:** Equal-quality fallback for denied/unavailable camera permissions, supported on mobile and desktop.

### Planned delivery gates within V2

- [x] **V2 design gate:** Live-first mode selection, Snap/upload flow, user journey map, branded microcopy, wireframes, error states, privacy/cost requirements and acceptance criteria are written in [REVEAL-EXPERIENCE.md](REVEAL-EXPERIENCE.md).
- [ ] **V2-A — Camera foundation:** In-app entry points from the outfit tree/Private Shop and saved looks; camera permission, full-screen feed, still capture, retake, upload fallback, release of tracks on close and accessible mobile controls.
- [ ] **V2-B — Generated try-on preview:** Review a person photo and the **exact** selected garment/retailer variant; explicit consent and controlled paid-generation request; before/after results, regenerate, save/delete, and original shopping link.
- [ ] **V2-C — Motion-tracked garment overlay:** Prove a garment actually follows user movement with reasonable size, alignment and occlusion on target devices. Evaluate browser pose/renderer approaches and iPhone compatibility. If this cannot be delivered credibly, keep the **Live camera + guided capture** experience honestly labeled and don't declare true live AR done.
- [ ] **V2-D — Beta-ready REVEAL:** Validate output realism across use cases/body types, mobile performance, privacy, retention, failure recovery, API cost/rate caps and clear preview limitations.

### V2 guardrails

- **Not built yet:** No REVEAL camera UI, generated try-on endpoint, or responsive garment overlay exists in the current MATCHLATCH repository at the time of this roadmap update.
- **Put-it-on baseline:** A previously discussed candidate, **not** an integrated or audited component. Inspect source/license/performance before using it.
- **Privacy:** Browser camera starts only on tap and never requests the microphone. Do not automatically store body/selfie images in the existing inspiration-photo bucket; use an opt-in, separately secured retention plan.
- **Accuracy:** The preview is a generated visualization, **not** an exact fit, body measurement, physical garment guarantee or evidence of live stock.
- **Budget:** No new unapproved billable API; server-controlled generation quotas and rate limits before testing.

**V2 exit gate:** A user can start from a real saved outfit, open REVEAL Live or Snap, capture or choose a photo, get an explicitly generated visualization of a supported garment, compare it and return to its exact retailer variant; privacy and failure handling pass on real devices. **Any claimed live AR overlay must also genuinely follow motion and pass motion-tracking tests.**

## 🥚 V3 — Shopping Infrastructure · SEEDED EARLY / MOSTLY PLANNED

**Original vision:** Checkout, payments, order tracking, saved outfits, price/discount monitoring, restock monitoring, purchase history and stronger retailer integrations.

### Seeded during V1/V1.5

- [x] Saved outfits and inspiration-image archive.
- [x] Favorites and a shortlist/cart (not a payment cart).
- [x] Manual, self-reported purchase records (not confirmed orders).
- [x] Selected variant references and retailer handoff. Live rechecks must still be verified.

### Later V3 builds

- [ ] Merchant/affiliate integrations and transparent outbound attribution; prove terms, accurate tracking and actual revenue.
- [ ] Better variant resolution, size charts, shipping costs, taxes, merchant coverage and pricing freshness.
- [ ] Price-drop, discount and restock monitoring **only if a compliant, reliable data source permits it**; alert opt-in and sensible polling.
- [ ] Order capture/tracking from consenting users via supported retailer/shop integrations.
- [ ] Decide **merchant checkout vs. in-app checkout** before engineering payments; don't promise universal payment support.
- [ ] If first-party checkout is justified: payment processor, refunds, support obligations, compliance and fraud controls.
- [ ] Export/deletion, retention rules, operational alerting, stronger rate limits and customer support workflows.

**V3 exit gate:** A user can move from a saved, currently verified item to a dependable purchase flow; any price/restock/order notification corresponds to a supported provider signal. Real payments and real orders are never inferred from manual records.

## 👹 V4 — MONSTER · LONG-TERM VISION

> "I need something for Miami next weekend. $400 maximum. Three outfits. I want them delivered before Thursday."

**North-star behavior:** MATCHLATCH acts as a shopping concierge, not just a stylist.

1. Parse destination, occasion, weather, personal style, exact due date, address region and one **shared** budget across outfits.
2. Compose multiple coordinated outfits; reuse selected pieces where helpful rather than charging the user for duplicates.
3. Confirm purchasable product variants, shipping eligibility and size—not just products that look close.
4. Include shipping/tax/discount implications in the true spend estimate and honor total budget.
5. Verify retailer order cutoffs and expected delivery windows; **never guarantee delivery** without dependable seller confirmation.
6. Offer transparent tradeoffs (fastest, cheapest, preferred style), checkout options and post-order status where providers support them.
7. Eventually make the flow conversational while retaining explicit user confirmation before any financial commitment.

**V4 exit gate:** In a realistic controlled test, the user can request multiple event-ready outfits with budget and delivery constraints and receive a **feasible, traceable plan** with real variants, eligible seller offers and honest deadline confidence. No fictional delivery estimates, inventory or paid orders.

## Immediate work queue — the actual next moves

These are **tasks**, not new stages. Work them in order so we don't confuse task completion with version completion:

| Priority | Work item | Stage advanced | Evidence required |
| --- | --- | --- | --- |
| **P0** | Real Vercel + Shopify catalog response and price/stock/URL smoke test | V1 | Actual on-site result, valid product link and correct fallback |
| **P0** | Email link and two-device cloud/profile/photo test | V1.5 | Two accounts, two devices, owner-isolation checks |
| **P0** | Full upload-to-retailer guided/AI journey | V1 | Mobile + desktop screenshots/test notes and no budget overflow |
| **P1** | Genuine comparison and cheapest-in-budget alternatives | V1 | Real source prices for comparable available variants |
| **P1** | UX hardening, input/privacy/security checks and API usage limits | V1/V1.5 | Repeatable tests, not only static parsing |
| **P1** | Define invite-only beta success criteria and feedback intake | V1/V1.5 | Measurable task completion and user feedback |
| **P1** | Build REVEAL Live-first camera shell, Snap capture and image upload fallback | V2-A | Tested camera permissions, device handling and track cleanup; no false AR claims |
| **P1** | Audit Put-it-on baseline and try-on model options, licensing and costs | V2-B | Real evidence on one garment preview and per-generation expenses |
| **P2** | Feasibility test genuine motion-tracked garment rendering on mobile | V2-C | Demo where garment follows movement, evaluated against device limits |
| **Later** | Commerce data partnerships and monitoring | V3 | Provider terms + real integration and measurable results |
| **Later** | Multiple outfits with deadline-constrained fulfillment | V4 | End-to-end scenario with reliable data |

## Record of how we arrived here

| When | Decision / work completed | Where it fits |
| --- | --- | --- |
| Original product plan | Preserved the five named releases: V1, V1.5, V2, V3 and V4 MONSTER. | Product north star |
| Early build | Brand, responsive UI, Studio, Guided Styling, OpenAI photo-analysis beta. | V0 + V1 |
| Personalization build | Sizing questionnaire, preferences, favorites, outfits, cart and original-photo links. | V1.5 + early V3 |
| Secure account build | Supabase project created; private owner-scoped database/photo storage configured; client cloud sync committed. | V1.5 |
| Product discovery build | Nine-part cyclic outfit tree, Private Shop drawer, Shopify catalog integration code, spending guardrails. | V1 |
| October 8, 2026 | Repository-wide code cleanup: removed obsolete state/CSS, corrected Shopify lookup request, updated guidance; added repeatable static audit. | Quality across all stages |
| October 8, 2026 | Reconciled original stages with implemented and unverified work. | Roadmap v1.0 |
| October 8, 2026 | Named V2 working feature **REVEAL**, defined **Reveal Live**, **Reveal Snap**, and **Use an existing photo**; committed full user journey and honest AR milestones in `REVEAL-EXPERIENCE.md`. | V2 planning complete; implementation pending |

### Keeping the work map accurate

For future updates, make a small edit to **this file** and commit it whenever a stage gate passes or a major scope decision changes:

1. Change an item to `[x]` **only** after the acceptance check succeeds; link to a test result, issue, commit or concise verified note when available.
2. Update **Current position** and the overview table; don't casually rename V1–V4 or hide unresolved work.
3. Append one dated line to the history table describing what changed.
4. Preserve scope separation: **Private Shop ≠ checkout; manual purchase log ≠ order tracking; provider stock signal ≠ delivery guarantee; generated try-on ≠ guaranteed fit.**
5. Keep the codebase lean. Use `node scripts/audit.mjs` after changes, and add live integration tests for any external-provider-dependent feature.

**What we are NOT doing today:** Declaring V1/V1.5 launched before verification, claiming virtual try-on exists, inventing product availability or delivery dates, or starting payment processing just because V3's data models already exist.
