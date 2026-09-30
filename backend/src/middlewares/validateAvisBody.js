// ============================================================
// Validation : avis et signalement d'un avis
// ============================================================
import { verifierCorps, verifierFiltres, texte, entier, booleen } from './validation.js'

export const validateAvisBody = verifierCorps({
  idTrajet: entier({ min: 1 }),
  note: entier({ min: 1, max: 5 }),                       // RG07.4
  commentaire: texte({ min: 10, max: 500 })               // RG07.7
})

export const validateSignalementBody = verifierCorps({
  motif: texte({ min: 5, max: 255 })                      // RG07.10
})

export const validateFiltreAvis = verifierFiltres({
  signales: booleen()
})
