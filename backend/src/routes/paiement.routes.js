// ============================================================
// Routes PAIEMENT : /api/paiements (administrateur)
// ============================================================
import { Router } from 'express'
import * as paiementController from '../controllers/paiementController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser } from '../middlewares/autoriser.js'

const router = Router()

router.get('/', authentifier, autoriser('admin'), paiementController.transactions)

export default router
