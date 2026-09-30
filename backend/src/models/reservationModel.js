// ============================================================
// Modèle RÉSERVATION
// ------------------------------------------------------------
// Les places du trajet et le statut du paiement sont mis à jour
// par les triggers de la base à chaque changement de statut.
// ============================================================
import { requete } from '../config/db.js'

export function versReservation(l) {
  const reservation = {
    id: l.id_reservation,
    trajetId: l.id_trajet,
    passagerId: l.id_utilisateur,
    statut: l.statut,
    places: l.nb_places_reservees,
    prixUnitaire: l.prix_unitaire,
    montant: l.montant,
    tauxCommission: l.taux_commission,
    dateReservation: l.date_reservation,
    dateReponse: l.date_reponse,
    dateAnnulation: l.date_annulation,
    annuleePar: l.annulee_par
  }
  if (l.avis_depose !== undefined) reservation.avisDepose = l.avis_depose === 1
  if (l.paiement_statut !== undefined) {
    reservation.paiement = { statut: l.paiement_statut, mode: l.mode_paiement, reference: l.reference }
  }
  if (l.lieu_depart !== undefined) {
    reservation.trajet = {
      depart: l.lieu_depart,
      arrivee: l.lieu_arrivee,
      pointRdv: l.point_rdv,
      dateDepart: l.date_trajet + 'T' + l.heure_depart,
      statut: l.trajet_statut,
      conducteur: {
        id: l.id_conducteur,
        prenom: l.conducteur_prenom,
        nom: l.conducteur_nom,
        // Le téléphone n'est donné qu'une fois la réservation confirmée (RG02.18)
        telephone: l.conducteur_telephone
      }
    }
  }
  if (l.passager_prenom !== undefined) {
    reservation.passager = {
      id: l.id_utilisateur,
      prenom: l.passager_prenom,
      nom: l.passager_nom,
      note: l.passager_note,
      telephone: l.passager_telephone
    }
  }
  return reservation
}

export async function creer(idTrajet, idPassager, nbPlaces, cx) {
  const resultat = await requete(
    'INSERT INTO reservation (id_trajet, id_utilisateur, nb_places_reservees) VALUES (?, ?, ?)',
    [idTrajet, idPassager, nbPlaces], cx)
  return resultat.insertId
}

// Une réservation, avec le conducteur et l'heure du trajet
export async function trouverParId(id, cx) {
  const [ligne] = await requete(
    `SELECT r.*, t.id_utilisateur AS id_conducteur, t.date_trajet, t.heure_depart,
            p.statut AS paiement_statut, p.mode_paiement, p.reference
       FROM reservation r
       JOIN trajet t ON t.id_trajet = r.id_trajet
       LEFT JOIN paiement p ON p.id_reservation = r.id_reservation
      WHERE r.id_reservation = ?`, [id], cx)
  return ligne || null
}

// Les réservations d'un passager, avec le trajet et le conducteur
export async function listerParPassager(idPassager) {
  return requete(
    `SELECT r.*, t.lieu_depart, t.lieu_arrivee, t.point_rdv, t.date_trajet, t.heure_depart, t.statut AS trajet_statut,
            t.id_utilisateur AS id_conducteur, u.prenom AS conducteur_prenom,
            CONCAT(LEFT(u.nom, 1), '.') AS conducteur_nom,
            IF(r.statut = 'confirmee', u.telephone, NULL) AS conducteur_telephone,
            p.statut AS paiement_statut, p.mode_paiement, p.reference,
            EXISTS (SELECT 1 FROM avis a WHERE a.id_trajet = r.id_trajet AND a.id_utilisateur = r.id_utilisateur) AS avis_depose
       FROM reservation r
       JOIN trajet t ON t.id_trajet = r.id_trajet
       JOIN utilisateur u ON u.id_utilisateur = t.id_utilisateur
       LEFT JOIN paiement p ON p.id_reservation = r.id_reservation
      WHERE r.id_utilisateur = ?
      ORDER BY t.date_trajet DESC, t.heure_depart DESC`, [idPassager])
}

// Les demandes et passagers d'un trajet (vue du conducteur)
export async function listerParTrajet(idTrajet) {
  return requete(
    `SELECT r.*, u.prenom AS passager_prenom, CONCAT(LEFT(u.nom, 1), '.') AS passager_nom,
            u.note_moyenne AS passager_note,
            IF(r.statut = 'confirmee', u.telephone, NULL) AS passager_telephone,
            p.statut AS paiement_statut, p.mode_paiement, p.reference
       FROM reservation r
       JOIN utilisateur u ON u.id_utilisateur = r.id_utilisateur
       LEFT JOIN paiement p ON p.id_reservation = r.id_reservation
      WHERE r.id_trajet = ?
      ORDER BY r.date_reservation`, [idTrajet])
}

export async function changerStatut(id, statut, annuleePar, cx) {
  await requete('UPDATE reservation SET statut = ?, annulee_par = ? WHERE id_reservation = ?',
    [statut, annuleePar || null, id], cx)
}

// Annule d'un coup les réservations actives d'un trajet (trajet annulé)
export async function annulerActivesDuTrajet(idTrajet, annuleePar, cx) {
  await requete(
    "UPDATE reservation SET statut = 'annulee', annulee_par = ? WHERE id_trajet = ? AND statut IN ('en_attente','confirmee')",
    [annuleePar, idTrajet], cx)
}

// Annule les réservations actives d'un passager (compte suspendu ou supprimé)
export async function annulerActivesDuPassager(idPassager, annuleePar, cx) {
  await requete(
    "UPDATE reservation SET statut = 'annulee', annulee_par = ? WHERE id_utilisateur = ? AND statut IN ('en_attente','confirmee')",
    [annuleePar, idPassager], cx)
}

// A-t-on voyagé ensemble ? (passager d'un trajet de l'autre, ou l'inverse)
export async function sontLies(idA, idB) {
  const [ligne] = await requete(
    `SELECT COUNT(*) AS nb FROM reservation r JOIN trajet t ON t.id_trajet = r.id_trajet
      WHERE (r.id_utilisateur = ? AND t.id_utilisateur = ?) OR (r.id_utilisateur = ? AND t.id_utilisateur = ?)`,
    [idA, idB, idB, idA])
  return ligne.nb > 0
}
