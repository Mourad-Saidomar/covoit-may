// ============================================================
// Vérifie que les identifiants de l'adresse sont des entiers
// positifs (ex. /api/trajets/12). "/api/trajets/abc" ou
// "/api/trajets/1 OR 1=1" sont refusés tout de suite (RG13.4).
//
// Utilisation : router.get('/:id', validateId(), …)
//               router.get('/:id/avec/:autre', validateId('id', 'autre'), …)
// ============================================================
import { ErreurApi } from './errorHandler.js'

export function validateId(...noms) {
  const parametres = noms.length ? noms : ['id']
  return function (req, res, next) {
    for (const nom of parametres) {
      const texte = req.params[nom]
      if (!/^[1-9][0-9]{0,9}$/.test(texte || '')) {
        throw new ErreurApi(400, `Identifiant « ${nom} » invalide.`)
      }
      req.params[nom] = Number(texte)
    }
    next()
  }
}
