// ============================================================
// Route inconnue : réponse 404 en JSON
// (placé après toutes les routes dans app.js)
// ============================================================
export function notFound(req, res) {
  res.status(404).json({ erreur: 'Cette adresse n’existe pas sur l’API.' })
}
