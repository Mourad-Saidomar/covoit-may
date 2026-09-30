// ============================================================
// Contrôleur MESSAGE
// ============================================================
import * as messageService from '../services/messageService.js'

export async function conversations(req, res) {
  res.json(await messageService.conversations(req.utilisateur.id))
}

export async function conversationAvec(req, res) {
  res.json(await messageService.conversationAvec(req.utilisateur.id, req.params.id))
}

export async function envoyer(req, res) {
  res.status(201).json(await messageService.envoyer(req.utilisateur.id, req.body))
}
