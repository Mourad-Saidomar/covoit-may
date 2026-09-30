// ============================================================
// Routes MESSAGE : /api/messages (membres)
// ============================================================
import { Router } from 'express'
import * as messageController from '../controllers/messageController.js'
import { authentifier } from '../middlewares/authentifier.js'
import { autoriser, MEMBRES } from '../middlewares/autoriser.js'
import { validateId } from '../middlewares/validateId.js'
import { validateMessageBody } from '../middlewares/validateMessageBody.js'

const router = Router()

router.use(authentifier, autoriser(MEMBRES))

router.get('/', messageController.conversations)
router.get('/avec/:id', validateId(), messageController.conversationAvec)
router.post('/', validateMessageBody, messageController.envoyer)

export default router
