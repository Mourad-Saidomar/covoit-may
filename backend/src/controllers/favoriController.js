// ============================================================
// Contrôleur FAVORI
// ============================================================
import * as favoriService from '../services/favoriService.js'

export async function mesFavoris(req, res) {
  res.json(await favoriService.mesFavoris(req.utilisateur.id))
}

export async function ajouter(req, res) {
  res.status(201).json(await favoriService.ajouter(req.utilisateur.id, req.params.idConducteur))
}

export async function retirer(req, res) {
  res.json(await favoriService.retirer(req.utilisateur.id, req.params.idConducteur))
}
