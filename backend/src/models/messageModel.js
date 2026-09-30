// ============================================================
// Modèle MESSAGE
// ============================================================
import { requete } from '../config/db.js'

export function versMessage(l) {
  return {
    id: l.id_message,
    expediteurId: l.id_expediteur,
    destinataireId: l.id_destinataire,
    contenu: l.contenu,
    date: l.date_envoi,
    lu: l.lu === 1
  }
}

// Une ligne par personne avec qui on a échangé : dernier message et nombre de non lus
export async function conversations(idMoi) {
  const lignes = await requete(
    `SELECT d.autre, u.prenom, CONCAT(LEFT(u.nom, 1), '.') AS nom_initiale, u.statut_compte,
            m.contenu, m.date_envoi, m.id_expediteur,
            (SELECT COUNT(*) FROM message n
              WHERE n.id_destinataire = ? AND n.id_expediteur = d.autre AND n.lu = 0) AS non_lus
       FROM (SELECT IF(id_expediteur = ?, id_destinataire, id_expediteur) AS autre, MAX(id_message) AS dernier
               FROM message WHERE id_expediteur = ? OR id_destinataire = ?
              GROUP BY autre) d
       JOIN message m ON m.id_message = d.dernier
       JOIN utilisateur u ON u.id_utilisateur = d.autre
      ORDER BY m.date_envoi DESC`, [idMoi, idMoi, idMoi, idMoi])
  return lignes.map((l) => ({
    autreId: l.autre,
    autre: { prenom: l.prenom, nom: l.nom_initiale, actif: l.statut_compte !== 'supprime' },
    dernierMessage: { contenu: l.contenu, date: l.date_envoi, deMoi: l.id_expediteur === idMoi },
    nonLus: l.non_lus
  }))
}

export async function entre(idA, idB) {
  return requete(
    `SELECT * FROM message
      WHERE (id_expediteur = ? AND id_destinataire = ?) OR (id_expediteur = ? AND id_destinataire = ?)
      ORDER BY date_envoi, id_message`, [idA, idB, idB, idA])
}

export async function creer(idExpediteur, idDestinataire, contenu) {
  const resultat = await requete('INSERT INTO message (contenu, id_expediteur, id_destinataire) VALUES (?, ?, ?)',
    [contenu, idExpediteur, idDestinataire])
  return resultat.insertId
}

export async function trouverParId(id) {
  const [ligne] = await requete('SELECT * FROM message WHERE id_message = ?', [id])
  return ligne || null
}

// Seul le destinataire marque ses messages comme lus (RG09.3)
export async function marquerLus(idDestinataire, idExpediteur) {
  await requete('UPDATE message SET lu = 1 WHERE id_destinataire = ? AND id_expediteur = ? AND lu = 0',
    [idDestinataire, idExpediteur])
}

export async function nbNonLus(idMoi) {
  const [ligne] = await requete('SELECT COUNT(*) AS nb FROM message WHERE id_destinataire = ? AND lu = 0', [idMoi])
  return ligne.nb
}
