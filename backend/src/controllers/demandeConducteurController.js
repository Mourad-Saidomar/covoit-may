// ============================================================
// Contrôleur DEMANDE CONDUCTEUR
// ============================================================
import path from 'node:path'
import * as demandeService from '../services/demandeConducteurService.js'
import { ErreurApi } from '../middlewares/errorHandler.js'

export async function deposer(req, res) {
  res.status(201).json(await demandeService.deposer(req))
}

export async function mesDemandes(req, res) {
  res.json(await demandeService.mesDemandes(req.utilisateur.id))
}

// ---------- Administrateur ----------

export async function lister(req, res) {
  res.json(await demandeService.lister(req.filtres.statut))
}

// Téléchargement d'un justificatif : jamais mis en cache (données sensibles)
export async function telechargerJustificatif(req, res) {
  const type = req.params.type
  if (type !== 'identite' && type !== 'permis') throw new ErreurApi(400, 'Justificatif inconnu (identite ou permis).')
  const chemin = await demandeService.cheminJustificatif(req.params.id, type)
  res.set('Cache-Control', 'no-store')
  res.download(chemin, `demande-${req.params.id}-${type}${path.extname(chemin)}`)
}

export async function accepter(req, res) {
  res.json(await demandeService.accepter(req.utilisateur, req.params.id, req.ip))
}

export async function refuser(req, res) {
  res.json(await demandeService.refuser(req.utilisateur, req.params.id, req.body.motif, req.ip))
}
