// ============================================================
// Modèle ALERTE (trajets recherchés par un passager)
// ============================================================
import { requete } from '../config/db.js'

export function versAlerte(l) {
  return {
    id: l.id_alerte,
    userId: l.id_utilisateur,
    depart: l.lieu_depart,
    arrivee: l.lieu_arrivee,
    heureMin: l.heure_min.slice(0, 5),
    heureMax: l.heure_max.slice(0, 5),
    prixMax: l.prix_max,
    active: l.active === 1,
    nbTrajetsCorrespondants: l.nb_trajets
  }
}

// Les alertes d'une personne, avec le nombre de trajets qui correspondent
export async function listerParUtilisateur(idUtilisateur) {
  return requete(
    `SELECT a.*,
            (SELECT COUNT(*) FROM v_trajets_disponibles t
              WHERE t.lieu_depart = a.lieu_depart AND t.lieu_arrivee = a.lieu_arrivee
                AND t.heure_depart BETWEEN a.heure_min AND a.heure_max
                AND (a.prix_max IS NULL OR t.prix <= a.prix_max)) AS nb_trajets
       FROM alerte a WHERE a.id_utilisateur = ? ORDER BY a.date_creation DESC`, [idUtilisateur])
}

export async function trouverParId(id) {
  const [ligne] = await requete('SELECT * FROM alerte WHERE id_alerte = ?', [id])
  return ligne || null
}

export async function creer(a, idUtilisateur) {
  const resultat = await requete(
    'INSERT INTO alerte (lieu_depart, lieu_arrivee, heure_min, heure_max, prix_max, id_utilisateur) VALUES (?, ?, ?, ?, ?, ?)',
    [a.depart, a.arrivee, a.heureMin, a.heureMax, a.prixMax || null, idUtilisateur])
  return resultat.insertId
}

export async function changerEtat(id, active) {
  await requete('UPDATE alerte SET active = ? WHERE id_alerte = ?', [active ? 1 : 0, id])
}

export async function supprimer(id) {
  await requete('DELETE FROM alerte WHERE id_alerte = ?', [id])
}

export async function supprimerToutes(idUtilisateur, cx) {
  await requete('DELETE FROM alerte WHERE id_utilisateur = ?', [idUtilisateur], cx)
}
