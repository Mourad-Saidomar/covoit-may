// ============================================================
// Service NOTIFICATIONS : les pastilles de la barre de navigation
// ------------------------------------------------------------
// Une seule requête pour les deux compteurs : messages non lus et
// trajets nouveaux pour les alertes (RG11.6).
// ============================================================
import * as messageModel from '../models/messageModel.js'
import * as alerteModel from '../models/alerteModel.js'

export async function compteurs(idUtilisateur) {
  const [messagesNonLus, alertesNouvelles] = await Promise.all([
    messageModel.nbNonLus(idUtilisateur),
    alerteModel.nbNouveaux(idUtilisateur)
  ])
  return { messagesNonLus, alertesNouvelles }
}
