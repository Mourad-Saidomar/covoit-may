// ============================================================
// Routes AVIS : /api/avis
// ============================================================
import { Router } from 'express'
import * as avisController from '../controllers/avisController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser, MEMBRES } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'
import { validateAvisBody, validateSignalementBody, validateFiltreAvis } from '../middlewares/validateAvisBody.js'

const router = Router()

router.use(authentifier)

// Membres
router.post('/', autoriser(MEMBRES), validateAvisBody, avisController.deposer)
router.post('/:id/signaler', autoriser(MEMBRES), validateId(), validateSignalementBody, avisController.signaler)

// Administrateur : modération
router.get('/', autoriser('admin'), validateFiltreAvis, avisController.lister)
router.post('/:id/restaurer', autoriser('admin'), validateId(), avisController.restaurer)
router.delete('/:id', autoriser('admin'), validateId(), avisController.supprimer)

export default router
