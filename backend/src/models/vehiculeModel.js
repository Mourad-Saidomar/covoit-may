// ============================================================
// Modèle VÉHICULE
// ============================================================
import { requete } from '../config/db.js'

export function versVehicule(l) {
  return {
    id: l.id_vehicule,
    marque: l.marque,
    modele: l.modele,
    couleur: l.couleur,
    immatriculation: l.immatriculation,
    nbPlaces: l.nb_places,
    actif: l.actif === 1,
    libelle: [l.marque, l.modele, l.couleur].filter(Boolean).join(' ')
  }
}

export async function listerParProprietaire(idUtilisateur) {
  return requete('SELECT * FROM vehicule WHERE id_utilisateur = ? ORDER BY actif DESC, date_ajout DESC', [idUtilisateur])
}

export async function trouverParId(id) {
  const [ligne] = await requete('SELECT * FROM vehicule WHERE id_vehicule = ?', [id])
  return ligne || null
}

export async function trouverParImmatriculation(immatriculation, cx) {
  const [ligne] = await requete('SELECT * FROM vehicule WHERE immatriculation = ?', [immatriculation], cx)
  return ligne || null
}

// Le véhicule actif le plus récent (utilisé si le conducteur n'en choisit pas)
export async function premierActif(idUtilisateur) {
  const [ligne] = await requete(
    'SELECT * FROM vehicule WHERE id_utilisateur = ? AND actif = 1 ORDER BY date_ajout DESC LIMIT 1', [idUtilisateur])
  return ligne || null
}

export async function creer(v, idUtilisateur, cx) {
  const resultat = await requete(
    `INSERT INTO vehicule (marque, modele, couleur, immatriculation, nb_places, id_utilisateur)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [v.marque, v.modele, v.couleur || null, v.immatriculation, v.nbPlaces, idUtilisateur], cx)
  return resultat.insertId
}

export async function reactiver(id, cx) {
  await requete('UPDATE vehicule SET actif = 1 WHERE id_vehicule = ?', [id], cx)
}

export async function desactiver(id) {
  await requete('UPDATE vehicule SET actif = 0 WHERE id_vehicule = ?', [id])
}

export async function estUtiliseParUnTrajetOuvert(id) {
  const [ligne] = await requete(
    "SELECT COUNT(*) AS nb FROM trajet WHERE id_vehicule = ? AND statut IN ('ouvert','complet')", [id])
  return ligne.nb > 0
}
