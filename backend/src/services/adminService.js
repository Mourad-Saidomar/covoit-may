// ============================================================
// Service ADMIN : tableau de bord, paramètres, journal
// ============================================================
import { transaction } from '../config/db.js'
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as statistiqueModel from '../models/statistiqueModel.js'
import * as parametreModel from '../models/parametreModel.js'
import * as journalModel from '../models/journalModel.js'

export async function tableauDeBord() {
  const [chiffres, itineraires] = await Promise.all([
    statistiqueModel.chiffresCles(),
    statistiqueModel.itinerairesPopulaires()
  ])
  return { ...chiffres, itinerairesPopulaires: itineraires }
}

// Les réglages utiles aux visiteurs (affichés avant de réserver ou de publier)
export async function parametresPublics() {
  const reglages = await parametreModel.valeurs()
  return {
    tauxCommission: reglages.taux_commission,
    delaiRemboursementHeures: reglages.delai_remboursement_heures
  }
}

export function parametres() {
  return parametreModel.lister()
}

// Modification tracée dans le journal (RG12.1). Le nouveau taux de
// commission ne touche que les réservations créées ensuite (RG12.2).
export async function modifierParametre(admin, cle, valeur, ip) {
  if (!(await parametreModel.existe(cle))) throw new ErreurApi(404, 'Paramètre inconnu.')
  const avant = (await parametreModel.valeurs())[cle]
  await transaction(async function (cx) {
    await parametreModel.modifier(cle, valeur, admin.id, cx)
    await journalModel.ajouter({
      idAdmin: admin.id, action: 'MODIFICATION_PARAMETRE', tableCible: 'parametre',
      details: `${cle} : ${avant} -> ${valeur}`, ip
    }, cx)
  })
  return parametreModel.lister()
}

export function journal() {
  return journalModel.lister(200)
}
