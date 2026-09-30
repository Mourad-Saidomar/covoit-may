// ============================================================
// Contrôleur TRAJET
// ============================================================
import * as trajetService from '../services/trajetService.js'

export async function rechercher(req, res) {
  res.json(await trajetService.rechercher(req.filtres))
}

export async function detail(req, res) {
  res.json(await trajetService.detail(req.params.id))
}

export async function mesTrajets(req, res) {
  res.json(await trajetService.mesTrajets(req.utilisateur.id))
}

export async function publier(req, res) {
  res.status(201).json(await trajetService.publier(req.utilisateur, req.body))
}

export async function modifier(req, res) {
  res.json(await trajetService.modifier(req.utilisateur, req.params.id, req.body))
}

export async function annuler(req, res) {
  res.json(await trajetService.annuler(req.utilisateur, req.params.id, req.ip))
}

export async function reservations(req, res) {
  res.json(await trajetService.reservationsDuTrajet(req.utilisateur, req.params.id))
}
