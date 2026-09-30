// ============================================================
// Modèle LITIGE
// ============================================================
import { requete } from '../config/db.js'

export function versLitige(l) {
  return {
    id: l.id_litige,
    reservationId: l.id_reservation,
    demandeurId: l.id_demandeur,
    motif: l.motif,
    description: l.description,
    statut: l.statut,
    decision: l.decision,
    resolution: l.resolution,
    montantRembourse: l.montant_rembourse,
    date: l.date_ouverture,
    dateResolution: l.date_resolution,
    adminId: l.id_admin,
    demandeur: l.demandeur_prenom !== undefined ? l.demandeur_prenom + ' ' + l.demandeur_nom : undefined,
    trajet: l.lieu_depart !== undefined ? l.lieu_depart + ' → ' + l.lieu_arrivee : undefined,
    montant: l.montant_reservation
  }
}

const DETAILS = `
  SELECT l.*, u.prenom AS demandeur_prenom, CONCAT(LEFT(u.nom, 1), '.') AS demandeur_nom,
         t.lieu_depart, t.lieu_arrivee, r.montant AS montant_reservation
    FROM litige l
    JOIN utilisateur u ON u.id_utilisateur = l.id_demandeur
    JOIN reservation r ON r.id_reservation = l.id_reservation
    JOIN trajet t ON t.id_trajet = r.id_trajet`

export async function creer(l, idDemandeur) {
  const resultat = await requete('INSERT INTO litige (motif, description, id_reservation, id_demandeur) VALUES (?, ?, ?, ?)',
    [l.motif, l.description || null, l.idReservation, idDemandeur])
  return resultat.insertId
}

export async function trouverParId(id, cx) {
  const [ligne] = await requete(`${DETAILS} WHERE l.id_litige = ?`, [id], cx)
  return ligne || null
}

// Les litiges où la personne est le passager OU le conducteur
export async function listerParUtilisateur(idUtilisateur) {
  return requete(`${DETAILS} WHERE r.id_utilisateur = ? OR t.id_utilisateur = ? ORDER BY l.date_ouverture DESC`,
    [idUtilisateur, idUtilisateur])
}

export async function lister(statut) {
  return requete(`${DETAILS} WHERE (? IS NULL OR l.statut = ?)
    ORDER BY FIELD(l.statut, 'ouvert', 'en_cours', 'resolu'), l.date_ouverture DESC`, [statut || null, statut || null])
}

export async function prendreEnCharge(id, idAdmin, cx) {
  await requete("UPDATE litige SET statut = 'en_cours', id_admin = ? WHERE id_litige = ?", [idAdmin, id], cx)
}

export async function resoudre(id, d, idAdmin, cx) {
  await requete(
    `UPDATE litige SET statut = 'resolu', decision = ?, resolution = ?, montant_rembourse = ?, id_admin = ?
      WHERE id_litige = ?`, [d.decision, d.resolution, d.montantRembourse, idAdmin, id], cx)
}
