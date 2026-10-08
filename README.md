# MATCHLATCH

**Your style, unlocked.** Early fashion-discovery prototype.

Live deployment: https://matchlatch.vercel.app

## What works

- Mobile-friendly photo upload and preview
- Style profile (expression, fit, occasion, notes), saved locally on the device
- Budget input for complementary pieces
- Guided Styling: manually select item type and color, then generate a coordinated three-piece outfit plan
- Per-item shopping-search links (Google Shopping queries; not a real catalog or verified pricing)
- Optional server-side Gemini image analysis, once a key is configured

## Enable AI photo analysis (optional)

1. Open [Google AI Studio](https://aistudio.google.com/apikey) and create an API key in a project with an appropriate free-tier or spending cap.
2. In **Vercel → MATCHLATCH project → Settings → Environment Variables**, add:
   - Name: `GEMINI_API_KEY`
   - Value: your key (never paste it into this repository or a public chat)
   - Environment: Production (add Preview if desired)
3. Redeploy the latest commit so the function sees the environment variable.
4. Upload an image on MATCHLATCH and click **ANALYZE PHOTO WITH AI**.

The default backend model is `gemini-3.8-flash`. To change it, optionally set `GEMINI_MODEL` in the Vercel environment settings. Model availability, tiers, quotas and prices can change; confirm in Google AI Studio.

**Security/cost note:** The /api/analyze endpoint is a public, unauthenticated prototype. Before distributing MATCHLATCH widely or attaching a paid API plan, add authentication, durable rate limiting, monitoring, and provider quota/spending limits. Do not expose a paid key on a public prototype.

**Privacy note:** Style settings are stored in browser localStorage. Photos are processed in-browser for preview/compression and are not stored by this app. Pressing AI analysis uploads a compressed photo to Vercel's function, which sends it to Google's Gemini API. Review Google's data-use terms before using private or sensitive imagery.

## Project structure

- `index.html` — entire responsive frontend, including Guided Styling
- `api/analyze.mjs` — Vercel Node function that securely reads the AI key from the server environment

No npm packages, build step or database required yet.

## Demo test

1. Upload an inspiration photo.
2. Set **Item type** to Shoes and **Main color** to White.
3. Select your style, occasion and target budget.
4. Click **BUILD WITH GUIDED MODE**.
5. Review suggested coordinating pieces and use **Find options** to open product searches.

Guided Styling is rule-based, not visual image recognition. AI identification requires the configured API. Shopping links are search queries, not current inventory or product prices.

## Next milestones

- Account-based authentication and stored profiles
- Live product-search integrations with trustworthy prices, links and inventory data
- Ranking and budget optimization against real product prices
- Saved outfits and favorites
- Referral/affiliate tracking and sustainable business model
- Later: virtual try-on, checkout, and order tracking
