// ============================================================
// Routes VÉHICULE : /api/vehicules (conducteurs)
// ============================================================
import { Router } from 'express'
import * as vehiculeController from '../controllers/vehiculeController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'
import { validateVehiculeBody } from '../middlewares/validateVehiculeBody.js'

const router = Router()

router.use(authentifier, autoriser('conducteur'))

router.get('/', vehiculeController.mesVehicules)
router.post('/', validateVehiculeBody, vehiculeController.ajouter)
router.patch('/:id/desactiver', validateId(), vehiculeController.desactiver)

export default router
