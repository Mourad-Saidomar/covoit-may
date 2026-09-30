// ============================================================
// Contrôle d'accès par rôle (RG13.2)
// ------------------------------------------------------------
// À placer APRÈS authentifier. Exemple :
//   router.post('/', authentifier, autoriser('conducteur'), …)
// Rôles : 'passager', 'conducteur', 'admin'.
// ============================================================
import { ErreurApi } from './errorHandler.js'

// Les membres qui voyagent (l'administrateur ne réserve pas et ne publie pas)
export const MEMBRES = ['passager', 'conducteur']

export function autoriser(...roles) {
  const autorises = roles.flat()
  return function (req, res, next) {
    if (!req.utilisateur || !autorises.includes(req.utilisateur.role)) {
      throw new ErreurApi(403, 'Vous n’avez pas accès à cette action.')
    }
    next()
  }
}
