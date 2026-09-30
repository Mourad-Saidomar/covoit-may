// ============================================================
// Routes LITIGE : /api/litiges
// ============================================================
import { Router } from 'express'
import * as litigeController from '../controllers/litigeController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser, MEMBRES } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'
import { validateLitigeBody, validateResolutionBody, validateFiltreLitiges } from '../middlewares/validateLitigeBody.js'

const router = Router()

router.use(authentifier)

// Membres
router.post('/', autoriser(MEMBRES), validateLitigeBody, litigeController.ouvrir)
router.get('/moi', autoriser(MEMBRES), litigeController.mesLitiges)

// Administrateur
router.get('/', autoriser('admin'), validateFiltreLitiges, litigeController.lister)
router.post('/:id/prendre-en-charge', autoriser('admin'), validateId(), litigeController.prendreEnCharge)
router.post('/:id/resoudre', autoriser('admin'), validateId(), validateResolutionBody, litigeController.resoudre)

export default router
