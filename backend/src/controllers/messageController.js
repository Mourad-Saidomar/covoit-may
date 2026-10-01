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

// La conversation ouverte reçoit un message en direct : il est lu
export async function lire(req, res) {
  res.json(await messageService.lire(req.utilisateur.id, req.body.avec))
}

// Modifier un texte (15 minutes, RG09.3)
export async function modifier(req, res) {
  res.json(await messageService.modifier(req.utilisateur.id, req.params.id, req.body.contenu))
}

// Supprimer pour moi, ou pour tous (24 heures, RG09.8)
export async function supprimer(req, res) {
  res.json(await messageService.supprimer(req.utilisateur.id, req.params.id, req.body.pourTous === true))
}

// Données personnelles : gardées par le navigateur, jamais par un cache partagé
export async function fichier(req, res) {
  const f = await messageService.lireFichier(req.utilisateur.id, req.params.id)
  res.set({ 'Content-Type': f.type, 'Cache-Control': 'private, max-age=86400' })
  res.send(f.contenu)
}
