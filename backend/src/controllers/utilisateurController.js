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

// ---------- Photo de profil ----------

export async function changerPhoto(req, res) {
  res.json(await utilisateurService.changerPhoto(req.utilisateur.id, req.fichier))
}

export async function supprimerPhoto(req, res) {
  res.json(await utilisateurService.supprimerPhoto(req.utilisateur.id))
}

// Image publique : le site (autre adresse que l'API) doit pouvoir
// l'afficher dans une balise <img>, d'où Cross-Origin-Resource-Policy.
// L'adresse change à chaque nouvelle photo (?v=…) : cache long.
export async function photo(req, res) {
  const fichier = await utilisateurService.photoPublique(req.params.id)
  res.set({
    'Content-Type': fichier.type,
    'Cache-Control': 'public, max-age=604800, immutable',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  })
  res.send(fichier.contenu)
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
