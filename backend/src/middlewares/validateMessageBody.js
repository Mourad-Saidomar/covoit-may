// ============================================================
// Validation : message
// ============================================================
import { verifierCorps, texte, entier } from './validation.js'

export const validateMessageBody = verifierCorps({
  idDestinataire: entier({ min: 1 }),
  contenu: texte({ max: 1000 })                           // RG09.2
})

// Photo ou vocal (formulaire multipart, lu après uploadPieceJointe) :
// les champs arrivent en texte, entier() les convertit (RG09.7)
export const validateFichierMessageBody = verifierCorps({
  idDestinataire: entier({ min: 1 }),
  dureeSecondes: entier({ min: 1, max: 120, facultatif: true })
})
