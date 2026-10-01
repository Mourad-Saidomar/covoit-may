// ============================================================
// Modèle CODE_VERIFICATION (codes à 6 chiffres envoyés par email)
// ------------------------------------------------------------
// La base ne garde que l'empreinte du code, jamais le code lui-même.
// ============================================================
import { requete } from '../config/db.js'

// Nouveau code : les codes précédents encore valables sont abandonnés
export async function creer(idUtilisateur, objet, empreinte, minutes) {
  await requete(
    `UPDATE code_verification SET utilise_le = NOW()
      WHERE id_utilisateur = ? AND objet = ? AND utilise_le IS NULL`, [idUtilisateur, objet])
  await requete(
    `INSERT INTO code_verification (objet, empreinte, expire_le, id_utilisateur)
     VALUES (?, ?, NOW() + INTERVAL ? MINUTE, ?)`, [objet, empreinte, minutes, idUtilisateur])
}

// Le code en cours : ni utilisé, ni expiré, ni épuisé
export async function enCours(idUtilisateur, objet, tentativesMax) {
  const [ligne] = await requete(
    `SELECT id_code, empreinte, tentatives FROM code_verification
      WHERE id_utilisateur = ? AND objet = ? AND utilise_le IS NULL
        AND expire_le > NOW() AND tentatives < ?
      ORDER BY id_code DESC LIMIT 1`, [idUtilisateur, objet, tentativesMax])
  return ligne || null
}

export async function ajouterTentative(idCode) {
  await requete('UPDATE code_verification SET tentatives = tentatives + 1 WHERE id_code = ?', [idCode])
}

export async function marquerUtilise(idCode) {
  await requete('UPDATE code_verification SET utilise_le = NOW() WHERE id_code = ?', [idCode])
}

// Pour limiter les envois : secondes depuis le dernier code, et nombre
// de codes envoyés dans l'heure
export async function derniersEnvois(idUtilisateur, objet) {
  const [ligne] = await requete(
    `SELECT TIMESTAMPDIFF(SECOND, MAX(date_creation), NOW()) AS secondes_depuis,
            SUM(date_creation > NOW() - INTERVAL 1 HOUR) AS dans_l_heure
       FROM code_verification WHERE id_utilisateur = ? AND objet = ?`, [idUtilisateur, objet])
  return {
    secondesDepuis: ligne.secondes_depuis === null ? null : Number(ligne.secondes_depuis),
    dansLHeure: Number(ligne.dans_l_heure || 0)
  }
}

// Effacement des codes de plus de 7 jours (tâche quotidienne, RGPD)
export async function purgerCodes() {
  await requete('DELETE FROM code_verification WHERE date_creation < NOW() - INTERVAL 7 DAY')
}
