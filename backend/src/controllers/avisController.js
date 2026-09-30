// ============================================================
// Contrôleur AVIS
// ============================================================
import * as avisService from '../services/avisService.js'

export async function deposer(req, res) {
  res.status(201).json(await avisService.deposer(req.utilisateur, req.body))
}

export async function signaler(req, res) {
  await avisService.signaler(req.utilisateur, req.params.id, req.body.motif)
  res.json({ message: 'Avis signalé : il est masqué en attendant la décision de l’équipe.' })
}

// ---------- Administrateur ----------

export async function lister(req, res) {
  res.json(await avisService.lister(req.filtres.signales))
}

export async function restaurer(req, res) {
  await avisService.restaurer(req.utilisateur, req.params.id, req.ip)
  res.json({ message: 'Avis restauré.' })
}

export async function supprimer(req, res) {
  await avisService.supprimer(req.utilisateur, req.params.id, req.ip)
  res.status(204).end()
}
