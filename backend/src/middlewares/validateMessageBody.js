// ============================================================
// Validation : message
// ============================================================
import { verifierCorps, texte, entier } from './validation.js'

export const validateMessageBody = verifierCorps({
  idDestinataire: entier({ min: 1 }),
  contenu: texte({ max: 1000 })                           // RG09.2
})
