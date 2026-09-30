// ============================================================
// Validation : ouverture et résolution d'un litige
// ============================================================
import { verifierCorps, verifierFiltres, texte, entier, nombre, choix } from './validation.js'

export const validateLitigeBody = verifierCorps({
  idReservation: entier({ min: 1 }),
  motif: texte({ min: 5, max: 255 }),
  description: texte({ max: 2000, facultatif: true })
})

// Administrateur : décision (RG10.5)
export const validateResolutionBody = verifierCorps({
  decision: choix(['remboursement_total', 'remboursement_partiel', 'avertissement', 'sans_suite']),
  resolution: texte({ min: 5, max: 1000 }),
  montantRembourse: nombre({ min: 0, max: 100, facultatif: true })
})

export const validateFiltreLitiges = verifierFiltres({
  statut: choix(['ouvert', 'en_cours', 'resolu'])
})
