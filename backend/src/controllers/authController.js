// ============================================================
// Contrôleur AUTH
// ------------------------------------------------------------
// Un contrôleur lit la requête, appelle le service et renvoie la
// réponse JSON. Il ne contient ni SQL ni règle de gestion.
// ============================================================
import * as authService from '../services/authService.js'

export async function inscription(req, res) {
  const resultat = await authService.inscrire(req.body)
  res.status(201).json(resultat)
}

export async function connexion(req, res) {
  const resultat = await authService.connecter(req.body.email, req.body.motDePasse)
  res.json(resultat)
}

export async function verifierEmail(req, res) {
  res.json(await authService.verifierEmail(req.body.email, req.body.code))
}

export async function renvoyerCode(req, res) {
  res.json(await authService.renvoyerCodeInscription(req.body.email))
}

export async function motDePasseOublie(req, res) {
  res.json(await authService.motDePasseOublie(req.body.email))
}

export async function reinitialiserMotDePasse(req, res) {
  res.json(await authService.reinitialiserMotDePasse(req.body.email, req.body.code, req.body.nouveauMotDePasse))
}

export async function moi(req, res) {
  res.json(await authService.moi(req.utilisateur))
}
