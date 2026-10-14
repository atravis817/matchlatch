# WO-ML-GOV-001 — Engineering continuity adoption report

2026-10-14. Repository: atravis817/matchlatch. Governance branch: docs/wo-ml-gov-001-handoff, based on Shopify sync checkpoint 086d73f63ab81b75f1b5b246ff8b0bc2119b5be4. This is documentation-only draft adoption, not a main merge or universal installation on all existing branches.

## Implemented scope

AGENTS.md establishes permanent startup/coordination/evidence/preservation and Founder authorization rules. The full customized runbook retains the source protocol's phases, evidence taxonomy, exact numbered 0–20 sections, self-audit and final workspace verification. HANDOFF.md now records actual repository/runtime/deployment/database/integration state, risks, authorized/frozen actions and the dedicated WO-ML-018A automation transfer. ROADMAP.md retains V1–V4 while adding dated active priorities; IMPROVEMENT_PLAN.md establishes evidence-based improvements without expanding authorization. Exact prior Shopify and Search/Growth handoffs are archived.

Only eight documentation files change. No application/API/test/workflow/SQL/configuration code was edited. The original Shopify worktree and its PR #9 remain preserved. PR #8's scoped governance was inspected and reconciled; its existing checklist stays on that branch and does not replace the full source protocol. HANDOFF/AGENTS/ROADMAP overlaps need coordinated integration, never entire-file overwrites.

## Coordination and current evidence

[Issue #7](https://github.com/atravis817/matchlatch/issues/7) is the shared communication hub. The governance check-in was posted; Search/Growth explicitly acknowledged it and paused shared governance edits; governance read and acknowledged that response. This is evidence of that exchange, not automatic delivery to every Work session.

Production alias read-back: main SHA 302fa9c3d83263ca25c3ed6252665fb73f06c569, deployment dpl_35psQBq1wqGoi72B3A45GgKFGuZ3, READY/production. Public root returned HTTP 200 with brand markup. Customer authentication/checkout were not tested. Sync Preview metadata: SHA 086d73f63ab81b75f1b5b246ff8b0bc2119b5be4, deployment dpl_8DH5XH6nUmDWdThs5wAvgqP7kRm7, READY/Preview. These are distinct environments.

Fresh read-only shared Supabase audit reconfirmed 899 private Awin variants, zero public, 898 advertised in stock and 899 stale. Nine public application tables have RLS enabled; that metadata does not prove full cross-account behavior. Shopify sync schema is absent from that inspected public schema. Actual Shopify Admin import, isolated DB, source/publication evidence and midnight recurrence remain blocked. Sync write/schedule/publication flags remain disabled; no secret values were read or copied by this governance audit.

## Validation and self-audit

- Current source regression: 213 counted tests, 212 passed, 0 failed, 1 skipped. The temporary SQL runtime is unavailable; the skipped parent omits seven nested checks. Historical complete 220-test results and successful sync CI run 38584165456 remain separately labeled.
- Static audit and commerce-policy checks passed. No application changes require additional mirrored tests.
- Full handoff reread and all document checks passed: sections 0–20, all 14 evidence levels, required automation transfer, local links, known commit/tree objects, byte-identical source archives, credential-pattern scan and exact eight-file documentation scope. Git diff whitespace validation passed. Final delivery checkpoint/status is recorded in the hub check-in.
- No Production build/deploy, live migration, scheduler invocation, publication, purchase or paid-service change performed.

## Delivery and permanent adoption boundary

The draft PR and exact delivery SHA are linked from the final issue #7 check-in. The handoff records its immutable inspection checkpoint, with explicit instructions to resolve current local/remote/PR HEAD. It cannot embed its own containing commit's hash without changing that hash. Local and connector-created remote commits may differ while sharing the exact tree; both must be verified and disclosed rather than reset to make them appear identical.

The rules are durable in the governance branch/PR. Main and other branches do not automatically gain them. Founder-approved integration and ownership reconciliation remain a separate step. The handoff itself triggers no merge, migration, deployment or publication. A Git-provider automatic protected Preview build, if any, is not a deliberate release or feature verification.

**Single next action:** read issue #7's current directives/comments and verify the incoming assigned PR/worktree checkpoint before continuing prerequisite/ownership work. The highest-priority live blocker remains protected Shopify Admin read access and an authorized isolated Preview database.

Final preservation check before staging: original Shopify worktree clean at 086d73f63ab81b75f1b5b246ff8b0bc2119b5be4. No unrelated source files changed. The governance files are committed only under the explicit GOV-001 draft-PR authorization.
