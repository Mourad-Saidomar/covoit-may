// ============================================================
// Modèle PARAMÈTRE (réglages de la plateforme)
// ============================================================
import { requete } from '../config/db.js'

export async function lister() {
  const lignes = await requete('SELECT cle, valeur, description, date_modification FROM parametre ORDER BY cle')
  return lignes.map((l) => ({ cle: l.cle, valeur: l.valeur, description: l.description, dateModification: l.date_modification }))
}

// Tous les paramètres sous forme { cle: nombre }
export async function valeurs() {
  const lignes = await requete('SELECT cle, valeur FROM parametre')
  const resultat = {}
  lignes.forEach(function (l) { resultat[l.cle] = Number(l.valeur) })
  return resultat
}

export async function existe(cle) {
  const [ligne] = await requete('SELECT cle FROM parametre WHERE cle = ?', [cle])
  return !!ligne
}

export async function modifier(cle, valeur, idAdmin, cx) {
  await requete('UPDATE parametre SET valeur = ?, id_admin = ? WHERE cle = ?', [valeur, idAdmin, cle], cx)
}
