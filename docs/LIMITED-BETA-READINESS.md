# MATCHLATCH limited usability beta: release and recovery
Scope: Preview only. Customer invitations remain blocked until the checks below pass.

## Beta boundaries
- The Preview shop verification endpoint denies purchase and retailer checkout handoffs before provider calls.
- The beta page marks purchase controls disabled; saved items remain available for shortlist review.
- Fictional demonstrations are labeled and have no saving, model or checkout actions.
- Footer Beta feedback opens an email draft to admin@matchlatch.company. Mailbox receipt and response ownership must be confirmed before invitations.
- Do not disable Vercel protection, publish private catalog inventory, enable purchases, accept supplier agreements or change Production.

## Release checks still required
1. Use two existing verified customer accounts on the exact release build. With their own sessions, verify each cannot read the other's records, private profiles or inspiration photos. Check logout/account switching clears the visible prior account state. Never use service-role reads as proof of customer isolation.
2. Verify customer and guest Command Center/private catalog denials; verify actual owner recognition.
3. Confirm desktop and 390/430px guest and signed-in journeys, form errors, demo labels, shortlist review and disabled purchase controls. Viewport checks do not certify physical iPhone Safari.
4. Confirm an approved tester access path under existing deployment protection. Do not grant broad Vercel team membership or disable protection merely to share the build.
5. Assign a feedback triage owner, verify the mailbox, and record the invitation list and exact tested commit/deployment.
6. Stop release if a tool stalls or the exact build cannot be reached.

## Recovery procedure
1. Stop sending invitations and communicate the affected build to existing testers.
2. Identify the last verified beta build with purchase safeguards intact. f3cbed6 and 01607e5 are historical UI checkpoints, NOT verified safe beta rollback targets.
3. Revert the faulty change on design/v1.2-studio-first-100926, preserving the beta page marker and Preview checkout-denial guard.
4. Run the full automated suite, including test-beta-safety.mjs, then verify the exact resulting Preview and protected tester access.
5. Resume invitations only after guest/customer/owner checks and browser regression pass. Do not restore database records or promote to Production as part of this procedure.

Status: procedure documented; recovery rehearsal and two-customer checks are not yet complete.
