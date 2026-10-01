// ============================================================
// Modèle UTILISATEUR : les requêtes SQL sur la table utilisateur
// ------------------------------------------------------------
// Un modèle ne contient QUE du SQL (requêtes préparées avec "?").
// Les règles de gestion sont dans le service et dans la base.
// Le paramètre "cx" (facultatif) sert aux transactions.
// ============================================================
import path from 'node:path'
import { requete } from '../config/db.js'

// Colonnes lisibles : le mot de passe n'en fait jamais partie
const COLONNES = `id_utilisateur, nom, prenom, email, email_verifie, telephone, adresse, commune, date_naissance, bio, photo,
  role, statut_verification, statut_compte, note_moyenne, nb_avis, date_inscription, id_admin`

// Adresse (relative à /api) de la photo de profil, ou null s'il n'y en a pas.
// Le « v » change avec chaque nouvelle photo : le navigateur peut garder
// l'image en cache sans risquer d'afficher l'ancienne.
export function urlPhoto(id, cle) {
  if (!cle) return null
  return `/utilisateurs/${id}/photo?v=${path.basename(cle).slice(0, 12)}`
}

// Ligne de la base -> objet envoyé au navigateur (mêmes noms que le frontend)
export function versUtilisateur(l) {
  return {
    id: l.id_utilisateur,
    nom: l.nom,
    prenom: l.prenom,
    email: l.email,
    emailVerifie: l.email_verifie === 1,
    telephone: l.telephone,
    adresse: l.adresse,
    commune: l.commune,
    dateNaissance: l.date_naissance,
    bio: l.bio,
    photo: urlPhoto(l.id_utilisateur, l.photo),
    role: l.role,
    verifie: l.statut_verification === 1,
    statut: l.statut_compte,
    note: l.note_moyenne,
    nbAvis: l.nb_avis,
    membreDepuis: l.date_inscription.slice(0, 10)
  }
}

// Profil public (vue v_profil_public) : ni email, ni téléphone, ni nom complet (RG02.15)
export function versProfilPublic(l) {
  return {
    id: l.id_utilisateur,
    prenom: l.prenom,
    nom: l.nom_initiale,
    commune: l.commune,
    bio: l.bio,
    photo: urlPhoto(l.id_utilisateur, l.photo),
    role: l.role,
    verifie: l.statut_verification === 1,
    note: l.note_moyenne,
    nbAvis: l.nb_avis,
    nbTrajets: l.nb_trajets,
    vehicule: l.vehicule,
    membreDepuis: l.date_inscription.slice(0, 10)
  }
}

export async function trouverParId(id, cx) {
  const [ligne] = await requete(`SELECT ${COLONNES} FROM utilisateur WHERE id_utilisateur = ?`, [id], cx)
  return ligne || null
}

// Pour la connexion : on a besoin de l'empreinte du mot de passe
export async function trouverPourConnexion(email) {
  const [ligne] = await requete(
    `SELECT id_utilisateur, prenom, email, mot_de_passe, role, statut_compte, email_verifie,
            (bloque_jusqu_a IS NOT NULL AND bloque_jusqu_a > NOW()) AS est_bloque
       FROM utilisateur WHERE email = ?`, [email])
  return ligne || null
}

// Pour les codes envoyés par email (inscription, mot de passe oublié)
export async function trouverParEmail(email) {
  const [ligne] = await requete(
    'SELECT id_utilisateur, prenom, email, email_verifie, statut_compte, role FROM utilisateur WHERE email = ?',
    [String(email).trim().toLowerCase()])
  return ligne || null
}

// Le code reçu par email a été validé : l'adresse est vérifiée (RG02.20)
export async function validerEmail(id) {
  await requete(
    'UPDATE utilisateur SET email_verifie = 1, email_verifie_le = NOW() WHERE id_utilisateur = ? AND email_verifie = 0', [id])
}

export async function lireEmpreinte(id) {
  const [ligne] = await requete('SELECT mot_de_passe FROM utilisateur WHERE id_utilisateur = ?', [id])
  return ligne ? ligne.mot_de_passe : null
}

export async function profilPublic(id) {
  const [ligne] = await requete('SELECT * FROM v_profil_public WHERE id_utilisateur = ?', [id])
  return ligne || null
}

