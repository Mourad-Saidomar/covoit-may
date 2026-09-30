# Quickstart Validation: Consolidation de Covoit'May

## Prerequisites

1. Run `npm install` once.
2. Start the application with `npm run dev`.
3. Use the documented demo accounts from the project README.

## Validation scenarios

1. Sign in as Naïma, open a future trip by another driver, and request one seat. Sign in as that driver and
   accept once. Confirm capacity decreases once and a repeated acceptance leaves it unchanged.
2. Sign in as Saïd (unverified driver), publish a valid future trip, then verify it does not appear in public
   search. Sign in as the admin, validate Saïd, and confirm the prepared trip becomes searchable.
3. Sign in as Naïma, open a historic eligible reservation, launch the review form, then press Escape. Confirm
   it closes and focus returns to the review trigger.
4. Clear or replace the `cm_session` browser storage value with invalid JSON, reload, and confirm the app
   remains usable as a visitor.
5. Run `npm run build`; it must complete successfully.

See [data-model.md](data-model.md) and [ui-state-contract.md](contracts/ui-state-contract.md) for expected
state transitions.
