# UI and State Contract

## Booking outcomes

Booking store actions return an outcome that the calling view can display. An accepted operation returns a
success outcome and, where relevant, the booking. A rejected operation returns a French error message and
does not alter trip capacity or booking state.

| Action | Required state | Success effect | Rejection effect |
|---|---|---|---|
| Create request | Future open trip, valid passenger and seat count | One `en_attente` booking | No booking or capacity change |
| Accept request | Existing `en_attente` booking and enough capacity | Booking becomes `confirmee`, capacity decreases once | No state or capacity change |
| Refuse request | Existing `en_attente` booking | Booking becomes `refusee` | No state change |
| Cancel request | Existing active booking | Booking becomes `annulee`; confirmed capacity is restored once | No state or capacity change |

## Verification visibility

| Driver state | Newly published trip | Public search | Admin validation |
|---|---|---|---|
| Verified | `ouvert` | Visible when future | No change needed |
| Unverified | `en_attente_validation` | Not visible | Becomes `ouvert` |

## Review dialog

The review dialog exposes `role="dialog"`, `aria-modal="true"`, and an accessible title. On opening it
receives focus; Escape and its close button dismiss it; dismissal returns focus to the control that opened
it.
