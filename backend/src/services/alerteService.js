// ============================================================
// Service ALERTE
// ============================================================
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as alerteModel from '../models/alerteModel.js'

export async function mesAlertes(idUtilisateur) {
  const lignes = await alerteModel.listerParUtilisateur(idUtilisateur)
  return lignes.map(alerteModel.versAlerte)
}

// La base vérifie : communes connues, heures cohérentes (RG11.1),
// 10 alertes actives au maximum (RG11.2), pas de doublon (RG11.3)
export async function creer(idUtilisateur, donnees) {
  await alerteModel.creer(donnees, idUtilisateur)
  return mesAlertes(idUtilisateur)
}

async function monAlerte(idUtilisateur, id) {
  const alerte = await alerteModel.trouverParId(id)
  if (!alerte || alerte.id_utilisateur !== idUtilisateur) throw new ErreurApi(404, 'Alerte introuvable.')
  return alerte
}

export async function changerEtat(idUtilisateur, id, active) {
  await monAlerte(idUtilisateur, id)
  await alerteModel.changerEtat(id, active)
  return mesAlertes(idUtilisateur)
}

export async function supprimer(idUtilisateur, id) {
  await monAlerte(idUtilisateur, id)
  await alerteModel.supprimer(id)
}
