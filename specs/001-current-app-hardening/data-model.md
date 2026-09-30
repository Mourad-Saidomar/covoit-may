# Data Model: Consolidation de Covoit'May

## Utilisateur

- `id`: unique demo identifier.
- `role`: `passager`, `conducteur`, or `admin`.
- `verifie`: driver identity approval flag.
- `statut`: account state; only non-suspended demo users may sign in.

## Trajet

- Existing route, date, capacity, price, and driver fields are retained.
- `statut`: `ouvert`, `en_attente_validation`, `annule`, or `termine`.
- A driver with `verifie: false` creates `en_attente_validation` trips.
- Only `ouvert` future trips appear in public search; validating a driver promotes that driver's pending
  trips to `ouvert`.

## Réservation

- Existing fields remain: trip, passenger, seat count, amount, timestamps, and state.
- States: `en_attente`, `confirmee`, `refusee`, `annulee`, `terminee`.
- Creation requires an open future trip, a different passenger and driver, a positive whole seat count
  within remaining capacity, and no active booking by that passenger for that trip.
- Only `en_attente` bookings can become `confirmee` or `refusee`.
- Accepting decrements capacity once; cancelling a confirmed booking restores capacity once.

## Avis

- Existing author, target, trip, rating and comment fields are retained.
- The review modal remains eligible only for a completed/past confirmed booking and prevents duplicate
  reviews from the same author for the same trip.
