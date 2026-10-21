# Shopify Preview app authentication — PR #9

In Vercel → MATCHLATCH → Settings → Environment Variables, select **Preview only**, and restrict every entry below to branch **feature/wo-ml-018a-nightly-shopify-sync**. The branch name goes in the branch selector, never in a value/key field. Do not select Production or Development. Configure directly in Vercel; never paste credentials into chat, GitHub, source files or screenshots.

| Key | Value | Sensitivity |
| --- | --- | --- |
| SHOPIFY_CLIENT_ID | Installed MATCHLATCH Dev Dashboard app → Settings → Client ID | App identifier; server-only |
| SHOPIFY_CLIENT_SECRET | Same app → Settings → Client secret | Secret; mark Sensitive |
| SHOPIFY_STORE_DOMAIN | pfcdgt-is.myshopify.com (existing configured target, live identity pending) | Not secret |
| SHOPIFY_ADMIN_API_VERSION | 2026-10 (pinned reader version; other versions fail closed) | Not secret |

Leave SHOPIFY_ADMIN_READ_TOKEN **unset** for this method. A client secret is not an Admin access token. Existing Storefront token/settings remain separate. Supplying both authentication methods or partial app credentials fails closed. Legacy read-token mode remains supported only when both client credential variables are absent; it cannot renew an externally supplied token.

Keep MATCHLATCH_SHOPIFY_PREVIEW_WRITES_ENABLED, MATCHLATCH_SHOPIFY_PREVIEW_SCHEDULE_ENABLED and MATCHLATCH_SHOPIFY_PUBLICATION_ENABLED **false**. No database configuration is required for the auth check. Save the variables, then rebuild only this protected branch Preview so they take effect.

## Eligibility and read-only verification

The installed app version must have exactly read_products and read_inventory. This adapter rejects missing or additional scopes rather than silently expanding permissions. The app and target store must belong to the **same Shopify organization**; installation and ownership alone do not establish this. Verify their organization in Dev Dashboard. Eligibility is not yet externally verified. Do not create a replacement store to bypass this check. If they belong to different organizations, use Shopify custom distribution and the supported authorization-code grant for this non-embedded app; that flow is a separate implementation, not a client-secret-as-token workaround.

Once configured, the authenticated owner may GET `/api/admin-summary?action=shopify-sync-auth` with the existing owner Bearer session, on the protected Preview. The endpoint checks Admin product/inventory reads and shop identity without a database, returns only shop/API version/bounded sample count/hasMore, and never returns tokens or product details. The sample is not a total inventory count. Production returns 404; owner authorization remains required. Provider errors are sanitized. No public auth endpoint, purchases or mutations are added.

## Renewal and limits

Server code POSTs URL-encoded client_credentials to the fixed validated shop's HTTPS `/admin/oauth/access_token`, with redirect rejection, 15-second timeout and 16 KiB response cap. Tokens remain in memory, are reused within a reader, renewed 60 seconds before expiry, and reacquired on a cold/new reader (including later nightly invocations). Concurrent calls within one reader share an exchange. One 401 triggers one renewal retry; persistent denial fails closed. No refresh token or database storage is needed. Nothing schedules a run. Network/provider response bodies and credential values are never included in errors.

Official source, checked 2026-10-14: https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant
