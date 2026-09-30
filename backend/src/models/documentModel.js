// ============================================================
// Modèle DOCUMENTS : les données des PDF (reçus, relevés, rapports)
// ------------------------------------------------------------
// Une période est un mois : [debut, fin[ , ex. '2026-09-01' et
// '2026-10-01'. Les montants viennent de la table paiement, calculés
// par la base (RG06.5) : le PDF ne fait que les afficher.
// ============================================================
import { requete } from '../config/db.js'

// Reçu d'une réservation : paiement, trajet, passager, conducteur
export async function recu(idReservation) {
  const [ligne] = await requete(
    `SELECT r.id_reservation, r.id_utilisateur AS id_passager, r.nb_places_reservees, r.prix_unitaire, r.montant,
            r.taux_commission, r.statut AS reservation_statut, r.date_reservation, r.date_annulation, r.annulee_par,
            p.reference, p.mode_paiement, p.statut AS paiement_statut, p.commission, p.montant_net,
            p.date_creation, p.date_paiement, p.date_remboursement,
            t.lieu_depart, t.lieu_arrivee, t.point_rdv, t.date_trajet, t.heure_depart,
            pa.prenom AS passager_prenom, pa.nom AS passager_nom, pa.email AS passager_email,
            co.prenom AS conducteur_prenom, CONCAT(LEFT(co.nom, 1), '.') AS conducteur_nom,
            CONCAT_WS(' ', v.marque, v.modele, v.couleur) AS vehicule,
            (SELECT COALESCE(SUM(l.montant_rembourse), 0) FROM litige l
              WHERE l.id_reservation = r.id_reservation AND l.statut = 'resolu') AS rembourse_litige
       FROM reservation r
       JOIN paiement p ON p.id_reservation = r.id_reservation
       JOIN trajet t ON t.id_trajet = r.id_trajet
       JOIN utilisateur pa ON pa.id_utilisateur = r.id_utilisateur
       JOIN utilisateur co ON co.id_utilisateur = t.id_utilisateur
       JOIN vehicule v ON v.id_vehicule = t.id_vehicule
      WHERE r.id_reservation = ?`, [idReservation])
  return ligne || null
}

// ---------- Relevé mensuel d'un membre ----------

// Ses réservations dont le trajet a lieu dans le mois
export function trajetsPassager(idUtilisateur, debut, fin) {
  return requete(
    `SELECT r.id_reservation, r.nb_places_reservees, r.montant, r.statut, t.lieu_depart, t.lieu_arrivee,
            t.date_trajet, t.heure_depart, p.statut AS paiement_statut, p.reference
       FROM reservation r
       JOIN trajet t ON t.id_trajet = r.id_trajet
       LEFT JOIN paiement p ON p.id_reservation = r.id_reservation
      WHERE r.id_utilisateur = ? AND t.date_trajet >= ? AND t.date_trajet < ?
      ORDER BY t.date_trajet, t.heure_depart`, [idUtilisateur, debut, fin])
}

// Ses trajets de conducteur du mois, avec les paiements encaissés
export function trajetsConducteur(idUtilisateur, debut, fin) {
  return requete(
    `SELECT t.id_trajet, t.lieu_depart, t.lieu_arrivee, t.date_trajet, t.heure_depart, t.statut, t.places_total,
            COALESCE(SUM(IF(p.statut = 'valide', r.nb_places_reservees, 0)), 0) AS places_payees,
            COALESCE(SUM(IF(p.statut = 'valide', p.montant, 0)), 0) AS brut,
            COALESCE(SUM(IF(p.statut = 'valide', p.commission, 0)), 0) AS commission,
            COALESCE(SUM(IF(p.statut = 'valide', p.montant_net, 0)), 0) AS net
       FROM trajet t
       LEFT JOIN reservation r ON r.id_trajet = t.id_trajet
       LEFT JOIN paiement p ON p.id_reservation = r.id_reservation
      WHERE t.id_utilisateur = ? AND t.date_trajet >= ? AND t.date_trajet < ?
      GROUP BY t.id_trajet
      ORDER BY t.date_trajet, t.heure_depart`, [idUtilisateur, debut, fin])
}

// ---------- Rapport d'activité mensuel (administrateur) ----------

