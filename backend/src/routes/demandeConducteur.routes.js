// ============================================================
// Routes DEMANDE CONDUCTEUR : /api/demandes-conducteur
// ============================================================
import { Router } from 'express'
import * as demandeController from '../controllers/demandeConducteurController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser, MEMBRES } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'
import { uploadJustificatifs, supprimerFichiersRecus } from '../middlewares/uploadJustificatifs.js'
import { validateDemandeConducteurBody, validateRefusBody, validateFiltreDemandes } from '../middlewares/validateVehiculeBody.js'

const router = Router()

// Membre : déposer une demande (formulaire multipart avec 2 fichiers)
router.post('/', authentifier, autoriser(MEMBRES), uploadJustificatifs, validateDemandeConducteurBody, demandeController.deposer)
router.get('/moi', authentifier, autoriser(MEMBRES), demandeController.mesDemandes)

// Administrateur : examiner les demandes et les justificatifs (RG08.4)
router.get('/', authentifier, autoriser('admin'), validateFiltreDemandes, demandeController.lister)
router.get('/:id/justificatifs/:type', authentifier, autoriser('admin'), validateId(), demandeController.telechargerJustificatif)
router.post('/:id/accepter', authentifier, autoriser('admin'), validateId(), demandeController.accepter)
router.post('/:id/refuser', authentifier, autoriser('admin'), validateId(), validateRefusBody, demandeController.refuser)

// En cas d'erreur après l'envoi (données invalides…), les fichiers reçus sont effacés
router.use(function (erreur, req, res, next) {
  supprimerFichiersRecus(req)
  next(erreur)
})

export default router
