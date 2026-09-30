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

export async function moi(req, res) {
  res.json(await authService.moi(req.utilisateur))
}
