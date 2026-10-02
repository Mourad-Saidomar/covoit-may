// ============================================================
// Service CONTACT : formulaire « Nous contacter »
// ------------------------------------------------------------
// Le message part par email à l'équipe (emailService). Il n'est pas
// enregistré dans la base : seule l'équipe le reçoit (minimisation,
// RGPD).
// ============================================================
import * as emailService from './emailService.js'
import { ErreurApi } from '../middlewares/errorHandler.js'

const LIBELLES_SUJETS = {
  question: 'Question générale',
  compte: 'Mon compte',
  reservation: 'Une réservation ou un trajet',
  paiement: 'Paiement ou remboursement',
  signalement: 'Signaler un problème ou un membre',
  suggestion: 'Suggestion',
  autre: 'Autre'
}

export async function envoyer({ nom, email, sujet, message, site }, idUtilisateur = null) {
  // Piège à robots rempli : on fait comme si tout allait bien, sans rien envoyer
  if (site) return
  try {
    await emailService.envoyerMessageContact({
      nom,
      email,
      sujet: LIBELLES_SUJETS[sujet],
      message,
      idUtilisateur
    })
  } catch (erreur) {
    console.error('[contact] envoi impossible :', erreur.message)
    throw new ErreurApi(503, 'Le message n’a pas pu être envoyé. Réessayez dans quelques minutes.')
  }
}
