// ============================================================
// Routes ADMIN : /api/admin (administrateurs uniquement)
// ------------------------------------------------------------
// La modération des avis, des litiges, des comptes et des
// demandes conducteur se trouve dans les routes de chaque entité.
// ============================================================
import { Router } from 'express'
import * as adminController from '../controllers/adminController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser } from '../middlewares/autoriser.js'
import { validateParametreBody } from '../middlewares/validateAdminBody.js'
import { ErreurApi } from '../middlewares/errorHandler.js'

const router = Router()

router.use(authentifier, autoriser('admin'))

// Le nom d'un paramètre : lettres minuscules et "_" seulement
function validateCle(req, res, next) {
  if (!/^[a-z_]{1,50}$/.test(req.params.cle)) throw new ErreurApi(400, 'Nom de paramètre invalide.')
  next()
}

router.get('/tableau-de-bord', adminController.tableauDeBord)
router.get('/parametres', adminController.parametres)
router.put('/parametres/:cle', validateCle, validateParametreBody, adminController.modifierParametre)
router.get('/journal', adminController.journal)

export default router
