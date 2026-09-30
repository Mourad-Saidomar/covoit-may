// ============================================================
// Modèle AVIS
// ------------------------------------------------------------
// La note moyenne du conducteur est recalculée par un trigger
// après chaque ajout, signalement ou suppression (RG07.11).
// ============================================================
import { requete } from '../config/db.js'

export function versAvis(l) {
  return {
    id: l.id_avis,
    trajetId: l.id_trajet,
    auteurId: l.id_utilisateur,
    cibleId: l.id_cible,
    note: l.note,
    commentaire: l.commentaire,
    date: l.date_avis,
    signale: l.signale === 1,
    motifSignalement: l.motif_signalement,
    auteur: l.auteur_prenom !== undefined ? l.auteur_prenom + ' ' + l.auteur_nom : undefined,
    cible: l.cible_prenom !== undefined ? l.cible_prenom + ' ' + l.cible_nom : undefined,
    trajet: l.lieu_depart !== undefined ? l.lieu_depart + ' → ' + l.lieu_arrivee : undefined
  }
}

const JOINTURES = `
  JOIN utilisateur a ON a.id_utilisateur = av.id_utilisateur
  JOIN utilisateur c ON c.id_utilisateur = av.id_cible
  JOIN trajet t ON t.id_trajet = av.id_trajet`

const NOMS = `a.prenom AS auteur_prenom, CONCAT(LEFT(a.nom, 1), '.') AS auteur_nom,
  c.prenom AS cible_prenom, CONCAT(LEFT(c.nom, 1), '.') AS cible_nom, t.lieu_depart, t.lieu_arrivee`

export async function creer(a, idAuteur, idCible) {
  const resultat = await requete(
    'INSERT INTO avis (note, commentaire, id_utilisateur, id_cible, id_trajet) VALUES (?, ?, ?, ?, ?)',
    [a.note, a.commentaire, idAuteur, idCible, a.idTrajet])
  return resultat.insertId
}

export async function trouverParId(id) {
  const [ligne] = await requete(`SELECT av.*, ${NOMS} FROM avis av ${JOINTURES} WHERE av.id_avis = ?`, [id])
  return ligne || null
}

// Les avis visibles d'une personne : les avis signalés sont masqués
export async function listerRecus(idCible) {
  return requete(
    `SELECT av.*, ${NOMS} FROM avis av ${JOINTURES}
      WHERE av.id_cible = ? AND av.signale = 0 ORDER BY av.date_avis DESC`, [idCible])
}

// Administrateur : tous les avis, ou seulement les signalés
export async function lister(signales) {
  return requete(
    `SELECT av.*, ${NOMS} FROM avis av ${JOINTURES}
      WHERE (? IS NULL OR av.signale = ?) ORDER BY av.signale DESC, av.date_avis DESC LIMIT 500`,
    [signales === undefined ? null : Number(signales), signales === undefined ? null : Number(signales)])
}

export async function signaler(id, idSignaleur, motif) {
  await requete('UPDATE avis SET signale = 1, id_signaleur = ?, motif_signalement = ? WHERE id_avis = ?',
    [idSignaleur, motif, id])
}

export async function restaurer(id) {
  await requete('UPDATE avis SET signale = 0 WHERE id_avis = ?', [id])
}

export async function supprimer(id) {
  await requete('DELETE FROM avis WHERE id_avis = ?', [id])
}
