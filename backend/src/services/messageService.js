// ============================================================
// Service MESSAGE (messagerie passager <-> conducteur)
// ------------------------------------------------------------
// Une personne ne lit que SES conversations (RG09.4) : toutes les
// requêtes partent de l'identifiant de la personne connectée.
// Photos et vocaux (RG09.6, RG09.7) : le fichier va dans le stockage
// (Backblaze en production), la base garde sa clé.
// Chaque action prévient en direct les deux personnes (tempsReel.js) :
// nouveau message, reçu, lu, modifié, supprimé.
// ============================================================
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as messageModel from '../models/messageModel.js'
import * as reservationModel from '../models/reservationModel.js'
import * as stockage from './stockageService.js'
import { envoyerA, estConnecte } from '../tempsReel.js'

const MODIFICATION_MINUTES = 15 // RG09.3
const SUPPRESSION_POUR_TOUS_HEURES = 24 // RG09.8

export async function conversations(idMoi) {
  return {
    nonLus: await messageModel.nbNonLus(idMoi),
    conversations: await messageModel.conversations(idMoi)
  }
}

// Messages lus : l'expéditeur voit les coches passer au « lu » (RG09.9)
async function marquerLus(idMoi, idAutre) {
  const nb = await messageModel.marquerLus(idMoi, idAutre)
  if (nb > 0) {
    envoyerA(idAutre, { type: 'lus', par: idMoi })
    envoyerA(idMoi, { type: 'compteurs' })
  }
}

// Ouvre une conversation : les messages reçus passent en « lu »
export async function conversationAvec(idMoi, idAutre) {
  if (!(await reservationModel.sontLies(idMoi, idAutre))) {
    throw new ErreurApi(403, 'Vous ne pouvez échanger qu’avec les personnes de vos trajets.')
  }
  await marquerLus(idMoi, idAutre)
  const lignes = await messageModel.entre(idMoi, idAutre)
  return lignes.map(messageModel.versMessage)
}

// La conversation est ouverte quand un message arrive : il est lu tout de suite
export async function lire(idMoi, idAutre) {
  await marquerLus(idMoi, idAutre)
  return { nonLus: await messageModel.nbNonLus(idMoi) }
}

// Nouveau message : « reçu » tout de suite si le destinataire est connecté,
// puis diffusé aux deux personnes (tous leurs onglets ouverts)
async function diffuserNouveau(id) {
  let ligne = await messageModel.trouverParId(id)
  if (estConnecte(ligne.id_destinataire)) {
    await messageModel.marquerRecus(ligne.id_destinataire)
    ligne = await messageModel.trouverParId(id)
  }
  const message = messageModel.versMessage(ligne)
  envoyerA(ligne.id_destinataire, { type: 'message', message })
  envoyerA(ligne.id_expediteur, { type: 'message', message })
  return message
}

// La base vérifie le lien passager/conducteur (RG09.1) et le statut du compte (RG09.5)
export async function envoyer(idMoi, donnees) {
  const id = await messageModel.creer(idMoi, donnees.idDestinataire, donnees.contenu)
  return diffuserNouveau(id)
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
  let id
  try {
    id = await messageModel.creerAvecFichier(idMoi, idDestinataire, {
      type: fichier.categorie,
      fichier: cle,
      fichierType: fichier.type,
      dureeSecondes: fichier.categorie === 'vocal' ? dureeSecondes : null
    })
  } catch (erreur) {
    // Refus de la base (compte suspendu…) : le fichier ne sert à rien
    await stockage.supprimerSansErreur(cle)
    throw erreur
  }
  return diffuserNouveau(id)
}

// Un message de la conversation, ou 404 pour quelqu'un d'autre (RG09.4)
async function messageVisible(idMoi, idMessage) {
  const message = await messageModel.trouverParId(idMessage)
  if (!message || (message.id_expediteur !== idMoi && message.id_destinataire !== idMoi)) {
    throw new ErreurApi(404, 'Message introuvable.')
  }
  return message
}

// Modifier un texte : son auteur, dans les 15 minutes (RG09.3).
// La base refait le contrôle des 15 minutes avec sa propre horloge.
export async function modifier(idMoi, idMessage, contenu) {
  const message = await messageVisible(idMoi, idMessage)
  if (message.id_expediteur !== idMoi) throw new ErreurApi(403, 'Vous ne pouvez modifier que vos propres messages.')
  if (message.supprime_le) throw new ErreurApi(409, 'Ce message a été supprimé.')
  if (message.type_message !== 'texte') throw new ErreurApi(409, 'Seul un message texte peut être modifié (RG09.3).')
  if (message.age_minutes >= MODIFICATION_MINUTES) {
    throw new ErreurApi(409, `Un message ne peut être modifié que dans les ${MODIFICATION_MINUTES} minutes qui suivent son envoi (RG09.3).`)
  }
  await messageModel.modifierContenu(idMessage, contenu)
  const modifie = messageModel.versMessage(await messageModel.trouverParId(idMessage))
  envoyerA(message.id_destinataire, { type: 'message-modifie', message: modifie })
  envoyerA(idMoi, { type: 'message-modifie', message: modifie })
  return modifie
}

// Supprimer un message (RG09.8) :
// - pour moi : il disparaît seulement de ma conversation ;
// - pour tous : son auteur, dans les 24 heures ; le contenu et le
//   fichier sont effacés, il reste « Ce message a été supprimé ».
export async function supprimer(idMoi, idMessage, pourTous) {
  const message = await messageVisible(idMoi, idMessage)
  if (!pourTous) {
    await messageModel.masquerPourMoi(idMessage, idMoi)
    envoyerA(idMoi, { type: 'message-masque', id: Number(idMessage) })
    return { masque: true }
  }
  if (message.id_expediteur !== idMoi) throw new ErreurApi(403, 'Seul l’auteur peut supprimer un message pour tous.')
  if (message.supprime_le) throw new ErreurApi(409, 'Ce message est déjà supprimé.')
  if (message.age_minutes >= SUPPRESSION_POUR_TOUS_HEURES * 60) {
    throw new ErreurApi(409, `Un message ne peut être supprimé pour tous que dans les ${SUPPRESSION_POUR_TOUS_HEURES} heures qui suivent son envoi (RG09.8).`)
  }
  await messageModel.supprimerPourTous(idMessage)
  // La photo ou le vocal n'a plus de raison d'être conservé
  if (message.fichier) await stockage.supprimerSansErreur(message.fichier)
  const supprime = messageModel.versMessage(await messageModel.trouverParId(idMessage))
  envoyerA(message.id_destinataire, { type: 'message-supprime', message: supprime })
  envoyerA(idMoi, { type: 'message-supprime', message: supprime })
  return supprime
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
