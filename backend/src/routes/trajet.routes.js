// ============================================================
// Routes TRAJET : /api/trajets
// ============================================================
import { Router } from 'express'
import * as trajetController from '../controllers/trajetController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'
import { validateTrajetBody, validateModificationTrajetBody, validateRechercheTrajets } from '../middlewares/validateTrajetBody.js'

const router = Router()

// Visiteurs : recherche et détail
router.get('/', validateRechercheTrajets, trajetController.rechercher)
router.get('/moi', authentifier, autoriser('conducteur'), trajetController.mesTrajets)
router.get('/:id', validateId(), trajetController.detail)

// Conducteur : publier, modifier, annuler, voir les demandes
router.post('/', authentifier, autoriser('conducteur'), validateTrajetBody, trajetController.publier)
router.patch('/:id', authentifier, autoriser('conducteur'), validateId(), validateModificationTrajetBody, trajetController.modifier)
router.post('/:id/annuler', authentifier, autoriser('conducteur', 'admin'), validateId(), trajetController.annuler)
router.get('/:id/reservations', authentifier, autoriser('conducteur', 'admin'), validateId(), trajetController.reservations)

export default router
