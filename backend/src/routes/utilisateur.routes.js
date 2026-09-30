// ============================================================
// Routes UTILISATEUR : /api/utilisateurs
// ------------------------------------------------------------
// "/moi" désigne toujours la personne connectée : on ne peut pas
// lire ou modifier le compte d'un autre en changeant un numéro
// dans l'adresse (RG02.16).
// ============================================================
import { Router } from 'express'
import * as utilisateurController from '../controllers/utilisateurController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser, MEMBRES } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'
import { uploadPhotoProfil } from '../middlewares/uploadMedia.js'
import {
  validateProfilBody, validateMotDePasseBody, validateSuppressionBody,
  validateStatutBody, validateRechercheUtilisateurs
} from '../middlewares/validateUtilisateurBody.js'

const router = Router()

// Mon compte
router.get('/moi', authentifier, autoriser(MEMBRES), utilisateurController.monProfil)
router.put('/moi', authentifier, autoriser(MEMBRES), validateProfilBody, utilisateurController.modifierProfil)
router.put('/moi/mot-de-passe', authentifier, autoriser(MEMBRES), validateMotDePasseBody, utilisateurController.changerMotDePasse)
router.delete('/moi', authentifier, autoriser(MEMBRES), validateSuppressionBody, utilisateurController.supprimerMonCompte)
// Photo de profil (RG02.19) : envoi en multipart, champ « photo »
router.put('/moi/photo', authentifier, autoriser(MEMBRES), uploadPhotoProfil, utilisateurController.changerPhoto)
router.delete('/moi/photo', authentifier, autoriser(MEMBRES), utilisateurController.supprimerPhoto)

// Profil public et avis reçus (visiteurs compris)
router.get('/:id/profil', validateId(), utilisateurController.profilPublic)
router.get('/:id/avis', validateId(), utilisateurController.avisRecus)
router.get('/:id/photo', validateId(), utilisateurController.photo)

// Administrateur
router.get('/', authentifier, autoriser('admin'), validateRechercheUtilisateurs, utilisateurController.lister)
router.patch('/:id/statut', authentifier, autoriser('admin'), validateId(), validateStatutBody, utilisateurController.changerStatut)

export default router
