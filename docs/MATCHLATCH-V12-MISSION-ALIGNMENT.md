# MATCHLATCH V1.2 — Mission and Product Alignment
Status: PROPOSED FOR FOUNDER APPROVAL
Scope: Preview branch planning only. Not production policy or a claim of delivered capability.

## Proposed mission
At MATCHLATCH, our mission is to make shopping for clothes simpler, smarter, and more accessible for everyday people.

We help busy, budget-conscious shoppers discover clothing that fits their lives, preferences, and budgets—without the endless searching, confusing sizing, unavailable items, and hassle of shopping across multiple retailers.

By bringing personalized styling, practical product discovery, and a more convenient shopping experience together, we aim to give people back their time and make getting dressed one less thing to worry about.

Working tagline: Less searching. More living.
Customer promise: Your style. Your budget. One simpler way to shop.

## Primary customer hypothesis
Time-pressed, value-conscious U.S. shoppers seeking everyday, work, occasion and family clothing. Validate through interviews and task-based testing rather than assuming demographics imply behavior.

## Product decision rules
1. Prioritize complete affordable outfits over endless product listings.
2. Accept natural-language occasion, budget, fit and size requests; never invent fit certainty.
3. Report total merchandise cost and distinguish unknown tax and shipping before checkout.
4. Recommend only authorized, eligible, in-stock variants supported by fresh provider evidence.
5. Explain empty results accurately; never fabricate inventory or trigger unnecessary AI calls.
6. Support swapping individual outfit items without restarting the full styling journey.
7. Reduce tabs and checkout fragmentation only where an authorized integrated merchant flow exists.
8. Clearly identify the merchant, fulfillment, shipping, returns, and checkout boundaries.
9. Preserve customer data privacy, source permissions, and server-enforced access controls.
10. Never claim that all retailers, all sizes, universal checkout, or guaranteed fit are supported.

## Current evidence vs gaps (2026-10-12)
- V1.2 Studio currently blocks live Shopify styling while commercial display and third-party AI processing permissions remain unverified.
- Shopify Collective inventory is present in the connected store, but verified sellable stock and commercial checkout readiness remain open.
- The shared Supabase/Awin sample previously contained 899 private watch products; public eligibility and US shipping evidence were absent.
- Some responsive and synthetic product journeys have passed; real customer, physical iPhone, fulfillment and actual checkout tests remain incomplete.
- Shopify Collective is a candidate for eligible multi-supplier single checkout, not proof that MATCHLATCH's current store is eligible or operational.

## V1.2 customer acceptance tests (proposed)
A. A shopper can request a complete outfit for a real-life occasion within a set budget.
B. The result presents a small set of coherent alternatives using authorized catalog data or a clearly labeled demo.
C. Selected sizes and variant availability are reported faithfully; unknown fit stays unknown.
D. The shopper can replace an individual piece while maintaining budget and outfit coherence.
E. The cart accurately distinguishes available integrated checkout from external retailer handoffs.
F. A real customer, guest, and owner are isolated according to server-side permissions.
G. Desktop and physical iPhone Safari journeys do not dead-end.
H. Order, refund and support ownership are explicit before activating commercial transactions.

## Priority fixes to evaluate
P0: authorize connected supplier catalog use, verify sellable stock and store checkout eligibility.
P0: unify Studio/Store discovery rules without violating provider restrictions.
P0: variant-level inventory, size evidence and whole-outfit budget correctness.
P1: easy swap, honest tax/shipping disclosure, purposeful empty/loading/error states.
P1: real mobile/customer acceptance tests and measurable time-to-outfit benchmarks.
Deferred: social/creator features, speculative sizing guarantees, universal cross-merchant payments and advanced virtual try-on.

## Safety boundaries
No Production modifications, shared DB migrations, publication flag changes, supplier-priced inventory edits, third-party agreement acceptance, paid subscriptions, or checkout activation without separate authorization.

## Measurement hypotheses (not validated targets)
Track time to usable outfit, complete-look coverage within budget, variant availability at checkout, fit/size support requests, abandonment, repeat purchase, and contribution margin after variable costs.
