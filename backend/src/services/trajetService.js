// ============================================================
// Service TRAJET
// ------------------------------------------------------------
// Les règles « dures » (conducteur vérifié, date future, places,
// prix, véhicule du conducteur…) sont aussi vérifiées par les
// triggers de la base : même un appel direct en SQL les respecte.
// ============================================================
import * as alerteService from './alerteService.js'
import { transaction } from '../config/db.js'
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as trajetModel from '../models/trajetModel.js'
import * as vehiculeModel from '../models/vehiculeModel.js'
import * as reservationModel from '../models/reservationModel.js'
import * as journalModel from '../models/journalModel.js'

export async function rechercher(filtres) {
  const lignes = await trajetModel.rechercher(filtres)
  return lignes.map(trajetModel.versTrajet)
}

export async function detail(id) {
  const ligne = await trajetModel.trouverDetail(id)
  if (!ligne) throw new ErreurApi(404, 'Trajet introuvable.')
  return trajetModel.versTrajet(ligne)
}

export async function mesTrajets(idConducteur) {
  const lignes = await trajetModel.listerParConducteur(idConducteur)
  return lignes.map(trajetModel.versTrajet)
}

// Le trajet doit exister et appartenir à la personne connectée (RG04.18)
async function monTrajet(utilisateur, id) {
  const trajet = await trajetModel.trouverParId(id)
  if (!trajet) throw new ErreurApi(404, 'Trajet introuvable.')
  if (trajet.id_utilisateur !== utilisateur.id && utilisateur.role !== 'admin') {
    throw new ErreurApi(403, 'Ce trajet ne vous appartient pas.')
  }
  return trajet
}

function verifierRecurrence(donnees) {
  if (donnees.recurrent && !(donnees.joursRecurrents && donnees.joursRecurrents.length)) {
    throw new ErreurApi(400, 'Choisissez au moins un jour pour un trajet régulier.')
  }
}

export async function publier(utilisateur, donnees) {
  verifierRecurrence(donnees)
  // Sans véhicule précisé : le véhicule actif le plus récent
  let idVehicule = donnees.idVehicule
  if (!idVehicule) {
    const vehicule = await vehiculeModel.premierActif(utilisateur.id)
    if (!vehicule) throw new ErreurApi(409, 'Ajoutez d’abord un véhicule à votre profil.')
    idVehicule = vehicule.id_vehicule
  }
  const id = await trajetModel.creer(donnees, utilisateur.id, idVehicule)
  alerteService.prevenirAbonnes(id).catch((e) => console.error('[alertes]', e.message))
  return detail(id)
}

export async function modifier(utilisateur, id, donnees) {
  await monTrajet(utilisateur, id)
  if (donnees.recurrent === false) donnees.joursRecurrents = []
  verifierRecurrence(donnees)
  // La base refuse si des réservations sont actives (RG04.14)
  await trajetModel.modifier(id, donnees)
  return detail(id)
}

// Annulation par le conducteur (ou l'administrateur) : toutes les
// réservations actives sont annulées et remboursées (RG04.15)
export async function annuler(utilisateur, id, ip) {
  const trajet = await monTrajet(utilisateur, id)
  if (!['ouvert', 'complet'].includes(trajet.statut)) {
    throw new ErreurApi(409, 'Ce trajet est déjà terminé ou annulé.')
  }
  const auteur = utilisateur.role === 'admin' ? 'admin' : 'conducteur'
  await transaction(async function (cx) {
    await reservationModel.annulerActivesDuTrajet(id, auteur, cx)
    await trajetModel.annuler(id, cx)
    if (auteur === 'admin') {
      await journalModel.ajouter({ idAdmin: utilisateur.id, action: 'ANNULATION_TRAJET', tableCible: 'trajet', idCible: id, ip }, cx)
    }
  })
  return detail(id)
}

// Les demandes de réservation d'un trajet (seulement pour son conducteur)
export async function reservationsDuTrajet(utilisateur, id) {
  await monTrajet(utilisateur, id)
  const lignes = await reservationModel.listerParTrajet(id)
  return lignes.map(reservationModel.versReservation)
}
