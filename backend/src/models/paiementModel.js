// ============================================================
// Modèle PAIEMENT
// ------------------------------------------------------------
// Le montant et la commission sont calculés par la base (RG06.5).
// Aucune donnée de carte bancaire n'est stockée (RG06.6).
// ============================================================
import { requete } from '../config/db.js'

export function versPaiement(l) {
  return {
    id: l.id_paiement,
    reference: l.reference,
    reservationId: l.id_reservation,
    montant: l.montant,
    commission: l.commission,
    montantNet: l.montant_net,
    mode: l.mode_paiement,
    statut: l.statut,
    dateCreation: l.date_creation,
    datePaiement: l.date_paiement,
    dateRemboursement: l.date_remboursement,
    trajet: l.lieu_depart ? l.lieu_depart + ' → ' + l.lieu_arrivee : undefined,
    passager: l.passager_prenom ? l.passager_prenom + ' ' + l.passager_nom : undefined
  }
}

export async function creer(reference, mode, idReservation, cx) {
  await requete('INSERT INTO paiement (reference, mode_paiement, id_reservation) VALUES (?, ?, ?)',
    [reference, mode, idReservation], cx)
}

// Remboursement intégral décidé par l'administrateur (litige)
export async function rembourser(idReservation, cx) {
  await requete("UPDATE paiement SET statut = 'rembourse' WHERE id_reservation = ? AND statut = 'valide'",
    [idReservation], cx)
}

// Toutes les transactions (administrateur)
export async function lister() {
  return requete(
    `SELECT p.*, t.lieu_depart, t.lieu_arrivee, u.prenom AS passager_prenom, CONCAT(LEFT(u.nom, 1), '.') AS passager_nom
       FROM paiement p
       JOIN reservation r ON r.id_reservation = p.id_reservation
       JOIN trajet t ON t.id_trajet = r.id_trajet
       JOIN utilisateur u ON u.id_utilisateur = r.id_utilisateur
      ORDER BY p.date_creation DESC LIMIT 500`)
}

// Totaux : encaissé, commission, reversé, remboursé
export async function totaux() {
  const [ligne] = await requete(
    `SELECT COALESCE(SUM(IF(statut = 'valide', montant, 0)), 0) AS encaisse,
            COALESCE(SUM(IF(statut = 'valide', commission, 0)), 0) AS commission,
            COALESCE(SUM(IF(statut = 'valide', montant_net, 0)), 0) AS reverse,
            COALESCE(SUM(IF(statut = 'rembourse', montant, 0)), 0) AS rembourse,
            SUM(statut = 'autorise') AS en_attente
       FROM paiement`)
  return {
    encaisse: ligne.encaisse,
    commission: ligne.commission,
    reverseAuxConducteurs: ligne.reverse,
    rembourse: ligne.rembourse,
    autorisationsEnAttente: Number(ligne.en_attente || 0)
  }
}
