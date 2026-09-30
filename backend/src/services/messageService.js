// ============================================================
// Service MESSAGE (messagerie passager <-> conducteur)
// ------------------------------------------------------------
// Une personne ne lit que SES conversations (RG09.4) : toutes les
// requêtes partent de l'identifiant de la personne connectée.
// Photos et vocaux (RG09.6, RG09.7) : le fichier va dans le stockage
// (Backblaze en production), la base garde sa clé.
// ============================================================
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as messageModel from '../models/messageModel.js'
import * as reservationModel from '../models/reservationModel.js'
import * as stockage from './stockageService.js'

export async function conversations(idMoi) {
  return {
    nonLus: await messageModel.nbNonLus(idMoi),
    conversations: await messageModel.conversations(idMoi)
  }
}

// Ouvre une conversation : les messages reçus passent en « lu »
export async function conversationAvec(idMoi, idAutre) {
  if (!(await reservationModel.sontLies(idMoi, idAutre))) {
    throw new ErreurApi(403, 'Vous ne pouvez échanger qu’avec les personnes de vos trajets.')
  }
  await messageModel.marquerLus(idMoi, idAutre)
  const lignes = await messageModel.entre(idMoi, idAutre)
  return lignes.map(messageModel.versMessage)
}

// La base vérifie le lien passager/conducteur (RG09.1) et le statut du compte (RG09.5)
export async function envoyer(idMoi, donnees) {
  const id = await messageModel.creer(idMoi, donnees.idDestinataire, donnees.contenu)
  return messageModel.versMessage(await messageModel.trouverParId(id))
}

// Photo ou message vocal. Le lien est vérifié AVANT d'enregistrer le
// fichier : on ne stocke rien pour un envoi qui serait refusé.
export async function envoyerFichier(idMoi, idDestinataire, fichier, dureeSecondes) {
  if (idDestinataire === idMoi || !(await reservationModel.sontLies(idMoi, idDestinataire))) {
    throw new ErreurApi(403, 'Vous ne pouvez échanger qu’avec les personnes de vos trajets.')
  }
  if (fichier.categorie === 'vocal' && !(dureeSecondes >= 1 && dureeSecondes <= 120)) {
    throw new ErreurApi(400, 'Un message vocal dure de 1 seconde à 2 minutes (RG09.7).')
  }
  // Un dossier par conversation, quel que soit l'expéditeur : « messages/3-7/… »
  const dossier = `messages/${Math.min(idMoi, idDestinataire)}-${Math.max(idMoi, idDestinataire)}`
  const cle = stockage.nouvelleCle(dossier, fichier.extension)
  await stockage.enregistrer(cle, fichier.contenu, fichier.type)
  try {
    const id = await messageModel.creerAvecFichier(idMoi, idDestinataire, {
      type: fichier.categorie,
      fichier: cle,
      fichierType: fichier.type,
      dureeSecondes: fichier.categorie === 'vocal' ? dureeSecondes : null
    })
    return messageModel.versMessage(await messageModel.trouverParId(id))
  } catch (erreur) {
    // Refus de la base (compte suspendu…) : le fichier ne sert à rien
    await stockage.supprimerSansErreur(cle)
    throw erreur
  }
}

// Le fichier d'un message, pour ses deux participants seulement (RG09.4).
// Pour les autres, le message « n'existe pas » (404) : on ne révèle rien.
export async function lireFichier(idMoi, idMessage) {
  const message = await messageModel.trouverParId(idMessage)
  const participant = message && (message.id_expediteur === idMoi || message.id_destinataire === idMoi)
  if (!participant || !message.fichier) throw new ErreurApi(404, 'Fichier introuvable.')
  const fichier = await stockage.lire(message.fichier)
  if (!fichier) throw new ErreurApi(404, 'Fichier introuvable.')
  return { contenu: fichier.contenu, type: message.fichier_type }
}
