// ============================================================
// Routes RÉSERVATION : /api/reservations
// ------------------------------------------------------------
// Un conducteur peut aussi réserver : il voyage alors comme
// passager (RG08.7). L'administrateur ne réserve pas.
// ============================================================
import { Router } from 'express'
import * as reservationController from '../controllers/reservationController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser, MEMBRES } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'
import { validateReservationBody } from '../middlewares/validateReservationBody.js'

const router = Router()

router.use(authentifier)

router.post('/', autoriser(MEMBRES), validateReservationBody, reservationController.reserver)
router.get('/moi', autoriser(MEMBRES), reservationController.mesReservations)
router.post('/:id/accepter', autoriser('conducteur'), validateId(), reservationController.accepter)
router.post('/:id/refuser', autoriser('conducteur'), validateId(), reservationController.refuser)
router.post('/:id/annuler', autoriser(MEMBRES, 'admin'), validateId(), reservationController.annuler)

export default router
