// ============================================================
// Service RÉSERVATION
// ------------------------------------------------------------
// Parcours : le passager réserve et paie (paiement « autorisé »)
// -> le conducteur accepte (paiement « validé ») ou refuse
// (paiement « annulé »). Les places et le paiement suivent
// automatiquement grâce aux triggers (RG05.5, RG06.7, RG06.8).
// ============================================================
import crypto from 'node:crypto'
import { transaction } from '../config/db.js'
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as reservationModel from '../models/reservationModel.js'
import * as paiementModel from '../models/paiementModel.js'
import * as journalModel from '../models/journalModel.js'

// Référence du paiement. En production, ce serait l'identifiant
// renvoyé par le prestataire (Stripe) : aucune donnée de carte ici (RG06.6).
function referencePaiement() {
  return 'CM-' + crypto.randomBytes(8).toString('hex').toUpperCase()
}

export async function reserver(passager, donnees) {
  const id = await transaction(async function (cx) {
    // La base vérifie : trajet ouvert et à venir, pas le sien, places,
    // une seule réservation active (RG05.2 à RG05.7) et calcule le montant
    const idReservation = await reservationModel.creer(donnees.idTrajet, passager.id, donnees.nbPlaces, cx)
    await paiementModel.creer(referencePaiement(), donnees.modePaiement, idReservation, cx)
    return idReservation
  })
  return reservationModel.versReservation(await reservationModel.trouverParId(id))
}

export async function mesReservations(idPassager) {
  const lignes = await reservationModel.listerParPassager(idPassager)
  return lignes.map(reservationModel.versReservation)
}

async function trouver(id) {
  const reservation = await reservationModel.trouverParId(id)
  if (!reservation) throw new ErreurApi(404, 'Réservation introuvable.')
  return reservation
}

// Seul le conducteur du trajet accepte ou refuse (RG05.9)
async function reservationDeMonTrajet(conducteur, id) {
  const reservation = await trouver(id)
  if (reservation.id_conducteur !== conducteur.id) {
    throw new ErreurApi(403, 'Cette demande ne concerne pas un de vos trajets.')
  }
  if (reservation.statut !== 'en_attente') {
    throw new ErreurApi(409, 'Cette demande a déjà été traitée.')
  }
  return reservation
}

export async function accepter(conducteur, id) {
  await reservationDeMonTrajet(conducteur, id)
  await reservationModel.changerStatut(id, 'confirmee')
  return reservationModel.versReservation(await trouver(id))
}

export async function refuser(conducteur, id) {
  await reservationDeMonTrajet(conducteur, id)
  await reservationModel.changerStatut(id, 'refusee')
  return reservationModel.versReservation(await trouver(id))
}

// Annulation par le passager lui-même (ou par l'administrateur).
// Remboursement si annulée assez tôt, selon la règle RG06.8.
export async function annuler(utilisateur, id, ip) {
  const reservation = await trouver(id)
  const estAdmin = utilisateur.role === 'admin'
  if (!estAdmin && reservation.id_utilisateur !== utilisateur.id) {
    throw new ErreurApi(403, 'Cette réservation ne vous appartient pas.')
  }
  if (!['en_attente', 'confirmee'].includes(reservation.statut)) {
    throw new ErreurApi(409, 'Cette réservation ne peut plus être annulée.')
  }
  await transaction(async function (cx) {
    await reservationModel.changerStatut(id, 'annulee', estAdmin ? 'admin' : 'passager', cx)
    if (estAdmin) {
      await journalModel.ajouter({ idAdmin: utilisateur.id, action: 'ANNULATION_RESERVATION', tableCible: 'reservation', idCible: id, ip }, cx)
    }
  })
  const apres = await trouver(id)
  const resultat = reservationModel.versReservation(apres)
  resultat.rembourse = apres.paiement_statut === 'rembourse' || apres.paiement_statut === 'annule'
  return resultat
}
