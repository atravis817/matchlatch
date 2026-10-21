## WO-ML-018D — schema installation PASS, 2026-10-14

Founder approval “Approve” received in the explicit WO-ML-018D approval context. Exact destination lqxeizvrdxuhzvipmlkl reconfirmed MATCHLATCH-SHOPIFY-PREVIEW, ca-central-1, ACTIVE_HEALTHY; empty application baseline captured in docs/WO-ML-018D-EMPTY-BASELINE.md before execution. Local and GitHub SQL blob matched a5af019bc8da9323a640f2bf3f54065b21d37634.

LOCAL_VERIFIED: pinned @electric-sql/pglite 0.5.9, MATCHLATCH_PGLITE_MODULE=/tmp/matchlatch-sql-018d/node_modules/@electric-sql/pglite/dist/index.js node --test scripts/test-shopify-sync-sql.mjs: 8 passed, 0 failed, 0 skipped. Covers rollback/checkpoints, permissions, fencing, publication rejection/revocation and daily deduplication in ephemeral DB only.

EXTERNAL_VERIFIED: applied exact unmodified SQL once through apply_migration, name wo_ml_018d_shopify_sync_schema, migration version 20261014225422, success=true. Read-back: five tables, RLS true on each; three security-invoker functions; anon/authenticated SELECT and function EXECUTE false, service_role true. Ten total indexes including PK/unique indexes (four explicit secondary indexes). All product counts, jobs, state, seen and audit rows zero; auth users zero.

Security advisor: five INFO rls_enabled_no_policy notices, one per intentionally server-only table. This is consistent with revoked client grants and no client policies; do not add public policies to silence it. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy . No other security findings returned.

Limits: live PostgREST/owner status not verified; Vercel database credential configuration remains unauthorized/unperformed. No synthetic/live data writes after schema install, imports, publication, scheduling, purchases, merge, Production or Awin changes. Shopify authentication separately unverified. Recovery baseline is catalog evidence, not provider backup/PITR; post-commit reversal remains separately authorized.

Next milestone: separately authorize secure branch-scoped Preview database URL/service-key configuration, then read-only REST/owner-status validation. Do not run import/dry-run ledger or activate flags.