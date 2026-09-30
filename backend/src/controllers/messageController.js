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

// Photo ou vocal : le fichier a été contrôlé par uploadPieceJointe,
// les champs texte du formulaire par validateFichierMessageBody
export async function envoyerFichier(req, res) {
  const message = await messageService.envoyerFichier(
    req.utilisateur.id, req.body.idDestinataire, req.fichier, req.body.dureeSecondes)
  res.status(201).json(message)
}

// Données personnelles : gardées par le navigateur, jamais par un cache partagé
export async function fichier(req, res) {
  const f = await messageService.lireFichier(req.utilisateur.id, req.params.id)
  res.set({ 'Content-Type': f.type, 'Cache-Control': 'private, max-age=86400' })
  res.send(f.contenu)
}
