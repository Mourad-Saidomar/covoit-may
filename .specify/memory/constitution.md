<!--
Sync Impact Report
- Version change: unfilled template -> 1.0.0
- Modified principles: template placeholders -> five project-specific principles
- Added sections: Product Boundaries and Delivery Quality
- Removed sections: none
- Follow-up TODOs: none
-->
# Covoit'May Constitution

## Core Principles

### I. Preserve the Existing Vue Application
Changes MUST extend the existing Vue 3, Vue Router, Pinia, Bootstrap, and Vite application before
introducing a replacement abstraction or stack. Existing routes, components, stores, helpers, and
working user flows MUST be reused when they fit; incompatible architecture changes require a written
reason and a migration plan. This protects a nearly complete learning project from avoidable rewrites.

### II. Honest Demonstration Boundaries
The application MUST label simulated authentication, payments, identity checks, and in-memory data
truthfully. No interface may claim that a real payment, secure server authentication, persistence, or
identity verification occurred when the current front-end-only implementation did not perform it.
Production integrations may be added only with server-side security and configuration designed for them.

### III. Domain-State Integrity
User actions MUST preserve valid trip, booking, review, message, alert, and moderation states. A booking
MUST not exceed available seats, state transitions MUST be guarded against repeated or invalid actions,
and role-restricted operations MUST respect router and store rules. The rationale is that a credible
demonstration still needs internally coherent business behaviour.

### IV. Accessible, Responsive French UX
User-facing pages MUST remain in clear French, work from small mobile screens to desktop, and expose
labels, keyboard-operable controls, focus handling, and meaningful empty/error states for critical
journeys. Motion MUST continue to respect the existing reduced-motion preference. Mayotte-specific place
names and local-carpooling context MUST be retained where existing content uses them.

### V. Proportionate Verification
Every functional change MUST be limited to the affected files, preserve existing behaviour outside its
scope, and be verified by the relevant build and focused flow checks. The production build MUST pass
before handoff. New tests are required when practical without introducing a testing framework solely for
a very small corrective change; otherwise the manually reproducible validation path MUST be documented.

## Product Boundaries

Covoit'May is currently a client-side demonstration platform. Pinia owns demo domain data in memory and
`localStorage` only retains the selected demo session. There is no backend, database, live API, payment
processor, automated identity verification, or real notification delivery in the present scope. Work
MUST improve this architecture in place and MUST NOT add fake network/security guarantees. Any future
backend, payment, or persistence work requires a separate specification, secure secret handling, and
end-to-end contract validation.

## Delivery Quality

Planning and implementation MUST map changes to observable user journeys across public, passenger,
driver, and administrator roles. Frontend changes MUST be checked for route guards, responsive layout,
and obvious accessibility regressions. Build output and generated feature artifacts are not substitutes
for source verification. Repository changes outside the Covoit'May project directory are out of scope.

## Governance

This constitution governs Covoit'May feature specifications, plans, tasks, reviews, and implementation.
Each plan and convergence review MUST check its requirements against these principles. Amendments require
an explicit documented reason, an impact assessment for existing flows, and an update to this file.
Versioning follows semantic intent: MAJOR for incompatible principle removal or redefinition, MINOR for a
new or materially expanded principle or section, and PATCH for non-semantic clarification. Compliance is
reviewed before implementation and again before delivery; exceptions require an explicit written
justification in the relevant plan.

**Version**: 1.0.0 | **Ratified**: 2026-09-21 | **Last Amended**: 2026-09-21
