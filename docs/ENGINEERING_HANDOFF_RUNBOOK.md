# Search/Growth evidence handoff checklist

Coordination hub: https://github.com/atravis817/matchlatch/issues/7. This is a scoped 20-part checklist; the Founder-supplied original protocol is authoritative and has not been reread in this check-in.

1. Assigned work order and scope.
2. Current hub directives and last read time.
3. Branch, PR, remote HEAD and baseline.
4. Local HEAD, dirty state and unfinished edits.
5. Exact application tree and deployed commit.
6. Framework, routing and source architecture.
7. Implemented versus planned capabilities.
8. Files changed and shared-file ownership.
9. Local deterministic tests and failures.
10. CI evidence, including absent evidence.
11. Preview build and HTTP evidence.
12. Browser/account/device evidence and blockers.
13. Provider evidence separate from fixtures.
14. Production state and prohibited actions.
15. Data provenance and publication rights.
16. Migrations proposed/applied and destination.
17. Auth/privacy/secrets boundaries; never secret values.
18. Blockers, dependencies and exact approval requirements.
19. One next action, owner and rollback approach.
20. Links to report, PR and hub; report receipt only when observed.

Rollback: abandon or revert isolated development commits; never modify main or delete customer records. This branch proposes no database migrations or scheduler configuration.
