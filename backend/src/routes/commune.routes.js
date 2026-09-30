// ============================================================
// Routes COMMUNE : /api/communes (publique)
// ============================================================
import { Router } from 'express'
import * as communeController from '../controllers/communeController.js'

const router = Router()

router.get('/', communeController.lister)

export default router
