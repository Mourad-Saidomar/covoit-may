// ============================================================
// Validation : formulaire de contact
// ------------------------------------------------------------
// « site » est un piège à robots (honeypot) : ce champ est caché
// aux humains, seul un robot qui remplit tout le complète.
// ============================================================
import { verifierCorps, texte, email, choix } from './validation.js'

export const SUJETS_CONTACT = ['question', 'compte', 'reservation', 'paiement', 'signalement', 'suggestion', 'autre']

export const validateContactBody = verifierCorps({
  nom: texte({ min: 2, max: 100 }),
  email: email(),
  sujet: choix(SUJETS_CONTACT),
  message: texte({ min: 10, max: 2000 }),
  site: texte({ max: 200, facultatif: true })
})
