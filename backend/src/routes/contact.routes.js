// ============================================================
// Routes CONTACT : /api/contact (public)
// ------------------------------------------------------------
// Ouvert à tous, même sans compte. Si la personne est connectée,
// son numéro de membre est joint au message pour l'équipe.
// ============================================================
import { Router } from 'express'
import { limiteurContact } from '../middlewares/limiteurs.js'
import { validateContactBody } from '../middlewares/validateContactBody.js'
import { verifierJeton } from '../middlewares/authentifier.js'
import * as contactService from '../services/contactService.js'

const router = Router()

// Jeton facultatif : un jeton absent ou expiré n'empêche pas d'écrire
async function membreConnecte(req) {
  const entete = req.headers.authorization || ''
  if (!entete.startsWith('Bearer ')) return null
  try {
    const utilisateur = await verifierJeton(entete.slice(7))
    return utilisateur.role === 'admin' ? null : utilisateur.id
  } catch {
    return null
  }
}

router.post('/', limiteurContact, validateContactBody, async function (req, res) {
  await contactService.envoyer(req.body, await membreConnecte(req))
  res.status(201).json({ message: 'Votre message a bien été envoyé. Nous vous répondrons par email.' })
})

export default router
