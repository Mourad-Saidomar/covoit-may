// ============================================================
// Routes NOTIFICATIONS : /api/notifications (membres)
// ============================================================
import { Router } from 'express'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser, MEMBRES } from '../middlewares/autoriser.js'
import * as notificationService from '../services/notificationService.js'

const router = Router()

router.get('/', authentifier, autoriser(MEMBRES), async function (req, res) {
  res.json(await notificationService.compteurs(req.utilisateur.id))
})

export default router