// Chaque indicateur : [nom, requête avec « {P:colonne} » pour la période]
const INDICATEURS = [
  ['inscriptions', "SELECT COUNT(*) FROM utilisateur WHERE {P:date_inscription}"],
  ['inscriptions_conducteurs', "SELECT COUNT(*) FROM utilisateur WHERE role = 'conducteur' AND {P:date_inscription}"],
  ['suppressions', "SELECT COUNT(*) FROM utilisateur WHERE {P:date_suppression}"],
  ['suspensions', "SELECT COUNT(*) FROM journal_admin WHERE action = 'SUSPENSION_COMPTE' AND {P:date_action}"],
  ['demandes_recues', "SELECT COUNT(*) FROM demande_conducteur WHERE {P:date_demande}"],
  ['demandes_acceptees', "SELECT COUNT(*) FROM demande_conducteur WHERE statut = 'acceptee' AND {P:date_traitement}"],
  ['demandes_refusees', "SELECT COUNT(*) FROM demande_conducteur WHERE statut = 'refusee' AND {P:date_traitement}"],
  ['trajets_publies', "SELECT COUNT(*) FROM trajet WHERE {P:date_publication}"],
  ['trajets_du_mois', "SELECT COUNT(*) FROM trajet WHERE {P:date_trajet}"],
  ['trajets_termines', "SELECT COUNT(*) FROM trajet WHERE statut = 'termine' AND {P:date_trajet}"],
  ['trajets_annules', "SELECT COUNT(*) FROM trajet WHERE statut = 'annule' AND {P:date_trajet}"],
  ['places_proposees', "SELECT COALESCE(SUM(places_total), 0) FROM trajet WHERE statut <> 'annule' AND {P:date_trajet}"],
  ['places_occupees', `SELECT COALESCE(SUM(r.nb_places_reservees), 0) FROM reservation r JOIN trajet t ON t.id_trajet = r.id_trajet
                        WHERE r.statut IN ('confirmee','terminee') AND {P:t.date_trajet}`],
  ['encaisse', "SELECT COALESCE(SUM(montant), 0) FROM paiement WHERE statut = 'valide' AND {P:date_paiement}"],
  ['commission', "SELECT COALESCE(SUM(commission), 0) FROM paiement WHERE statut = 'valide' AND {P:date_paiement}"],
  ['reverse', "SELECT COALESCE(SUM(montant_net), 0) FROM paiement WHERE statut = 'valide' AND {P:date_paiement}"],
  ['rembourse', "SELECT COALESCE(SUM(montant), 0) FROM paiement WHERE statut = 'rembourse' AND {P:date_remboursement}"],
  ['nb_remboursements', "SELECT COUNT(*) FROM paiement WHERE statut = 'rembourse' AND {P:date_remboursement}"],
  ['autorisations', "SELECT COUNT(*) FROM paiement WHERE statut = 'autorise' AND {P:date_creation}"],
  ['avis', "SELECT COUNT(*) FROM avis WHERE {P:date_avis}"],
  ['note_moyenne', "SELECT AVG(note) FROM avis WHERE signale = 0 AND {P:date_avis}"],
  ['signalements', "SELECT COUNT(*) FROM avis WHERE {P:date_signalement}"],
  ['litiges_ouverts', "SELECT COUNT(*) FROM litige WHERE {P:date_ouverture}"],
  ['litiges_resolus', "SELECT COUNT(*) FROM litige WHERE statut = 'resolu' AND {P:date_resolution}"],
  ['rembourse_litiges', "SELECT COALESCE(SUM(montant_rembourse), 0) FROM litige WHERE statut = 'resolu' AND {P:date_resolution}"]
]

export async function indicateurs(debut, fin) {
  const valeurs = []
  const morceaux = INDICATEURS.map(function ([nom, sql]) {
    const avecPeriode = sql.replace(/\{P:([a-z_.]+)\}/g, function (tout, colonne) {
      valeurs.push(debut, fin)
      return `${colonne} >= ? AND ${colonne} < ?`
    })
    return `(${avecPeriode}) AS ${nom}`
  })
  const [ligne] = await requete(`SELECT ${morceaux.join(',\n')}`, valeurs)
  return ligne
}

// Réservations des trajets du mois, par statut
export function reservationsParStatut(debut, fin) {
  return requete(
    `SELECT r.statut, COUNT(*) AS nb FROM reservation r JOIN trajet t ON t.id_trajet = r.id_trajet
      WHERE t.date_trajet >= ? AND t.date_trajet < ? GROUP BY r.statut ORDER BY nb DESC`, [debut, fin])
}

// Les itinéraires les plus actifs du mois
export function itineraires(debut, fin, limite = 5) {
  return requete(
    `SELECT t.lieu_depart, t.lieu_arrivee, COUNT(DISTINCT t.id_trajet) AS trajets,
            COALESCE(SUM(IF(r.statut IN ('confirmee','terminee'), r.nb_places_reservees, 0)), 0) AS places
       FROM trajet t LEFT JOIN reservation r ON r.id_trajet = t.id_trajet
      WHERE t.date_trajet >= ? AND t.date_trajet < ?
      GROUP BY t.lieu_depart, t.lieu_arrivee
      ORDER BY trajets DESC, places DESC, t.lieu_depart LIMIT ${Number(limite)}`, [debut, fin])
}

// Les actions des administrateurs du mois, par type
export function actionsParType(debut, fin) {
  return requete(
    `SELECT action, COUNT(*) AS nb FROM journal_admin WHERE date_action >= ? AND date_action < ?
      GROUP BY action ORDER BY nb DESC`, [debut, fin])
}

// ---------- Relevé des transactions et journal (administrateur) ----------

export function transactions(debut, fin) {
  return requete(
    `SELECT p.reference, p.mode_paiement, p.statut, p.montant, p.commission, p.montant_net,
            p.date_creation, p.date_paiement, p.date_remboursement,
            t.lieu_depart, t.lieu_arrivee, u.prenom, CONCAT(LEFT(u.nom, 1), '.') AS nom_initiale
       FROM paiement p
       JOIN reservation r ON r.id_reservation = p.id_reservation
       JOIN trajet t ON t.id_trajet = r.id_trajet
       JOIN utilisateur u ON u.id_utilisateur = r.id_utilisateur
      WHERE p.date_creation >= ? AND p.date_creation < ?
      ORDER BY p.date_creation, p.id_paiement`, [debut, fin])
}

export function journal(debut, fin) {
  return requete(
    `SELECT j.date_action, j.action, j.table_cible, j.id_cible, j.details, j.adresse_ip, a.prenom, a.nom
       FROM journal_admin j JOIN administrateur a ON a.id_admin = j.id_admin
      WHERE j.date_action >= ? AND j.date_action < ?
      ORDER BY j.date_action, j.id_journal`, [debut, fin])
}
