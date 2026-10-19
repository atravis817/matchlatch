# MATCHLATCH agent-to-agent runtime handoff protocol

Permanent operating standard: WO-ML-GOV-001. This is the full MATCHLATCH-specific integration of the Founder-supplied **AGENT TO AGENT HANDOFF PROMPT-2026101410184653.pdf** (15 pages, read in full on 2026-10-14). It retains the source procedure, evidence taxonomy, complete numbered 0–20 template, self-audit and final workspace verification. The source calls it a 20-section format; numbering starts at 0, yielding 21 required top-level sections. Do not omit section 0 or 20 to change that count.

## Responsibility and authority

The outgoing agent must leave an execution-ready root `HANDOFF.md`, not a conversational summary. An incoming agent must reconstruct actual runtime state without repeating completed investigations, losing unfinished work, confusing plans with execution, or repeating unauthorized external operations. Read `AGENTS.md`, the assigned work order, roadmap, improvement plan and [issue #7](https://github.com/atravis817/matchlatch/issues/7); consult new directives before overlapping changes.

Issue #7 carries shared strategy, ownership, blockers and receipt acknowledgments. Engineering detail stays in each PR. Link workstream branches and exact checkpoints. Never imply direct messaging to another Work tab or receipt merely because you posted. Preserve the Founder’s Production/publication/commerce gates. Handoff generation is read-only except its output unless the current work order explicitly authorizes scoped changes. GOV-001 authorizes documentation, its isolated branch and a draft PR; no application edits, migrations or Production operations.

## Reconciliation and deployment preflight

Preserve existing PR8 Search/Growth, PR9 Shopify/Automations and PR10 Governance Work ownership. Before replacing a handoff, archive both complete source records with exact commit/blob identities and verify byte equality. Retain current evidence separately from dated historical sections; never turn historical next actions or consumed approvals into current execution grants. Preserve PR8's scoped `docs/ENGINEERING_HANDOFF_RUNBOOK.md` during integration with this full protocol.

When new owner acknowledgment is unavailable, deliver a local reviewable patch; do not alter the remote workstream. Check Vercel/CI deployment-trigger impact BEFORE separately authorized ref movements; documentation pushes can deploy. Stop unapproved effects. Current workspace confirmation rules still govern external posts and configuration. Independent Queen onboarding review must recover exact refs, ownership, holds and one safe first action; report delivery alone is not acceptance.

## Evidence taxonomy

| Level | Meaning and limit |
|---|---|
| OBSERVED | Directly inspected workspace/config/data; code existence is not feature completion. |
| UNIT_VERIFIED | Tested isolated assertions; no external-provider conclusion. |
| INTEGRATION_VERIFIED | Verified interactions across internal components; state which fixtures/services were real. |
| LOCAL_VERIFIED | Executed in the local runtime/workspace; name dependency versions and skips. |
| LAB_BROWSER_VERIFIED | Browser automation/emulation; not physical iPhone/Safari proof. |
| STAGING_VERIFIED | Verified against a specific staging/Preview deployment; name exact SHA/environment. |
| EXTERNAL_VERIFIED | Actual provider interaction/read-back; identify the read/write and its narrow scope. |
| PRODUCTION_VERIFIED | Direct check against the actual current Production system; metadata proof is not checkout/auth proof. |
| PHYSICAL_DEVICE_VERIFIED | Tested actual hardware; identify device, OS, flow and limitations. |
| INFERENCE | Reasoned conclusion from named evidence, awaiting direct proof where relevant. |
| ASSUMPTION | Belief without verification; cannot satisfy an acceptance gate. |
| HYPOTHESIS | Proposed explanation/improvement requiring a test. |
| BLOCKED | Named dependency prevents a particular operation; independent work may continue. |
| DECISION_REQUIRED | Exact product/business/architecture/authorization decision needed. |

These levels describe scope, not a linear ranking. Use multiple scoped entries where appropriate. A READY build does not prove sign-in; a live product result does not prove publication/image/shipping rights; manual import does not prove recurrence; a correctly configured schedule does not prove its first successful completion. Do not upgrade evidence without direct verification.

## Required procedure — phases 1–10

1. **Repository identity:** inspect root, remotes, branch, complete HEAD, upstream, current main, relevant history/tags/releases, worktrees and submodules. Record exact commands/results. Explain local, remote and deployed differences. An upstream accidentally tracking a base branch is not the current branch's remote head.
2. **Workspace state:** inspect staged/unstaged/untracked files, relevant ignored/generated artifacts, migrations/config/workflows/tests/temp scripts/instrumentation. For each material file record purpose, change, completeness, validation, commit status and incoming action. Do not expose secret contents. Do not reset/clean/stash/overwrite/force-push/recreate uncertain work.
3. **Change reconstruction:** inspect history and diffs. Record work item, problem, files/functions, schema/config changes, tests, behavior, limitations, full commit, PR/merge/deployment state and evidence. Status vocabulary: COMPLETED (implemented plus required proof), IMPLEMENTED BUT NOT VERIFIED, PARTIALLY IMPLEMENTED, SPECIFIED ONLY, NOT STARTED, BLOCKED.
4. **Validation:** run established safe checks when useful; preserve exact command, result/count/skips/warnings/failure/time/checkpoint. Use NOT RUN and explain omissions. No generic “tests green.” State how SQL-runtime absence affects count. TypeScript/lint/build commands that do not exist are not invented.
5. **Database/migrations:** identify proposed/committed/unapplied files and local/staging/Production applications separately, schema compatibility, backfills and rollback/DBA work. Inspect actual schema where permitted. Do not apply SQL merely to improve handoff evidence. A shared DB must not be mislabeled Preview because a caller came from Preview.
6. **Deployment:** resolve actual Production alias to deployment ID, URL, Git SHA, target, state and verification timestamp; distinguish Preview from latest deployment. Record `production_alias_deployment_id_at_verification` and `verified_at`; do not imply permanence. Document rollback metadata only if verified and never perform rollback to generate a handoff.
7. **External integrations:** for GitHub, Vercel, Supabase, Shopify, Awin and any actual provider touched, record purpose/status/config names/evidence/verified behavior/assumptions/failures/setup/authorization. Never include credentials, signed URLs, personal access tokens, private keys or webhook secret values.
8. **Decisions:** preserve product identity/navigation/branding, nine-slot structure, owned-item spend, systems of record, source-specific permissions, exact variants, privacy, retry/idempotency, customer behavior and deferred work. Explain rationale, status, consequences and approval boundary.
9. **Risk register:** rank real integrity/privacy/Production/revenue risks above speculative improvement. Each item needs ID, severity, system, failure, evidence, impact, mitigation, remediation, authorization and blocker. UNKNOWN is not zero risk; a configured RLS flag is not an account-isolation test.
10. **Next execution:** separate AUTHORIZED NOW, INVESTIGATION ONLY, BLOCKED, and NOT AUTHORIZED/FROZEN. For each authorized task record priority/objective/modules/prerequisites/constraints/definition of done/tests/evidence/stopping point. Give the incoming agent exactly one first action.

## Phase 11 — complete HANDOFF.md format

Use these exact numbered top-level headings, in order. Keep all headings even when NOT APPLICABLE or BLOCKED; do not substitute a short workstream checklist.

| Section | Required content |
|---|---|
| 0. Incoming Agent Quick Start | Read This First (5–15 lines), one First Action, critical Do Not Do. |
| 1. Repository Identity | Repository/root/remote/branch/inspection HEAD/upstream/main/workspace/time; distinguish delivery SHA from inspection checkpoint. |
| 2. Current Production State | URL/SHA/alias deployment ID at verification/time/rollback/health/evidence; differences from local. |
| 3. Git & Workspace State | Exact staged, unstaged, untracked files; purpose, ownership, completeness/testing/commit state/actions; recent SHA/work item/deployment table. |
| 4. Work Completed This Runtime | Per item: status/evidence/problem/implementation/files/tests/Production/limitations. |
| 5. Work In Progress | State/completed/remaining/files/context/exact next step/do not repeat; dedicated WO-ML-018A automation transfer below. |
| 6. Validation Matrix | Exact commands/results/counts/skips/checkpoint/evidence; TypeScript/lint/build/browser/provider checks NOT RUN where appropriate. |
| 7. Database & Migrations | Actual schema, proposed vs applied local/staging/Production table; backfills/DBA/rollback. |
| 8. Deployment & Infrastructure | Production/Preview refs; variable names and reviewed flag states only; CI evidence, automatic deployment caveat, rollback. |
| 9. External Integrations | Per provider: purpose/status/evidence/config/limitations/remaining action. |
| 10. Architecture & Product Decisions | Decision/rationale/status/consequence/constraints for incoming agent. |
| 11. Security, Privacy & Data Integrity Invariants | RLS/account/private image protections, variants, rights, no secrets/PII leaks, idempotency, purchase-disabled gates. |
| 12. Known Risks & Technical Debt | Ranked ID/severity/system/failure/evidence/impact/mitigation/fix/authorization/blocker register. |
| 13. Authorized Next Work | Ordered tasks with objective/why/prerequisites/files/constraints/done/tests/evidence/stopping point. |
| 14. Investigation Only | Research/design permitted but activation/implementation outside current scope. |
| 15. Blocked / Requires Human Action | Dependency, required human/external action, resume condition; no credentials requested in chat. |
| 16. Explicitly Frozen / Not Authorized | Production/main/publication/transactions/fees/Awin restrictions. |
| 17. Commands & Operational Reference | Discovered safe resume/validation commands; no automatic destructive commands. |
| 18. Key Files & Navigation Map | Files/directories, purpose, why they matter; distinguish files only on another branch. |
| 19. Assumptions Requiring Verification | Every material unverified premise; distinguish decisions from observed runtime. |
| 20. Final Continuity Checklist | Actual self-audit/workspace results, omissions, integrity statement and single next action. |

### Mandatory automation transfer inside section 5

- **Shopify source:** actual vs configured/code identity, authorized/scoped API relationship, import vs publication permissions, last direct source verification. Storefront token is not an Admin credential. Own-store access is not Global Catalog commercial clearance.
- **Baseline:** total product vs variant counts, private/public, source distribution, duplicates/stale/category quality and true eligibility. Record timestamp. A 42-result sample is not inventory total; historical 899 owner snapshot is not evidence of Shopify origin.
- **Engine:** implemented/tested/externally proven states, scheduler architecture/timezone, last successful and attempted real run, watermark, page/cursor/checkpoint, retries/failed batches, distributed lock/fencing/idempotency. If no access exists, write UNKNOWN/BLOCKED instead of fabricated run IDs or timestamps.
- **Publication:** private/approved/published/revoked counts and evidence; authorizing Founder decision; material-change reevaluation; rollback/reversal. Ingestion never grants visibility.
- **Search/styling:** shared eligible candidates, bounded indexing/pages, exact size/type/budget/source permissions, missing categories, snapshot/freshness limits, nine-slot and owned-item behavior, independent model permissions.
- **Activation dependencies:** credential/scope names, destination-specific proposed SQL, secure scheduler/protection setup, policy approvals, actual recurrence proof and alerting/recovery validation.

## Phase 12 — mandatory self-audit

Re-read the entire completed handoff. Check contradictions, stale SHAs, mismatched deployment targets/IDs, undocumented edits, unsupported completion, secrets/signed links/PII, omitted migration state, deployment claims based only on commits, assumptions presented as facts, missing definitions of done, omitted decisions and ambiguous next action. Confirm scope and timestamp on evidence. Resolve shared-file conflicts through issue #7; preserve original branch records in dated `docs/handoffs/` archives when replacing a handoff.

A committed document cannot contain its own containing commit's hash without changing it. Record the immutable inspected HEAD and its timestamp, then publish the actual delivery SHA in the PR/hub/final response. Incoming agents must verify current `git rev-parse HEAD` and file history. Do not silently substitute a prior checkpoint for current deployed state.

## Phase 13 — final workspace verification

Run Git status again in the handoff worktree and preserved source worktrees. Compare with the starting inventory. HANDOFF.md must be the only change caused by handoff preparation unless the Founder authorized a named additional scope; list every such file and its commit/PR status. Do not commit/push/deploy/migrate/clean/reset/stash automatically. For an authorized draft PR, stage only reviewed scope, preserve local/remote differences, and verify remote content by tree/read-back. Never force-push an active workstream. The handoff document and its publication must not release application state.

Re-read issue #7 before final delivery, post branch/PR/checkpoint/progress/blockers/one next action, and acknowledge another agent's response only after reading it. Link the complete handoff and adoption report. Current main integration remains a separately approved action.

## Final response contract

Respond briefly with repository, branch/delivery checkpoint, HANDOFF.md/runbook links, dirty or clean workspace state, Production checkpoint if verified, one next action and critical blockers. Name completion at the achieved scope: draft governance adoption does not mean every existing branch/main already has the standard. Do not repeat the full handoff in chat.