export async function creer(u) {
  const resultat = await requete(
    `INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, commune, date_naissance, role, cgu_acceptees_le)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [u.nom, u.prenom, u.email, u.empreinte, u.telephone, u.commune, u.dateNaissance || null, u.role])
  return resultat.insertId
}

// Seules ces colonnes peuvent être modifiées par la personne (RG02.17)
const CHAMPS_PROFIL = {
  nom: 'nom', prenom: 'prenom', telephone: 'telephone', commune: 'commune',
  adresse: 'adresse', bio: 'bio', dateNaissance: 'date_naissance'
}

export async function modifierProfil(id, champs) {
  const noms = Object.keys(champs).filter((c) => CHAMPS_PROFIL[c])
  if (!noms.length) return
  // Les noms de colonnes viennent de la liste ci-dessus, jamais du client
  const morceaux = noms.map((c) => `${CHAMPS_PROFIL[c]} = ?`).join(', ')
  await requete(`UPDATE utilisateur SET ${morceaux} WHERE id_utilisateur = ?`, [...noms.map((c) => champs[c]), id])
}

export async function modifierMotDePasse(id, empreinte) {
  await requete('UPDATE utilisateur SET mot_de_passe = ? WHERE id_utilisateur = ?', [empreinte, id])
}

// Échec de connexion : +1 tentative, blocage au-delà du maximum (RG02.13).
// Attention, MariaDB applique les SET dans l'ordre : le blocage est calculé
// avant d'augmenter le compteur.
export async function enregistrerEchec(id, maximum, minutes) {
  await requete(
    `UPDATE utilisateur
        SET bloque_jusqu_a = IF(tentatives_echouees + 1 >= ?, NOW() + INTERVAL ? MINUTE, bloque_jusqu_a),
            tentatives_echouees = IF(tentatives_echouees + 1 >= ?, 0, tentatives_echouees + 1)
      WHERE id_utilisateur = ?`, [maximum, minutes, maximum, id])
}

export async function enregistrerConnexion(id) {
  await requete(
    'UPDATE utilisateur SET tentatives_echouees = 0, bloque_jusqu_a = NULL, derniere_connexion = NOW() WHERE id_utilisateur = ?',
    [id])
}

// Suppression RGPD : les données personnelles sont effacées, l'historique
// (réservations, paiements) est gardé sous un nom anonyme (RG02.14)
export async function anonymiser(id, cx) {
  await requete(
    `UPDATE utilisateur
        SET nom = 'Anonyme', prenom = 'Compte supprimé', email = CONCAT('supprime-', id_utilisateur, '@anonyme.invalid'),
            mot_de_passe = NULL, telephone = NULL, adresse = NULL, commune = NULL, date_naissance = NULL, bio = NULL, photo = NULL,
            statut_compte = 'supprime', date_suppression = NOW()
      WHERE id_utilisateur = ?`, [id], cx)
}

// ---------- Photo de profil (RG02.19) ----------

// La clé de la photo et le statut du compte (la photo d'un compte
// suspendu, refusé ou supprimé n'est plus montrée)
export async function lirePhoto(id) {
  const [ligne] = await requete('SELECT photo, statut_compte FROM utilisateur WHERE id_utilisateur = ?', [id])
  return ligne || null
}

export async function modifierPhoto(id, cle) {
  await requete('UPDATE utilisateur SET photo = ? WHERE id_utilisateur = ?', [cle, id])
}

export async function changerStatut(id, statut, cx) {
  await requete('UPDATE utilisateur SET statut_compte = ? WHERE id_utilisateur = ?', [statut, id], cx)
}

// Demande acceptée : la personne devient conductrice vérifiée (RG08.7)
export async function devenirConducteur(id, idAdmin, cx) {
  await requete(
    `UPDATE utilisateur SET role = 'conducteur', statut_verification = 1, id_admin = ?, statut_compte = 'actif'
      WHERE id_utilisateur = ?`, [idAdmin, id], cx)
}

// Liste pour l'administrateur (recherche par nom ou email, filtres)
export async function lister({ recherche, role, statut }) {
  const conditions = []
  const valeurs = []
  if (recherche) {
    conditions.push('(nom LIKE ? OR prenom LIKE ? OR email LIKE ?)')
    const motif = '%' + recherche.replace(/[%_\\]/g, '\\$&') + '%'
    valeurs.push(motif, motif, motif)
  }
  if (role) { conditions.push('role = ?'); valeurs.push(role) }
  if (statut) { conditions.push('statut_compte = ?'); valeurs.push(statut) }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  return requete(`SELECT ${COLONNES} FROM utilisateur ${where} ORDER BY date_inscription DESC LIMIT 500`, valeurs)
}
