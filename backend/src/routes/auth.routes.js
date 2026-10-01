// ============================================================
// Routes AUTH : /api/auth
// ============================================================
import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { limiteurConnexion } from '../middlewares/limiteurs.js'
import {
  validateInscriptionBody, validateConnexionBody, validateVerificationBody, validateEmailBody, validateReinitialisationBody
} from '../middlewares/validateAuthBody.js'

const router = Router()

router.post('/inscription', limiteurConnexion, validateInscriptionBody, authController.inscription)
router.post('/connexion', limiteurConnexion, validateConnexionBody, authController.connexion)
// Code reçu par email : vérification de l'adresse (RG02.20, RG02.21)
router.post('/verifier-email', limiteurConnexion, validateVerificationBody, authController.verifierEmail)
router.post('/renvoyer-code', limiteurConnexion, validateEmailBody, authController.renvoyerCode)
// Mot de passe oublié : un code, puis le nouveau mot de passe
router.post('/mot-de-passe-oublie', limiteurConnexion, validateEmailBody, authController.motDePasseOublie)
router.post('/reinitialiser-mot-de-passe', limiteurConnexion, validateReinitialisationBody, authController.reinitialiserMotDePasse)
router.get('/moi', authentifier, authController.moi)

export default router
