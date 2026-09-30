// ============================================================
// Modèle TRAJET
// ============================================================
import { requete } from '../config/db.js'

// Colonne SET : le pilote MariaDB la renvoie en tableau ['lun', 'mar'],
// parfois en texte "lun,mar" selon la requête
function joursEnTableau(valeur) {
  if (Array.isArray(valeur)) return valeur.filter(Boolean)
  return valeur ? valeur.split(',') : []
}

// Ligne de la base -> objet trajet (mêmes noms que le frontend)
export function versTrajet(l) {
  const trajet = {
    id: l.id_trajet,
    conducteurId: l.id_utilisateur !== undefined ? l.id_utilisateur : l.id_conducteur,
    depart: l.lieu_depart,
    arrivee: l.lieu_arrivee,
    pointRdv: l.point_rdv,
    // "2026-09-30T07:00:00" : lu comme une heure locale par le navigateur
    dateDepart: l.date_trajet + 'T' + l.heure_depart,
    placesTotal: l.places_total,
    placesDispo: l.places_disponibles,
    prix: l.prix,
    detourAccepte: l.detour_accepte === 1,
    recurrent: l.recurrent === 1,
    joursRecurrents: joursEnTableau(l.jours_recurrents),
    description: l.description,
    statut: l.statut
  }
  if (l.vehicule !== undefined) trajet.vehicule = l.vehicule
  if (l.conducteur_prenom !== undefined) {
    trajet.conducteur = {
      id: trajet.conducteurId,
      prenom: l.conducteur_prenom,
      nom: l.conducteur_nom,
      note: l.conducteur_note,
      nbAvis: l.conducteur_nb_avis,
      verifie: l.conducteur_verifie === 1
    }
  }
  if (l.nb_demandes !== undefined) trajet.nbDemandesEnAttente = l.nb_demandes
  return trajet
}

// Recherche parmi les trajets ouverts et à venir (vue v_trajets_disponibles)
export async function rechercher(f) {
  const conditions = []
  const valeurs = []
  if (f.depart) { conditions.push('lieu_depart = ?'); valeurs.push(f.depart) }
  if (f.arrivee) { conditions.push('lieu_arrivee = ?'); valeurs.push(f.arrivee) }
  if (f.date) { conditions.push('date_trajet = ?'); valeurs.push(f.date) }
  if (f.heureMin) { conditions.push('heure_depart >= ?'); valeurs.push(f.heureMin) }
  if (f.heureMax) { conditions.push('heure_depart <= ?'); valeurs.push(f.heureMax) }
  if (f.prixMax) { conditions.push('prix <= ?'); valeurs.push(f.prixMax) }
  if (f.places) { conditions.push('places_disponibles >= ?'); valeurs.push(f.places) }
  if (f.detour) conditions.push('detour_accepte = 1')
  if (f.verifies) conditions.push('conducteur_verifie = 1')
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  // Le tri vient d'une liste fermée, jamais du texte envoyé
  const tris = {
    depart: 'date_depart',
    prix: 'prix, date_depart',
    note: 'conducteur_note DESC, date_depart'
  }
  const ordre = tris[f.tri] || tris.depart
  const limite = f.limite || 50
  return requete(`SELECT * FROM v_trajets_disponibles ${where} ORDER BY ${ordre} LIMIT ${Number(limite)}`, valeurs)
}

// Détail d'un trajet, avec les infos publiques du conducteur
export async function trouverDetail(id) {
  const [ligne] = await requete(
    `SELECT t.*, u.prenom AS conducteur_prenom, CONCAT(LEFT(u.nom, 1), '.') AS conducteur_nom,
            u.note_moyenne AS conducteur_note, u.nb_avis AS conducteur_nb_avis,
            u.statut_verification AS conducteur_verifie,
            CONCAT_WS(' ', v.marque, v.modele, v.couleur) AS vehicule
       FROM trajet t
       JOIN utilisateur u ON u.id_utilisateur = t.id_utilisateur
       JOIN vehicule v ON v.id_vehicule = t.id_vehicule
      WHERE t.id_trajet = ?`, [id])
  return ligne || null
}

export async function trouverParId(id, cx) {
  const [ligne] = await requete('SELECT * FROM trajet WHERE id_trajet = ?', [id], cx)
  return ligne || null
}

// Les trajets d'un conducteur, avec le nombre de demandes à traiter
export async function listerParConducteur(idConducteur) {
  return requete(
    `SELECT t.*, CONCAT_WS(' ', v.marque, v.modele, v.couleur) AS vehicule,
            (SELECT COUNT(*) FROM reservation r WHERE r.id_trajet = t.id_trajet AND r.statut = 'en_attente') AS nb_demandes
       FROM trajet t JOIN vehicule v ON v.id_vehicule = t.id_vehicule
      WHERE t.id_utilisateur = ?
      ORDER BY t.date_trajet DESC, t.heure_depart DESC`, [idConducteur])
}

// Les trajets à venir d'un conducteur (profil public)
export async function listerAVenirDuConducteur(idConducteur) {
  return requete(
    'SELECT * FROM v_trajets_disponibles WHERE id_conducteur = ? ORDER BY date_depart LIMIT 20', [idConducteur])
}

export async function listerOuvertsDuConducteur(idConducteur, cx) {
  return requete(
    "SELECT id_trajet FROM trajet WHERE id_utilisateur = ? AND statut IN ('ouvert','complet')", [idConducteur], cx)
}

export async function creer(t, idConducteur, idVehicule) {
  const resultat = await requete(
    `INSERT INTO trajet (lieu_depart, lieu_arrivee, point_rdv, date_trajet, heure_depart, places_total, prix,
                         detour_accepte, recurrent, jours_recurrents, description, id_utilisateur, id_vehicule)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [t.depart, t.arrivee, t.pointRdv, t.date, t.heure, t.placesTotal, t.prix,
      t.detourAccepte ? 1 : 0, t.recurrent ? 1 : 0, t.recurrent ? t.joursRecurrents.join(',') : null,
      t.description || null, idConducteur, idVehicule])
  return resultat.insertId
}

// Correspondance champ envoyé -> colonne (liste fermée)
const COLONNES_MODIFIABLES = {
  depart: 'lieu_depart', arrivee: 'lieu_arrivee', pointRdv: 'point_rdv', date: 'date_trajet',
  heure: 'heure_depart', placesTotal: 'places_total', prix: 'prix', detourAccepte: 'detour_accepte',
  recurrent: 'recurrent', joursRecurrents: 'jours_recurrents', description: 'description', idVehicule: 'id_vehicule'
}

export async function modifier(id, champs) {
  const noms = Object.keys(champs).filter((c) => COLONNES_MODIFIABLES[c])
  if (!noms.length) return
  const valeurs = noms.map(function (c) {
    if (c === 'joursRecurrents') return champs[c].length ? champs[c].join(',') : null
    if (c === 'detourAccepte' || c === 'recurrent') return champs[c] ? 1 : 0
    return champs[c]
  })
  const morceaux = noms.map((c) => `${COLONNES_MODIFIABLES[c]} = ?`).join(', ')
  await requete(`UPDATE trajet SET ${morceaux} WHERE id_trajet = ?`, [...valeurs, id])
}

export async function annuler(id, cx) {
  await requete("UPDATE trajet SET statut = 'annule' WHERE id_trajet = ?", [id], cx)
}

// Clôture des trajets passés (procédure stockée, RG04.16 et RG05.11)
export async function cloturerTrajetsPasses() {
  await requete('CALL cloturer_trajets_passes()')
}
