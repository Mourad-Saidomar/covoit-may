// ============================================================
// Modèle MESSAGE
// ------------------------------------------------------------
// Un message est un texte, une photo ou un message vocal (RG09.6).
// Pour une photo ou un vocal, la colonne « fichier » contient la clé
// du fichier dans le stockage : le navigateur ne la voit jamais, il
// reçoit l'adresse /messages/:id/fichier, contrôlée par l'API.
// Accusés : date_reception (reçu), lu + date_lecture (lu) (RG09.9).
// « Supprimer pour moi » : une ligne dans message_masque ;
// « pour tous » : supprime_le, le contenu est effacé (RG09.8).
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
    recu: l.date_reception !== null,
    lu: l.lu === 1,
    dateLecture: l.date_lecture,
    modifie: l.date_modification !== null,
    supprime: l.supprime_le !== null
  }
}

// Une ligne par personne avec qui on a échangé : dernier message visible et nombre de non lus
export async function conversations(idMoi) {
  const lignes = await requete(
    `SELECT d.autre, u.prenom, CONCAT(LEFT(u.nom, 1), '.') AS nom_initiale, u.statut_compte, u.photo,
            m.type_message, m.contenu, m.supprime_le, m.date_envoi, m.id_expediteur, m.lu, m.date_reception,
            (SELECT COUNT(*) FROM message n
              WHERE n.id_destinataire = ? AND n.id_expediteur = d.autre AND n.lu = 0) AS non_lus
       FROM (SELECT IF(id_expediteur = ?, id_destinataire, id_expediteur) AS autre, MAX(id_message) AS dernier
               FROM message
              WHERE (id_expediteur = ? OR id_destinataire = ?)
                AND id_message NOT IN (SELECT id_message FROM message_masque WHERE id_utilisateur = ?)
              GROUP BY autre) d
       JOIN message m ON m.id_message = d.dernier
       JOIN utilisateur u ON u.id_utilisateur = d.autre
      ORDER BY m.date_envoi DESC`, [idMoi, idMoi, idMoi, idMoi, idMoi])
  return lignes.map((l) => ({
    autreId: l.autre,
    autre: {
      prenom: l.prenom,
      nom: l.nom_initiale,
      actif: l.statut_compte !== 'supprime',
      photo: ['actif', 'en_attente'].includes(l.statut_compte) ? urlPhoto(l.autre, l.photo) : null
    },
    dernierMessage: {
      type: l.type_message,
      contenu: l.contenu,
      supprime: l.supprime_le !== null,
      date: l.date_envoi,
      deMoi: l.id_expediteur === idMoi,
      lu: l.lu === 1,
      recu: l.date_reception !== null
    },
    nonLus: l.non_lus
  }))
}

// Les messages entre deux personnes, sans ceux que « moi » a masqués
export async function entre(idMoi, idAutre) {
  return requete(
    `SELECT * FROM message
      WHERE ((id_expediteur = ? AND id_destinataire = ?) OR (id_expediteur = ? AND id_destinataire = ?))
        AND id_message NOT IN (SELECT id_message FROM message_masque WHERE id_utilisateur = ?)
      ORDER BY date_envoi, id_message`, [idMoi, idAutre, idAutre, idMoi, idMoi])
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

// age_minutes : calculé par la base, avec la même horloge que ses triggers
export async function trouverParId(id) {
  const [ligne] = await requete(
    'SELECT *, TIMESTAMPDIFF(MINUTE, date_envoi, NOW()) AS age_minutes FROM message WHERE id_message = ?', [id])
  return ligne || null
}

// Seul le destinataire marque ses messages comme lus (RG09.3).
// Renvoie le nombre de messages passés en « lu ».
export async function marquerLus(idDestinataire, idExpediteur) {
  const resultat = await requete(
    'UPDATE message SET lu = 1 WHERE id_destinataire = ? AND id_expediteur = ? AND lu = 0',
    [idDestinataire, idExpediteur])
  return resultat.affectedRows
}

// Le destinataire est connecté : ses messages en attente sont « reçus ».
// Renvoie les expéditeurs à prévenir.
export async function marquerRecus(idDestinataire) {
  const expediteurs = await requete(
    'SELECT DISTINCT id_expediteur FROM message WHERE id_destinataire = ? AND date_reception IS NULL', [idDestinataire])
  if (expediteurs.length) {
    await requete('UPDATE message SET date_reception = NOW() WHERE id_destinataire = ? AND date_reception IS NULL', [idDestinataire])
  }
  return expediteurs.map((l) => l.id_expediteur)
}

// Modification d'un texte : la base vérifie les 15 minutes (RG09.3)
export async function modifierContenu(id, contenu) {
  await requete('UPDATE message SET contenu = ? WHERE id_message = ?', [contenu, id])
}

// Suppression pour tous : la base vérifie les 24 heures et efface le contenu (RG09.8)
export async function supprimerPourTous(id) {
  await requete('UPDATE message SET supprime_le = NOW() WHERE id_message = ?', [id])
}

export async function masquerPourMoi(id, idUtilisateur) {
  await requete('INSERT IGNORE INTO message_masque (id_message, id_utilisateur) VALUES (?, ?)', [id, idUtilisateur])
}

export async function nbNonLus(idMoi) {
  const [ligne] = await requete('SELECT COUNT(*) AS nb FROM message WHERE id_destinataire = ? AND lu = 0', [idMoi])
  return ligne.nb
}
