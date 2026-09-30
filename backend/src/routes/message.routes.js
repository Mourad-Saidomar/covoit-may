// ============================================================
// Routes MESSAGE : /api/messages (membres)
// ============================================================
import { Router } from 'express'
import * as messageController from '../controllers/messageController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser, MEMBRES } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'
import { validateMessageBody, validateFichierMessageBody } from '../middlewares/validateMessageBody.js'
import { uploadPieceJointe } from '../middlewares/uploadMedia.js'

const router = Router()

router.use(authentifier, autoriser(MEMBRES))

router.get('/', messageController.conversations)
router.get('/avec/:id', validateId(), messageController.conversationAvec)
router.post('/', validateMessageBody, messageController.envoyer)
// Photo ou message vocal (RG09.6, RG09.7)
router.post('/fichier', uploadPieceJointe, validateFichierMessageBody, messageController.envoyerFichier)
router.get('/:id/fichier', validateId(), messageController.fichier)

export default router
