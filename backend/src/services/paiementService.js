// ============================================================
// Service PAIEMENT (suivi des transactions par l'administrateur)
// ------------------------------------------------------------
// Les paiements sont créés avec la réservation et changent d'état
// automatiquement (triggers). Ici : consultation uniquement.
// ============================================================
import * as paiementModel from '../models/paiementModel.js'

export async function transactions() {
  const [lignes, totaux] = await Promise.all([paiementModel.lister(), paiementModel.totaux()])
  return { totaux, transactions: lignes.map(paiementModel.versPaiement) }
}
