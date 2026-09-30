# Tasks: Consolidation de Covoit'May

**Input**: Design documents from `specs/001-current-app-hardening/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No automated test framework exists and the specification does not request TDD. Each story has a
manual independent verification criterion and the final production build is mandatory.

## Phase 1: Setup

**Purpose**: Confirm the existing project baseline and required ignore rules without changing architecture.

- [X] T001 Verify Node/Vite ignore coverage and the baseline build in .gitignore and package.json

---

## Phase 2: Foundational

**Purpose**: Make the retained demo session resilient before role-dependent flows run.

- [X] T002 Safely recover from an invalid persisted demo session in src/stores/auth.js

**Checkpoint**: Invalid browser session data falls back to a visitor state without breaking the app.

---

## Phase 3: User Story 1 - Réserver sans incohérence (Priority: P1) 🎯 MVP

**Goal**: Preserve valid booking and capacity states on every supported passenger/driver action.

**Independent Test**: Request, accept, refuse and cancel a demo booking; repeat each invalid action and
confirm status and remaining seats do not change.

- [X] T003 [US1] Guard booking creation and state transitions in src/stores/data.js
- [X] T004 [US1] Show booking validation feedback and prevent self-booking in src/views/TripDetailView.vue
- [X] T005 [US1] Show driver acceptance/refusal feedback in src/views/MyTripsView.vue

**Checkpoint**: A passenger cannot duplicate, over-capacity, or self-book; a driver cannot reprocess a
booking already handled.

---

## Phase 4: User Story 2 - Publier conformément au statut conducteur (Priority: P2)

**Goal**: Allow unverified drivers to prepare trips without exposing them before validation.

**Independent Test**: Publish as the existing pending driver, confirm absence from public search, validate
the driver as admin, then confirm the trip becomes visible.

- [X] T006 [US2] Add pending-trip visibility and admin promotion rules in src/stores/data.js
- [X] T007 [US2] Align publication status feedback with verification state in src/views/PublishTripView.vue

**Checkpoint**: Pending trips are retained for their driver and become open only after the existing admin
validation flow.

---

## Phase 5: User Story 3 - Utiliser les parcours de démonstration de façon accessible (Priority: P3)

**Goal**: Make the existing review dialog predictable for keyboard users while retaining the responsive UI.

**Independent Test**: Open the review form, inspect its dialog semantics, close it with Escape, and verify
focus returns to the launch control.

- [X] T008 [US3] Add accessible dialog, Escape, and focus-return behavior in src/views/MyBookingsView.vue

**Checkpoint**: The review flow remains usable with mouse, touch, and keyboard.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the declared demo boundary and final user-visible quality.

- [X] T009 Confirm simulated-service wording and responsive critical actions in src/views/TripDetailView.vue and src/components/AppFooter.vue
- [X] T010 Run the documented manual scenarios and production build from specs/001-current-app-hardening/quickstart.md and package.json

---

## Dependencies & Execution Order

- T001 and T002 precede story changes.
- T003 precedes T004 and T005 because views consume its outcomes.
- T006 precedes T007 because publishing relies on the new status.
- T008 is independent after T002.
- T009 and T010 follow all story tasks.

## Parallel Opportunities

- T006 and T008 touch different files and can proceed in parallel after T002.
- T004 and T005 touch different views but both depend on T003.

## Implementation Strategy

Deliver P1 first, verify the booking lifecycle, then add verification visibility and review-dialog
accessibility. Keep all changes within the existing stores and views; use the final build as the release
gate.
