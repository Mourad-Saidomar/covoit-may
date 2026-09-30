// ============================================================
// Service LITIGE
// ============================================================
import { transaction } from '../config/db.js'
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as litigeModel from '../models/litigeModel.js'
import * as paiementModel from '../models/paiementModel.js'
import * as journalModel from '../models/journalModel.js'

// La base vérifie : demandeur = passager ou conducteur (RG10.1),
// réservation concernée (RG10.2), un seul litige en cours (RG10.3)
export async function ouvrir(utilisateur, donnees) {
  const id = await litigeModel.creer(donnees, utilisateur.id)
  return litigeModel.versLitige(await litigeModel.trouverParId(id))
}

export async function mesLitiges(idUtilisateur) {
  const lignes = await litigeModel.listerParUtilisateur(idUtilisateur)
  return lignes.map(litigeModel.versLitige)
}

// ---------- Administrateur ----------

export async function lister(statut) {
  const lignes = await litigeModel.lister(statut)
  return lignes.map(litigeModel.versLitige)
}

async function trouver(id, cx) {
  const litige = await litigeModel.trouverParId(id, cx)
  if (!litige) throw new ErreurApi(404, 'Litige introuvable.')
  return litige
}

export async function prendreEnCharge(admin, id, ip) {
  await transaction(async function (cx) {
    const litige = await trouver(id, cx)
    if (litige.statut !== 'ouvert') throw new ErreurApi(409, 'Ce litige est déjà pris en charge.')
    await litigeModel.prendreEnCharge(id, admin.id, cx)
    await journalModel.ajouter({ idAdmin: admin.id, action: 'PRISE_EN_CHARGE_LITIGE', tableCible: 'litige', idCible: id, ip }, cx)
  })
  return litigeModel.versLitige(await trouver(id))
}

// Décision de l'administrateur (RG10.5). Un remboursement total rembourse
// le paiement ; un remboursement partiel précise le montant (RG10.6).
export async function resoudre(admin, id, donnees, ip) {
  await transaction(async function (cx) {
    const litige = await trouver(id, cx)
    if (litige.statut === 'resolu') throw new ErreurApi(409, 'Ce litige est déjà résolu.')

    let montant = null
    if (donnees.decision === 'remboursement_total') {
      montant = litige.montant_reservation
      await paiementModel.rembourser(litige.id_reservation, cx)
    } else if (donnees.decision === 'remboursement_partiel') {
      if (!donnees.montantRembourse) throw new ErreurApi(400, 'Indiquez le montant remboursé.')
      montant = donnees.montantRembourse
    }
    await litigeModel.resoudre(id, { ...donnees, montantRembourse: montant }, admin.id, cx)
    await journalModel.ajouter({
      idAdmin: admin.id, action: 'RESOLUTION_LITIGE', tableCible: 'litige', idCible: id,
      details: donnees.decision + ' : ' + donnees.resolution, ip
    }, cx)
  })
  return litigeModel.versLitige(await trouver(id))
}
