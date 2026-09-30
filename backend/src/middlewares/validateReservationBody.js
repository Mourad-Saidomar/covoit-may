// ============================================================
// Validation : réservation
// ------------------------------------------------------------
// Le client envoie seulement le trajet, le nombre de places et le
// moyen de paiement. Le prix et le montant sont calculés par la
// base : un "montant" envoyé est tout simplement ignoré (RG05.6).
// ============================================================
import { verifierCorps, entier, choix } from './validation.js'

export const validateReservationBody = verifierCorps({
  idTrajet: entier({ min: 1 }),
  nbPlaces: entier({ min: 1, max: 6 }),                   // RG05.12
  modePaiement: choix(['carte', 'mobile_money'])          // RG06.4
})
