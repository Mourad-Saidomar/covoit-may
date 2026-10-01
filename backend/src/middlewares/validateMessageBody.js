// ============================================================
// Validation : message
// ============================================================
import { verifierCorps, texte, entier, booleen } from './validation.js'

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

// Modifier un texte (RG09.2, RG09.3)
export const validateModificationMessageBody = verifierCorps({
  contenu: texte({ max: 1000 })
})

// Supprimer : pourTous = true (pour tout le monde) ou false (pour moi) (RG09.8)
export const validateSuppressionMessageBody = verifierCorps({
  pourTous: booleen()
})

// Marquer comme lus les messages reçus d'une personne
export const validateLectureBody = verifierCorps({
  avec: entier({ min: 1 })
})
