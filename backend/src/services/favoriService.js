// ============================================================
// Service FAVORI
// ============================================================
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as favoriModel from '../models/favoriModel.js'

export function mesFavoris(idUtilisateur) {
  return favoriModel.lister(idUtilisateur)
}

// La base vérifie : un conducteur (RG11.4), pas soi-même, pas deux fois
export async function ajouter(idUtilisateur, idConducteur) {
  await favoriModel.ajouter(idUtilisateur, idConducteur)
  return mesFavoris(idUtilisateur)
}

export async function retirer(idUtilisateur, idConducteur) {
  const nb = await favoriModel.retirer(idUtilisateur, idConducteur)
  if (!nb) throw new ErreurApi(404, 'Ce conducteur n’est pas dans vos favoris.')
  return mesFavoris(idUtilisateur)
}
