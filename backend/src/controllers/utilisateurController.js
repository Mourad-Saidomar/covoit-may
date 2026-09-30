// ============================================================
// Contrôleur UTILISATEUR
// ============================================================
import * as utilisateurService from '../services/utilisateurService.js'
import * as avisService from '../services/avisService.js'

export async function profilPublic(req, res) {
  res.json(await utilisateurService.profilPublic(req.params.id))
}

export async function avisRecus(req, res) {
  res.json(await avisService.avisRecus(req.params.id))
}

export async function monProfil(req, res) {
  res.json(await utilisateurService.monProfil(req.utilisateur.id))
}

export async function modifierProfil(req, res) {
  res.json(await utilisateurService.modifierProfil(req.utilisateur.id, req.body))
}

export async function changerMotDePasse(req, res) {
  await utilisateurService.changerMotDePasse(req.utilisateur.id, req.body.ancienMotDePasse, req.body.nouveauMotDePasse)
  res.json({ message: 'Mot de passe modifié.' })
}

export async function supprimerMonCompte(req, res) {
  await utilisateurService.supprimerMonCompte(req.utilisateur.id, req.body.motDePasse)
  res.json({ message: 'Votre compte a été supprimé et vos données personnelles effacées.' })
}

// ---------- Administrateur ----------

export async function lister(req, res) {
  res.json(await utilisateurService.lister(req.filtres))
}

export async function changerStatut(req, res) {
  res.json(await utilisateurService.changerStatut(req.utilisateur, req.params.id, req.body.statut, req.body.motif, req.ip))
}
