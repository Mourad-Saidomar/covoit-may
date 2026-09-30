// ============================================================
// Routes DOCUMENTS : /api/documents (PDF)
// ------------------------------------------------------------
// Membres : reçu d'une réservation (le passager), relevé mensuel.
// Administrateur : rapport d'activité, transactions, journal.
// ============================================================
import { Router } from 'express'
import * as documentController from '../controllers/documentController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser, MEMBRES } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'
import { validateMois } from '../middlewares/validateMois.js'

const router = Router()

router.use(authentifier)

// Le service vérifie que la réservation est bien celle du passager connecté
router.get('/recus/:id', autoriser(MEMBRES, 'admin'), validateId(), documentController.recu)
router.get('/releves/:mois', autoriser(MEMBRES), validateMois, documentController.releve)

router.get('/admin/activite/:mois', autoriser('admin'), validateMois, documentController.rapportActivite)
router.get('/admin/transactions/:mois', autoriser('admin'), validateMois, documentController.transactions)
router.get('/admin/journal/:mois', autoriser('admin'), validateMois, documentController.journal)

export default router
