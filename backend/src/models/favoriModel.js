// ============================================================
// Modèle FAVORI (conducteurs favoris d'un membre)
// ============================================================
import { requete } from '../config/db.js'
import { versProfilPublic } from './utilisateurModel.js'

// Les conducteurs favoris, avec leur profil public
export async function lister(idUtilisateur) {
  const lignes = await requete(
    `SELECT p.*, f.date_ajout FROM favori f
       JOIN v_profil_public p ON p.id_utilisateur = f.id_conducteur
      WHERE f.id_utilisateur = ? ORDER BY f.date_ajout DESC`, [idUtilisateur])
  return lignes.map(versProfilPublic)
}

export async function ajouter(idUtilisateur, idConducteur) {
  await requete('INSERT INTO favori (id_utilisateur, id_conducteur) VALUES (?, ?)', [idUtilisateur, idConducteur])
}

export async function retirer(idUtilisateur, idConducteur) {
  const resultat = await requete('DELETE FROM favori WHERE id_utilisateur = ? AND id_conducteur = ?',
    [idUtilisateur, idConducteur])
  return resultat.affectedRows
}

// Compte supprimé : on retire ses favoris et sa présence chez les autres
export async function supprimerTous(idUtilisateur, cx) {
  await requete('DELETE FROM favori WHERE id_utilisateur = ? OR id_conducteur = ?', [idUtilisateur, idUtilisateur], cx)
}
