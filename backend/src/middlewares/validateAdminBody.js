// ============================================================
// Validation : réglages de la plateforme (administrateur)
// ============================================================
import { verifierCorps, texte } from './validation.js'

// La valeur est un nombre écrit en texte ("0.12", "24"). Les bornes
// précises de chaque paramètre sont vérifiées par la base (RG12.1).
export const validateParametreBody = verifierCorps({
  valeur: texte({ max: 20, motif: /^[0-9]+([.][0-9]+)?$/, message: 'doit être un nombre (ex. 0.12)' })
})
