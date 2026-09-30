// ============================================================
// Journal des requêtes (console)
// ------------------------------------------------------------
// Une ligne par requête : heure, méthode, adresse, code de
// réponse, durée et utilisateur. On n'écrit JAMAIS le corps de
// la requête (mot de passe) ni le jeton de connexion (RG13.12).
// ============================================================
export function requestLogger(req, res, next) {
  const debut = Date.now()
  res.on('finish', function () {
    const duree = Date.now() - debut
    const qui = req.utilisateur ? `${req.utilisateur.role}#${req.utilisateur.id}` : 'anonyme'
    // On retire les paramètres de l'adresse (ils peuvent contenir des données saisies)
    const adresse = req.originalUrl.split('?')[0]
    console.log(`${new Date().toISOString()} ${req.method} ${adresse} ${res.statusCode} ${duree}ms ${qui}`)
  })
  next()
}
