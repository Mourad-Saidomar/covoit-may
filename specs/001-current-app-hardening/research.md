# Research: Consolidation de Covoit'May

## Decision: Keep the existing client-side Pinia model

**Rationale**: The audited project explicitly identifies itself as an in-memory demonstration. Adding a
backend, database, or payment SDK would expand rather than correct the requested scope and would conflict
with the existing deployment model.

**Alternatives considered**: A live API or persisted browser data was not selected because neither is
needed to make the existing demonstration state coherent.

## Decision: Enforce state rules in store actions

**Rationale**: Both passenger and driver views invoke the same booking actions. Store-level guards prevent
invalid calls from any current or future view and keep seat counts authoritative in one place.

**Alternatives considered**: View-only disabling was rejected because it does not protect direct/repeated
calls and duplicates business rules.

## Decision: Represent verification-pending trips with a distinct status

**Rationale**: The existing public search already includes only open trips. A pending status reuses this
rule, keeps prepared trips visible to their driver, and lets the existing admin validation action promote
them without a new route or model.

**Alternatives considered**: Blocking form submission would contradict the existing message that drivers
can prepare their trips before verification.

## Decision: Use native Vue focus and keyboard handling for the modal

**Rationale**: The project already renders the modal conditionally. Adding dialog attributes, an Escape
handler, focus on open, and focus return on close fixes the observable keyboard gap without a dependency.

**Alternatives considered**: A new modal package was rejected because Bootstrap is already installed and
the existing markup needs only small, direct improvements.
