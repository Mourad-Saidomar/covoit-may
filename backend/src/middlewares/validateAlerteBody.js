// ============================================================
// Validation : alertes de trajet
// ============================================================
import { verifierCorps, texte, heure, nombre, booleen } from './validation.js'

export const validateAlerteBody = verifierCorps({
  depart: texte({ max: 60 }),
  arrivee: texte({ max: 60 }),
  heureMin: heure(),
  heureMax: heure(),
  prixMax: nombre({ min: 1, max: 10, facultatif: true })
})

// Activer ou mettre en pause une alerte
export const validateEtatAlerteBody = verifierCorps({
  active: booleen()
})
