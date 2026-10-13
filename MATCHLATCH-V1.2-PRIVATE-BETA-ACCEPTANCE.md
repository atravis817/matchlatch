# MATCHLATCH V1.2 — Private Beta Acceptance Gate

Development branch: `design/v1.2-studio-first-100926`
Production: **DO NOT DEPLOY** until these gates pass.
Private beta must not imply published, verified shopping offers.

## Required access
- Invite individual trusted users with their own accounts. Do not share owner, GitHub, Vercel, Supabase, Awin, or OpenAI credentials.
- Access protected Preview with an explicitly authorized invitation. Do not disable Vercel Deployment Protection or publish bypass secrets.
- If the invitation mechanism is unavailable, use controlled staging after owner review; do not weaken privacy.
- Use separate Preview-only OpenAI project/key `MATCHLATCH_PREVIEW_OPENAI_API_KEY`. Never copy the Production key. Owner configures provider budgets and Vercel secret in dashboard.
- Consent must be explicit before external research. Testers must know private catalog records are not public offers.

## Beta release gates
- [x] Watch feed bulk import — 899 records; 898 feed-advertised available; 0 public.
- [x] Commerce tests — 15 passed in implementation report at efd7742.
- [x] Fail-closed eligibility — 0 verified shopping offers (expected until retailer authorization, fresh pricing and shipping).
- [x] Auth navigation and signed-out legacy-state code fixes committed after efd7742.
- [ ] New Preview deployment READY for latest commit.
- [ ] Browser visual acceptance on current Preview: iOS Safari, Android Chrome, desktop Chrome/Safari where available.
- [ ] Login, signup, verification, password reset, signout, pending-navigation resume, keyboard/modal behavior.
- [ ] Confirm user A cannot see user B's likes, outfits, folders, preferences or research.
- [ ] Confirm guest cannot persist personal data, or read private inventory, and logout clears visible personal data.
- [ ] Preview OpenAI isolated key configured, $5 budget and app caps verified, 1 authenticated consented live research, source/citation verification, actual meter and cache checks.
- [ ] At least one approved public offer with verified permission, fresh price, US eligibility and destination-specific stock/shipping before claiming a live shoppable experience. Beta can proceed as explicitly **non-transactional discovery test** without this, but testers must be informed.
- [ ] Scheduled refresh activated with narrow credentials and evidence from a real run; do not confuse workflow source with execution.
- [ ] Required owner reviews / branch protection configured by repo administrator.
- [ ] Accessibility: touch target size, keyboard focus, VoiceOver labels, contrast, reduced motion, dark/light mode.
- [ ] Production variables isolated; no sensitive values in client source, dev console or report.
- [ ] Owner signs off after review of remaining exceptions.

## Tester script
1. Open Preview from the approved invitation on phone; note device, OS, browser and time.
2. Test Studio landing after splash and initial load without login.
3. Tap Closet/Me, Create Look, upload photo and favorite/save; verify intended account prompt.
4. Register or log in; confirm intended action resumes and navigation remains understandable.
5. Create a look, change settings, save it, close and reopen, confirm account-owned persistence.
6. Sign out; verify no prior cart count, saved look, folder, preference or personal history is visible.
7. Sign in as second account; verify no first-account data appears.
8. Browse: try category, price, size, stock, shipping, coupons, empty/error states and product links.
9. With owner-approved research key and consent, search for "black sneakers under $120" and inspect evidence and unknown fields. No retailer checkout test until approved offer is available.
10. Attempt fast repeated searches: expect safe rate limits, no duplicate spend or stale personal results.
11. Capture screenshots of any bugs without revealing personal data or secret values.

## Evidence to record
Version SHA, Preview URL, test date, operating system/browser, each PASS/FAIL/BLOCKED, defect severity and reproducible steps, anonymous and cross-account API responses, retailer authorization evidence, exact product evidence timestamps, live AI cost/meter and scheduler execution logs. Never include secrets.

## Go/no-go
**Private UX-only beta** may proceed without approved public products or live AI **only if** tester invitation works, auth/data separation QA passes, and limitations are explicitly disclosed.
**AI commerce beta** additionally requires isolated Preview key and measured live research; it may still show research-only references rather than verified offers.
**Public product-shopping beta** requires at least one verified authorized public offer.
**V1.2 Production release** requires owner approval after all agreed production checks and staged-build acceptance; Preview READY alone is not enough.
