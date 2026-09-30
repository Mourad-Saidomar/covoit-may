// ============================================================
// Service AVIS
// ============================================================
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as avisModel from '../models/avisModel.js'
import * as trajetModel from '../models/trajetModel.js'
import * as journalModel from '../models/journalModel.js'

// La base vérifie : trajet passé (RG07.2), passager du trajet (RG07.3),
// un seul avis (RG07.5), délai de 30 jours (RG07.8)
export async function deposer(auteur, donnees) {
  const trajet = await trajetModel.trouverParId(donnees.idTrajet)
  if (!trajet) throw new ErreurApi(404, 'Trajet introuvable.')
  const id = await avisModel.creer(donnees, auteur.id, trajet.id_utilisateur)
  return avisModel.versAvis(await avisModel.trouverParId(id))
}

// Avis visibles d'une personne (les avis signalés sont masqués)
export async function avisRecus(idUtilisateur) {
  const lignes = await avisModel.listerRecus(idUtilisateur)
  return lignes.map(avisModel.versAvis)
}

// Seule la personne notée peut signaler un avis (RG07.10)
export async function signaler(utilisateur, id, motif) {
  const avis = await avisModel.trouverParId(id)
  if (!avis) throw new ErreurApi(404, 'Avis introuvable.')
  if (avis.id_cible !== utilisateur.id) throw new ErreurApi(403, 'Vous ne pouvez signaler que les avis qui vous concernent.')
  if (avis.signale) throw new ErreurApi(409, 'Cet avis est déjà signalé.')
  await avisModel.signaler(id, utilisateur.id, motif)
}

// ---------- Administrateur (modération) ----------

export async function lister(signales) {
  const lignes = await avisModel.lister(signales)
  return lignes.map(avisModel.versAvis)
}

export async function restaurer(admin, id, ip) {
  const avis = await avisModel.trouverParId(id)
  if (!avis) throw new ErreurApi(404, 'Avis introuvable.')
  await avisModel.restaurer(id)
  await journalModel.ajouter({ idAdmin: admin.id, action: 'RESTAURATION_AVIS', tableCible: 'avis', idCible: id, ip })
}

export async function supprimer(admin, id, ip) {
  const avis = await avisModel.trouverParId(id)
  if (!avis) throw new ErreurApi(404, 'Avis introuvable.')
  await avisModel.supprimer(id)
  // Le texte supprimé est gardé dans le journal pour la traçabilité
  await journalModel.ajouter({
    idAdmin: admin.id, action: 'SUPPRESSION_AVIS', tableCible: 'avis', idCible: id,
    details: `Note ${avis.note}/5 de ${avis.auteur_prenom} : ${avis.commentaire}`, ip
  })
}
