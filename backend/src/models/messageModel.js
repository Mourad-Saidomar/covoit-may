// ============================================================
// Modèle MESSAGE
// ------------------------------------------------------------
// Un message est un texte, une photo ou un message vocal (RG09.6).
// Pour une photo ou un vocal, la colonne « fichier » contient la clé
// du fichier dans le stockage : le navigateur ne la voit jamais, il
// reçoit l'adresse /messages/:id/fichier, contrôlée par l'API.
// ============================================================
import { requete } from '../config/db.js'
import { urlPhoto } from './utilisateurModel.js'

export function versMessage(l) {
  return {
    id: l.id_message,
    type: l.type_message,
    expediteurId: l.id_expediteur,
    destinataireId: l.id_destinataire,
    contenu: l.contenu,
    fichier: l.fichier ? `/messages/${l.id_message}/fichier` : null,
    dureeSecondes: l.duree_secondes,
    date: l.date_envoi,
    lu: l.lu === 1
  }
}

// Une ligne par personne avec qui on a échangé : dernier message et nombre de non lus
export async function conversations(idMoi) {
  const lignes = await requete(
    `SELECT d.autre, u.prenom, CONCAT(LEFT(u.nom, 1), '.') AS nom_initiale, u.statut_compte, u.photo,
            m.type_message, m.contenu, m.date_envoi, m.id_expediteur,
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
    autre: {
      prenom: l.prenom,
      nom: l.nom_initiale,
      actif: l.statut_compte !== 'supprime',
      photo: ['actif', 'en_attente'].includes(l.statut_compte) ? urlPhoto(l.autre, l.photo) : null
    },
    dernierMessage: { type: l.type_message, contenu: l.contenu, date: l.date_envoi, deMoi: l.id_expediteur === idMoi },
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

// Photo ou vocal : la base vérifie le type, le fichier et la durée (RG09.6, RG09.7)
export async function creerAvecFichier(idExpediteur, idDestinataire, m) {
  const resultat = await requete(
    `INSERT INTO message (type_message, fichier, fichier_type, duree_secondes, id_expediteur, id_destinataire)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [m.type, m.fichier, m.fichierType, m.dureeSecondes || null, idExpediteur, idDestinataire])
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
