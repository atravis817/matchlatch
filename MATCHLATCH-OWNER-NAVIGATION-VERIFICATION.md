# MATCHLATCH Preview owner recognition

## Verified identity and configuration

On 2026-10-11, read-only Supabase Auth inspection found exactly one account for `admin@matchlatch.company`:

- User ID: `dacbe970-070d-4eb3-ad48-31c424bc6bc0`.
- Email confirmed: `2026-10-11 15:39:52.496851+00`.
- Anonymous: false.

Vercel's existing encrypted `MATCHLATCH_ADMIN_USER_ID` matches that UUID, scoped exclusively to Preview and `design/v1.2-studio-first-100926`. No environment values were changed. Identity recognition uses a fresh server-side Supabase `/auth/v1/user` lookup, email confirmation and UUID equality. Email strings, display names and user-editable metadata do not authorize access.

## Implementation

The standard account menu previously lacked owner navigation. The owner's customer interface was expected to remain available, but there was no integrated way to open the separate dashboard.

- `lib/owner-authorization.mjs` centralizes the existing owner gate.
- `api/admin-summary.mjs` uses that gate before collecting or serving cached aggregates, preserving its Preview-only scope and limiter.
- `api/owner-access.mjs` returns only `{commandCenter:true}` after the same authorization. It performs no service-role or analytics requests and returns no UUIDs or account metadata. Guests/customers/unverified/anonymous identities are denied; Production returns 404.
- `owner-navigation.mjs` checks the capability with the existing session, appends one `/admin.html` link using the existing profile-shortcut classes, and fails closed when verification is unavailable. No hardcoded owner email/UUID, service secret or analytics data is embedded in this browser module. Responses are discarded after logout, account switches or menu replacement. The session token is sent only in the same-origin Authorization header and is never logged or persisted by this module.
- `app-shell.js` mounts the link in the existing Me/account shortcut menu and refreshes recognition when the existing auth-user event fires.
- `app-shell.css` only makes the anchor inherit existing shortcut styling. Standard shopping behavior, profile links, colors and layout remain available to the owner.
- The quality workflow runs both dashboard and owner-navigation tests.

`/admin.html` is a static dashboard shell; a signed-out visitor may see its login page after passing Vercel deployment protection, but never administrative metrics. The server's API authorization is the data boundary. Merely adding a link manually cannot grant access.

## Automated verification

Five new tests cover capability authorization/no privileged reads, preserving shopping controls and avoiding duplicate links, guest/customer/error invisibility, delayed responses during logout/account switches, and detached menus.

The ten existing dashboard tests pass, including actual endpoint source tests with controlled Supabase responses: Production 404, guest/non-owner/unverified-owner/auth failure 403, verified owner 200, and fresh authentication before serving cached metrics. The new recognition tests additionally reject an anonymous owner UUID and a different UUID carrying the exact owner email plus editable owner metadata.

All JavaScript syntax checks and the existing static audit, public catalog, delivery intelligence, Awin importer, grounded styling, commerce policy and commerce regression suites pass locally. These tests are not represented as live signed-in user tests or as independently observed GitHub Actions results.

## Live versus manual verification

Authoritative identity and Preview configuration were verified live. The same analytics collector was already verified against all five real Supabase sources in Preview, and the owner had previously confirmed dashboard access. This change adds navigation without granting a new identity or privilege.

The revised owner link and owner-authenticated `/api/admin-summary` response require a manual signed-in check on the updated Preview using the owner's normal account. A live separate non-owner account test also remains; automated tests cover its authorization and link invisibility. No passwords, OTPs or tokens need to be supplied in chat.

Only the development branch is changed. Production, main, Preview protection, database schema/RLS, DNS, mail configuration and credentials remain unchanged.
