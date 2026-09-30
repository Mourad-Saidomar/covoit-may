// ============================================================
// Contrôleur ALERTE
// ============================================================
import * as alerteService from '../services/alerteService.js'

export async function mesAlertes(req, res) {
  res.json(await alerteService.mesAlertes(req.utilisateur.id))
}

export async function creer(req, res) {
  res.status(201).json(await alerteService.creer(req.utilisateur.id, req.body))
}

export async function changerEtat(req, res) {
  res.json(await alerteService.changerEtat(req.utilisateur.id, req.params.id, req.body.active))
}

export async function supprimer(req, res) {
  await alerteService.supprimer(req.utilisateur.id, req.params.id)
  res.status(204).end()
}
