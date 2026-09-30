// ============================================================
// Routes PARAMÈTRE : /api/parametres (publique)
// ------------------------------------------------------------
// Seulement les réglages que tout le monde peut voir : le taux
// de commission et le délai de remboursement. La modification
// reste réservée aux administrateurs (/api/admin/parametres).
// ============================================================
import { Router } from 'express'
import * as adminController from '../controllers/adminController.js'

const router = Router()

router.get('/', adminController.parametresPublics)

export default router
