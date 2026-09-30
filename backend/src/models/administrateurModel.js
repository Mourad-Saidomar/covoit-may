// ============================================================
// Modèle ADMINISTRATEUR
// ------------------------------------------------------------
// Aucune fonction de création : un administrateur ne se crée
// jamais depuis l'application (RG01.3). Le compte MariaDB de
// l'application n'a d'ailleurs pas le droit INSERT sur cette table.
// ============================================================
import { requete } from '../config/db.js'

export function versAdministrateur(l) {
  return {
    id: l.id_admin,
    nom: l.nom,
    prenom: l.prenom,
    email: l.email,
    fonction: l.fonction,
    role: 'admin'
  }
}

export async function trouverParId(id) {
  const [ligne] = await requete(
    'SELECT id_admin, nom, prenom, email, fonction, actif FROM administrateur WHERE id_admin = ?', [id])
  return ligne || null
}

export async function trouverPourConnexion(email) {
  const [ligne] = await requete(
    `SELECT id_admin, nom, prenom, email, fonction, mot_de_passe, actif,
            (bloque_jusqu_a IS NOT NULL AND bloque_jusqu_a > NOW()) AS est_bloque
       FROM administrateur WHERE email = ?`, [email])
  return ligne || null
}

export async function enregistrerEchec(id, maximum, minutes) {
  await requete(
    `UPDATE administrateur
        SET bloque_jusqu_a = IF(tentatives_echouees + 1 >= ?, NOW() + INTERVAL ? MINUTE, bloque_jusqu_a),
            tentatives_echouees = IF(tentatives_echouees + 1 >= ?, 0, tentatives_echouees + 1)
      WHERE id_admin = ?`, [maximum, minutes, maximum, id])
}

export async function enregistrerConnexion(id) {
  await requete(
    'UPDATE administrateur SET tentatives_echouees = 0, bloque_jusqu_a = NULL, derniere_connexion = NOW() WHERE id_admin = ?',
    [id])
}
