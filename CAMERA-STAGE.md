# MATCHLATCH camera feature — POC camera stage

Status: **implemented in a GitHub commit object; not deployed**

## Product experience

In Studio → Choose a piece, the shopper sees two minimalist options:

1. **Take a photo** — opens MATCHLATCH's in-app camera viewfinder.
2. **Choose a photo** — opens the existing photo/file picker, also accepting drag-and-drop on desktop.

In the viewfinder the shopper can switch front/back cameras, capture, inspect the shot, retake, or select **Use photo**. After acceptance the image follows the **same existing photo preview and AI styling flow** used by uploads. There is no new photo database, login requirement, or additional styling engine.

## Permission behavior

- The in-app viewfinder calls the browser-standard navigator.mediaDevices.getUserMedia method, requesting **video only**, **after** the shopper taps **Take a photo**. On first use (or when required by browser settings), Safari/iOS, Android or desktop browser displays the browser/operating-system-controlled permission prompt.
- Websites **cannot force the system prompt to reappear** if permission was previously granted or denied, and cannot alter its system wording. If denied, the viewfinder explains how to re-enable website camera access or choose an existing photo.
- getUserMedia is only available on secure HTTPS origins (or localhost). MATCHLATCH's production and Vercel preview domains use HTTPS.
- On an unsupported browser or insecure context, the **Take a photo** action opens a device-native camera file picker using an image file input with capture=environment, if the device supports it.
- Video capture has **audio:false**; MATCHLATCH never requests microphone access.

## Camera safety and lifecycle

- Camera tracks are explicitly stopped after capture and when the modal closes, the user changes pages, the browser enters the background, or the page unloads.
- In-flight permission responses are invalidated. If the user closes the modal before permission resolves, newly acquired camera tracks are immediately stopped.
- A selected frame is converted to JPEG locally using canvas (up to 1600px longest side), removing original camera metadata. It goes through the same 1024px Studio normalization flow as file uploads.
- The current privacy model remains: guest photos stay in the browser, signed-in libraries can privately sync saved photos, and the photo is sent for AI styling only after the user chooses AI analysis. No camera stream is ever uploaded or streamed to a server.
- Permission failures, unavailable camera hardware, capture errors and unsupported devices have recovery paths.
- The native modal supports Escape, focus return, large touch targets, reduced motion, light/dark mode and iPhone safe areas.

## Live acceptance test (still required)

1. iPhone Safari, fresh camera permission: tap Take a photo; confirm the native browser permission appears; allow and verify live rear-camera viewfinder.
2. Capture → review → Retake → capture → Use photo. Verify the selected image appears in Studio and AI styling receives it only after explicit analysis.
3. Tap Flip camera and verify front/back, including matching mirrored front preview and capture.
4. Close during a pending prompt, while camera is live, on route change, and when sending Safari to background. Verify no camera indicator remains on.
5. Deny permission. Verify no stuck spinner; understandable message; file picker remains functional.
6. Test unsupported / restricted browsers with native file-input camera fallback.
7. Test re-entering Studio, resetting a new project, dragging an image, choosing an existing photo, and reusing current upload/preview without regression.
8. Confirm accessibility, safe-area layout, both themes, and small-screen orientation.

No actual iOS permission popup or camera preview can be fully verified without a physical-device test.

## Release gate

This is a **POC-stage code change** built on the previously saved checkout proof-of-concept commit. It does not update the GitHub main/staging branches or Vercel until approved.
