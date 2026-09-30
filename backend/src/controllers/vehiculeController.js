// ============================================================
// Contrôleur VÉHICULE
// ============================================================
import * as vehiculeService from '../services/vehiculeService.js'

export async function mesVehicules(req, res) {
  res.json(await vehiculeService.mesVehicules(req.utilisateur.id))
}

export async function ajouter(req, res) {
  res.status(201).json(await vehiculeService.ajouter(req.utilisateur, req.body))
}

export async function desactiver(req, res) {
  await vehiculeService.desactiver(req.utilisateur.id, req.params.id)
  res.status(204).end()
}
