// ============================================================
// Contrôleur RÉSERVATION
// ============================================================
import * as reservationService from '../services/reservationService.js'

export async function reserver(req, res) {
  res.status(201).json(await reservationService.reserver(req.utilisateur, req.body))
}

export async function mesReservations(req, res) {
  res.json(await reservationService.mesReservations(req.utilisateur.id))
}

export async function accepter(req, res) {
  res.json(await reservationService.accepter(req.utilisateur, req.params.id))
}

export async function refuser(req, res) {
  res.json(await reservationService.refuser(req.utilisateur, req.params.id))
}

export async function annuler(req, res) {
  res.json(await reservationService.annuler(req.utilisateur, req.params.id, req.ip))
}
