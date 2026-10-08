# REVEAL — MATCHLATCH Signature Try-On Experience

> **Working feature name:** **REVEAL** (subject to brand/trademark checks before public promotion).
>
> **Feature line:** **Your look. On you.**
>
> **Current state:** **UX / technical blueprint approved for V2 planning; not implemented in the app.**
>
> **Primary promise:** Select a real curated clothing item or outfit, see how it could look on yourself, change pieces, and return to shopping without losing the selected retailer variant.

**This is the companion design to [ROADMAP.md](ROADMAP.md), not a claim that live AR currently exists.** The current MATCHLATCH app has a photo-inspiration workflow and a nine-slot Private Shop outfit tree. REVEAL will extend—not replace—them.

## 1. Experience principles

1. **Live-first, not live-only:** The first, prominent choice is **Reveal Live**, followed by **Reveal Snap** and a quiet **Use an existing photo** option. Snap works even when live tracking is unsupported.
2. **A distinct branded moment:** Intro / camera / preview / "Reveal" transformation / result; minimal monochrome design and no busy dashboard.
3. **Real product provenance:** The garment associated with every result points back to its original inspiration look, category, saved product and retailer variant; no invented price or guaranteed fit.
4. **Honest visualization:** A moving camera image, pose guidance and a newly generated still are *not* the same as a moving garment overlay. Only call a mode **live AR try-on** when the garment visibly tracks movement accurately.
5. **User control & consent:** Camera opens only after a tap; no microphone permission; no continuous upload; capture and AI generation are separate explicit actions. Saving personal images is opt-in.
6. **Low-cost by design:** Run local camera tracking in the browser where feasible. Charge image-generation APIs only after explicit **Generate Preview**; rate limit, set spending caps and measure per-preview cost.
7. **Mobile is the primary surface:** Prioritize a real iPhone Safari test and accessible desktop fallback; support reduced motion, error states and one-handed controls.

## 2. In-app names and microcopy

| Surface | Text | Purpose |
| --- | --- | --- |
| Navigation / prominent action | **REVEAL** | Entry to feature family |
| Hero title | **See the look on you.** | Explains value instantly |
| Main mode | **Reveal Live** | Camera + motion-aware experience |
| Secondary mode | **Reveal Snap** | Take one photo in app |
| Alternate image source | **Use an existing photo** | Select from device |
| Camera button | **Open Camera** | Triggers browser permission |
| Frame control | **Capture Look** | Freeze a chosen pose |
| Generated-preview button | **Reveal My Look** | Explicit opt-in remote processing |
| Result primary | **Try Another Piece** | Change a tree slot, keep same person photo |
| Result secondary | **Shop This Look** | Return to saved variant / Private Shop |
| Result additional | **Save Preview** | Explicitly save output to private wardrobe |
| Disclosure | **AI preview · Not an exact fit or physical measurement** | Avoids false fit claims |
| Fallback | **Camera unavailable? Use a photo instead.** | Never strand users |

**Branding note:** "REVEAL" is a working title, not a trademark clearance or registered mark.

## 3. User journey map

