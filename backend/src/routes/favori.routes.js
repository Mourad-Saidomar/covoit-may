// ============================================================
// Routes FAVORI : /api/favoris (membres)
// ============================================================
import { Router } from 'express'
import * as favoriController from '../controllers/favoriController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser, MEMBRES } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'

const router = Router()

router.use(authentifier, autoriser(MEMBRES))

router.get('/', favoriController.mesFavoris)
router.post('/:idConducteur', validateId('idConducteur'), favoriController.ajouter)
router.delete('/:idConducteur', validateId('idConducteur'), favoriController.retirer)

export default router
