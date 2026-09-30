// ============================================================
// Contrôleur LITIGE
// ============================================================
import * as litigeService from '../services/litigeService.js'

export async function ouvrir(req, res) {
  res.status(201).json(await litigeService.ouvrir(req.utilisateur, req.body))
}

export async function mesLitiges(req, res) {
  res.json(await litigeService.mesLitiges(req.utilisateur.id))
}

// ---------- Administrateur ----------

export async function lister(req, res) {
  res.json(await litigeService.lister(req.filtres.statut))
}

export async function prendreEnCharge(req, res) {
  res.json(await litigeService.prendreEnCharge(req.utilisateur, req.params.id, req.ip))
}

export async function resoudre(req, res) {
  res.json(await litigeService.resoudre(req.utilisateur, req.params.id, req.body, req.ip))
}
