// ============================================================
// Validation : un mois dans l'adresse, ex. /documents/releve/2026-09
// ------------------------------------------------------------
// Format AAAA-MM, pas de mois futur (heure de Mayotte), et pas
// avant l'ouverture de la plateforme (2025).
// ============================================================
import { ErreurApi } from './errorHandler.js'

function moisActuel() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Indian/Mayotte', year: 'numeric', month: '2-digit' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}`
}

export function validateMois(req, res, next) {
  const mois = req.params.mois
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(mois || '')) {
    throw new ErreurApi(400, 'Le mois doit être au format AAAA-MM (ex. 2026-09).')
  }
  if (mois < '2025-01' || mois > moisActuel()) {
    throw new ErreurApi(400, 'Ce mois n’est pas disponible.')
  }
  next()
}