\`\`\`mermaid
flowchart TD
  A["Studio styling result / Saved outfit / Private Shop"] --> B["Select an eligible garment or curated look"]
  B --> C["REVEAL: See the look on you"]
  C --> D{"Choose a mode"}
  D -->|Reveal Live| E["Explain camera use + Open Camera"]
  D -->|Reveal Snap| F["Camera photo capture"]
  D -->|Existing photo| G["Upload from device"]
  E --> H{"Camera permission granted?"}
  H -->|Yes| I["Motion-aware framing + pose guidance"]
  H -->|No| G
  I --> J["Capture Look / retake"]
  F --> J
  G --> K["Review photo + crop/retake"]
  J --> K
  K --> L["Review selected garment(s) + AI preview notice"]
  L --> M{"User taps Reveal My Look"}
  M -->|Not yet| K
  M -->|Yes| N["Generate try-on still: consented, metered request"]
  N --> O{"Result"}
  O -->|Success| P["REVEAL result: before/after"]
  O -->|Failed or unsupported| Q["Keep photo; retry or change mode"]
  P --> R{"Next action"}
  R -->|Change garment| B
  R -->|Shop| S["Original product/variant in Private Shop"]
  R -->|Save| T["Opt-in private preview save"]
  R -->|Close| U["Discard temporary captures"]
\`\`\`

### Entry points

- **Studio result:** \`Reveal My Look ↗\` beside the built outfit; use the inspiration and currently selected tree items.
- **Each eligible Private Shop row/product:** \`Reveal On Me ↗\` for the exact selected variant.
- **Saved outfits:** \`REVEAL ↗\` reopens the original look and revalidates any selected product offers.
- **Future:** Dedicated global REVEAL navigation entry after V2 capabilities are real, not a dead link before launch.

**Selection behavior:** If the user comes from one product, begin with that single item. If from an outfit, show the current list of eligible pieces and ask which to visualize; default to core clothing (top/jacket/pants) rather than pretending accessories have garment-fitting support.

## 4. Screen-by-screen UX

### Screen A — Entry / mode selection

**Mobile layout:** small REVEAL wordmark; headline "**See the look on you.**"; a compact thumbnail of the selected piece and a small \`Edit outfit\` action.

Two distinct choices:

- **Reveal Live** (primary dark button): "Move. Frame. See your look come together." Sub-label on camera MVP: "**Live camera + guided capture**"—not "Live AR" until tracked clothes really render.
- **Reveal Snap** (outlined): "Take one photo. Generate a preview."
- **Use an existing photo** (text link): image picker, with local preview before consent.

Beneath: "You decide if and when a photo is sent for an AI preview."

### Screen B1 — Reveal Live camera

**Goal:** Feel native, simple and responsive while the user moves.

- Permission is requested **only** after \`Open Camera\` tap (HTTPS, \`getUserMedia({audio:false,video:{facingMode:'user'}})\` when supported).
- Full-screen portrait camera with clear **LIVE CAMERA** label, close button, front/rear switch, subtle positioning silhouette and short pose cues ("Step back", "Show shoulders to hips", "Enough light", "Full body for trousers/shoes").
- A mirrored selfie preview may be displayed for familiarity, but the captured source orientation is made explicit and should not accidentally reverse logos/garments.
- Optional local pose landmarks can update a thin guide/skeleton/alignment box without transmitting camera frames. Landmarks should not be mistaken for garment geometry.
- Bottom controls: **Capture Look** prominent, **Switch Camera**, **Use Photo**. Show which piece is selected (e.g., "Jacket · 1 of 3").
- When the user leaves this screen, navigates away, hides the page where appropriate, or switches mode, stop every active video track and release the camera.
- If a moving garment overlay is not yet supported, the camera stays useful but **must not show a fake garment as if it is actively tracking them**.

**True live AR expansion (later in V2):** Render an overlay that anchors to body landmarks across movement, handles scale/pose, reasonable occlusion and garment geometry; measure frame latency, stability and alignment, not just camera frames-per-second. This requires an evaluated tracking/rendering pipeline (e.g., browser video pose estimation + renderer) and device capability gates. Do not assume WebXR is available on iOS Safari.

### Screen B2 — Reveal Snap camera

- Same browser camera permission model and controls, but no pose-tracking requirement.
- Lightweight framing guide; \`Take Photo\` → still preview → \`Retake\` / \`Use This Photo\`.
- If the camera is denied or absent, \`Use an existing photo\` must remain accessible.
- No microphone or video recording, no shutter upload until explicit confirmation.

### Screen B3 — Photo picker

- Accept \`image/jpeg\`, \`image/png\`, \`image/webp\` where supported; validate size, decode and rotate appropriately. Strip metadata during client-side re-encoding where practical.
- Crop/resize to a reasonable model-compatible size; retain original selection on device until submission.
- If outfit coverage is insufficient, offer guidance, not a fake result.

### Screen C — Confirm selected garment and privacy

- Display their photo thumbnail beside the selected product image(s).
- Show **selected retailer/variant ID** and a short item label. If live availability can't be verified, preserve the user's look but avoid live-stock claims.
- Explain "**This generates an AI image. It may not accurately represent fit, body shape, material or the exact product.**"
- Explicit \`Reveal My Look\` triggers a metered backend request; request limits, consent and provider configuration must be ready before enabling.
- Do **not** silently reuse the existing inspiration-photo cloud bucket for body/selfie images; provision a separate owner-private try-on bucket and retention rules before any persistent storage.

### Screen D — Generation progress and errors

- Clean state: photo preview, "**Creating your reveal…**", cancellable UI, no fake percentage.
- API error cases: rate limit / beta not configured / poor source photo / unsupported apparel type / time-out. User can retake or choose another garment without losing the look.
- A failed generation must not create a purchase, save a draft image to an account without consent, or consume unintended repeated retries.

### Screen E — REVEAL result

- Branded **REVEAL** header and **Generated Preview** tag.
- Tap/swipe **Before ↔ After**. Camera mirror corrections must be consistent.
- Thumbnail or compact list of the exact garment(s) pictured; item selection remains traceable to the outfit tree.
- Primary **Try Another Piece**: reopen same category alternatives in Private Shop, then regenerate only after explicit tap. This may require another paid generation and should be made clear.
- **Shop This Look** goes to the original retailer variant/safe merchant URL, refreshing live price and availability.
- **Save Preview** is an opt-in, private action. Option to delete and regenerate; **Close** discards unsaved photo/output.
- Provide "AI images may look realistic but aren't proof of real-world fit."

### Large screen / desktop

- Split layout: left live camera/photo + right selected outfit list/controls.
- Camera availability and orientation may differ; photo upload is equal-quality fallback.
- Keyboard focus stays in the REVEAL modal/panel, Escape/close stops the camera, no inaccessible icon-only buttons.

## 5. Visual wireframes (interaction specifications, not implemented UI)

\`\`\`text
┌──────────────────────────────────┐
│  ←                       REVEAL  │
│                                  │
│  See the look on you.            │
│  [ Selected outfit thumbnail ]   │
│                                  │
│  ┌────────────────────────────┐  │
│  │        REVEAL LIVE         │  │
│  │   Move · Frame · Capture   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │        REVEAL SNAP         │  │
│  └────────────────────────────┘  │
│  Use an existing photo           │
│                                  │
│  Camera only starts when asked.  │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ×  REVEAL LIVE          Flip ↺   │
│                                  │
│     LIVE CAMERA                  │
│                                  │
│       [ framing outline ]        │
│       [ real live feed  ]        │
│                                  │
│     Step back for full look      │
│                                  │
│      [ CAPTURE LOOK ● ]          │
│      Snap     Use Photo          │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ←  YOUR REVEAL         Generated  │
│                                  │
│      [ AI PREVIEW IMAGE ]        │
│          Before / After          │
│                                  │
│    Jacket · Shirt · Pants        │
│                                  │
│   [ TRY ANOTHER PIECE ]          │
│   [ SHOP THIS LOOK   ]           │
│      Save preview                │
└──────────────────────────────────┘
\`\`\`

## 6. State transitions / behavior contract

| State | Trigger | Next state | Required handling |
| --- | --- | --- | --- |
| Closed | Tap REVEAL from selected look | ModeSelect | Preserve look ID + product/variant references |
| ModeSelect | Tap Live | PermissionIntro | Explain camera; **do not** request yet |
| PermissionIntro | Open Camera | CameraLive | Start local video only on user action |
| CameraLive | Move / pose | CameraLive | Local framing updates; optional landmarks |
| CameraLive | Capture | PhotoReview | Freeze a frame, pause/stop stream as appropriate |
| ModeSelect | Tap Snap | CameraSnap | Separate simple shutter UI |
| ModeSelect/Camera | Tap Upload or permission denied | PhotoReview | Image picker, validate and preview |
| PhotoReview | Continue | ConsentReview | Show garment(s) + privacy and cost boundary |
| ConsentReview | Generate | Generating | Explicit backend request, no auto-retries |
| Generating | Success | RevealResult | Generated badge + before/after + provenance |
| Generating | Error | RecoverableError | Retake/retry/choose mode; no surprise upload |
| RevealResult | Try Another Piece | PrivateShop | Keep look and source photo when user wants it |
| RevealResult | Save Preview | SavedResult | Auth+private storage rules or local guest handling |
| Any | Close / leave | Closed | Stop camera, release blobs and dispose unsaved data |

**Capture retake rules:** Re-entering live camera requires a fresh user gesture after closing; switching front/rear camera releases the old stream first. A paused camera is not considered an active garment overlay.

## 7. Integration contract (to implement later)

**Client-side interfaces** (conceptual; not actual committed endpoints):

- \`Reveal.open({lookId, inspirationId, slot, productId, variantId})\`
- \`Reveal.capture({mode:'live'|'snap'|'upload', imageBlob})\`
- \`Reveal.generate({consent:true, imageBlob, selectedProductRefs, lookId, previewMode})\`
- \`Reveal.savePreview({lookId, sourceRef, resultBlob})\` — explicit request only.

**Backend requirements before activation:**

- Authenticated beta access or robust short-lived session+rate limiting; CSRF/origin/abuse protection suitable for the chosen transport, usage ceilings and provider-spend monitoring.
- Server-side provider secrets; never bundle into the browser. Image size/format validation, timeout, response validation and error redaction.
- Supplier/licensing check on reference product images and try-on model, including whether the service may process photos of people. Do not send arbitrary retailer media to a model without appropriate use rights.
- New private Supabase try-on storage with **owner-only RLS** and a retention/deletion plan; separate temporary captures and explicit saved results.
- Logged metadata with **non-sensitive event names** only (e.g., \`reveal_camera_opened\`, \`reveal_mode_selected\`, \`reveal_capture_accepted\`, \`reveal_generation_succeeded\`), never image bytes, biometrics or body landmarks.
- Match real selected product IDs; if a product is removed/out of stock, preserve the preview as a past visualization but show current shopping status separately.
- Measure success rate, generation latency/cost, return-to-Shop rate, camera-denied rate and device compatibility.

**Chosen technical foundation (planning, not installed):**
- HTTPS browser camera via \`navigator.mediaDevices.getUserMedia\` and normal \`<video>\`/canvas. Camera authorization and \`MediaStreamTrack.stop()\` cleanup are mandatory.
- Evaluate local pose estimation such as **MediaPipe Pose Landmarker** in \`VIDEO\` mode for motion-aware guidance. Benchmark mobile CPU/thermal impact before enabling.
- Evaluate **Put-it-on baseline** only when its actual source, license, quality and API cost are available. It is **not presently verified as an integration**.
- For garment-tracked live overlays, evaluate a dedicated tracking/renderer plus calibrated garment assets and occlusion model; do **not** assume cross-browser WebXR (particularly iPhone Safari).
- Still AI try-on generation requires a separate provider/prototype decision; no automatic commitment to a paid API.

## 8. Milestone rollout and proof of completion

**V2-A — REVEAL shell and camera foundation**
- [ ] Sign off on in-app naming / feature-entry position.
- [ ] Main Live-first mode chooser, Snap and Upload fallback, accessible and responsive UI.
- [ ] HTTPS camera permission handling; front/rear; track cleanup on close/navigation.
- [ ] Local capture, crop/review/retake, input validation, minimal privacy copy.
- **Accept:** Live camera moves fluidly on test devices, Snap captures and upload works; **not yet** marketed as try-on.

**V2-B — REVEAL generated preview**
- [ ] Evaluate Put-it-on or other compliant virtual-try-on model, cost and licensing.
- [ ] Generate an opt-in, clearly labeled try-on still using user and selected garment images.
- [ ] Before/after, change product / regenerate, retailer variant preservation.
- [ ] Separate private storage and explicit save/delete; quota and abuse control.
- **Accept:** A believable preview for supported garment(s) linked to its real original selection, with measured quality and privacy tests.

**V2-C — REVEAL Live garment tracking**
- [ ] Pose tracking prototype and live renderer feasibility across iOS Safari and Android/desktop.
- [ ] Garment overlays visibly follow movement, changes in scale/orientation and reasonable occlusion—**not** just a frozen generated image.
- [ ] Frame-rate/latency and garment-drift criteria established from device tests; quality thresholds before feature label "Live AR".
- [ ] Unsupported devices degrade cleanly to Capture → Generated Preview or Snap.
- **Accept:** A moving garment visualization tested on actual supported devices. If motion tracking is not convincingly accurate, keep "Live camera + guided capture" positioning and do not label it AR.

**V2-D — REVEAL hardening and release**
- [ ] Color/size variation, lighting/pose failures, garment categories and equitable output-quality audit.
- [ ] Mobile/desktop accessibility; reduced motion; clear image-retention controls.
- [ ] Opt-in metrics and user testing; published limitations and a beta cost ceiling.
- **V2 Done only when:** Live and Snap modes exist and behave honestly; at least one garment try-on works end-to-end on supported devices, shopping variant stays linked, and the true moving-overlay claim is backed by testing where enabled.

## 9. Explicit exclusions and decisions still open

- **Not now:** Full-body photorealistic real-time replacement on every device, guaranteed sizing, precise cloth physics, universal merchant support, body measurement inference, automated purchases, background camera use.
- **Not decided:** Final try-on model/provider, whether Put-it-on is suitable, exact hosting costs, garment-first category, premium pricing or whether true AR needs a native wrapper.
- **No surprise billing:** Do not activate billable generation automatically; approval and safe quotas before real API traffic.
- **No silent photo retention:** Save results only on tap; body/selfie photos must not be automatically imported into the existing inspiration archive.

## 10. Source notes for technical feasibility

- MDN \`getUserMedia\`: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- Google MediaPipe Pose Landmarker Web guide: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- MDN WebXR limited availability: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
- Browser support reference (check again before implementation): https://caniuse.com/webxr

**Next engineering action:** Build V2-A against the actual current MATCHLATCH Studio/Private Shop, without inventing generated garment overlays. In parallel, benchmark a suitable try-on model and assess actual Put-it-on assets when available.
