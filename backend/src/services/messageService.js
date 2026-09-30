// ============================================================
// Service MESSAGE (messagerie passager <-> conducteur)
// ------------------------------------------------------------
// Une personne ne lit que SES conversations (RG09.4) : toutes les
// requêtes partent de l'identifiant de la personne connectée.
// ============================================================
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as messageModel from '../models/messageModel.js'
import * as reservationModel from '../models/reservationModel.js'

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
