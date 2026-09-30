// ============================================================
// Routes ALERTE : /api/alertes (membres)
// ============================================================
import { Router } from 'express'
import * as alerteController from '../controllers/alerteController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser, MEMBRES } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'
import { validateAlerteBody, validateEtatAlerteBody } from '../middlewares/validateAlerteBody.js'

const router = Router()

router.use(authentifier, autoriser(MEMBRES))

router.get('/', alerteController.mesAlertes)
router.post('/', validateAlerteBody, alerteController.creer)
router.patch('/:id', validateId(), validateEtatAlerteBody, alerteController.changerEtat)
router.delete('/:id', validateId(), alerteController.supprimer)

export default router
