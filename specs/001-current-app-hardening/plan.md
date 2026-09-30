# Implementation Plan: Consolidation de Covoit'May

**Branch**: `001-current-app-hardening` | **Date**: 2026-09-21 | **Spec**: [spec.md](spec.md)

**Input**: Specification of the audited existing application.

## Summary

Consolidate the current client-side Covoit'May demonstration without replacing its Vue application,
routes, data model, or visual system. Correct business-state guards for bookings, align unpublished
driver trips with verification status, make the review modal keyboard-accessible, and consistently expose
the demonstration boundary. The implementation uses the existing Pinia data/auth stores and affected Vue
views only.

## Technical Context

**Language/Version**: JavaScript ES modules; Vue 3.5

**Primary Dependencies**: Vue Router 4, Pinia 3, Bootstrap 5, Bootstrap Icons

**Storage**: In-memory Pinia demo data; `localStorage` stores only the selected demo session

**Testing**: Existing project has no automated test runner; focused manual scenarios plus `npm run build`

**Target Platform**: Modern mobile and desktop browsers, deployed as a static single-page application

**Project Type**: Frontend web application

**Performance Goals**: Preserve the existing single-page interaction responsiveness for its small demo
dataset; no additional network requests or bundles

**Constraints**: Preserve Options API components and existing French/Mayotte UX; no backend, payment API,
database, real identity service, or new test framework in this corrective scope

**Scale/Scope**: Current routes, demo roles and mock domain collections; five source files are expected to
change at most

## Constitution Check

**Pre-design gate: PASS.**

- Principle I: PASS — all changes extend current Pinia stores and Vue views.
- Principle II: PASS — payment/authentication remain visibly simulated and no external integration is added.
- Principle III: PASS — the design adds guarded transitions and capacity checks.
- Principle IV: PASS — the only UX expansion is keyboard/focus semantics for the existing review modal;
  Bootstrap layout remains responsive.
- Principle V: PASS — build and focused manual scenarios are specified; no framework churn is introduced.

**Post-design gate: PASS.** Data and UI contracts below preserve all listed constraints.

## Project Structure

### Documentation (this feature)

```text
specs/001-current-app-hardening/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── ui-state-contract.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── stores/
│   ├── auth.js                 # demo session validation
│   └── data.js                 # guarded domain transitions and visibility
├── views/
│   ├── TripDetailView.vue      # booking feedback and self-booking guard
│   ├── MyBookingsView.vue      # accessible review modal
│   └── MyTripsView.vue         # driver action feedback
├── components/                 # retained unchanged
├── router/index.js             # retained unchanged
└── assets/main.css             # retained unless minimal focus styling is necessary
```

**Structure Decision**: Retain the existing single Vue project. Business validity belongs in Pinia actions;
views show returned feedback and accessibility semantics without duplicating state rules.

## Implementation Phases

1. Add store-level guards and explicit outcomes for booking creation, acceptance, refusal and cancellation.
2. Model unverified-driver trips as pending, keep them out of public results, and publish them when the
   existing admin validation action succeeds.
3. Connect booking and driver views to the outcomes, preventing misleading confirmation feedback.
4. Upgrade the existing review modal with dialog semantics, focus return, and Escape handling.
5. Safely recover from an invalid persisted demo session, document the run-through, and verify the build.

## Complexity Tracking

No constitution violations or complexity exceptions.
