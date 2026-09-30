// ============================================================
// Routes AUTH : /api/auth
// ============================================================
import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { limiteurConnexion } from '../middlewares/limiteurs.js'
import { validateInscriptionBody, validateConnexionBody } from '../middlewares/validateAuthBody.js'

const router = Router()

router.post('/inscription', limiteurConnexion, validateInscriptionBody, authController.inscription)
router.post('/connexion', limiteurConnexion, validateConnexionBody, authController.connexion)
router.get('/moi', authentifier, authController.moi)

export default router
