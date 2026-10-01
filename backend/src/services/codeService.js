// ============================================================
// Service CODE : codes à 6 chiffres envoyés par email (RG02.21)
// ------------------------------------------------------------
// Utilisés pour vérifier l'adresse à l'inscription et pour
// réinitialiser un mot de passe oublié.
// - 6 chiffres tirés au hasard (générateur cryptographique) ;
// - valable 10 minutes, 5 essais au plus ;
// - un nouvel envoi au plus toutes les 60 secondes, 5 par heure ;
// - jamais stocké en clair : la base garde son empreinte HMAC-SHA256
//   (calculée avec la clé secrète du serveur).
// ============================================================
import crypto from 'node:crypto'
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as codeModel from '../models/codeModel.js'

export const DUREE_MINUTES = 10
export const TENTATIVES_MAX = 5
const DELAI_RENVOI_SECONDES = 60
const ENVOIS_PAR_HEURE = 5

function empreinte(idUtilisateur, objet, code) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${idUtilisateur}:${objet}:${code}`).digest('hex')
}

// Fabrique un nouveau code et renvoie sa valeur (pour l'email). Refuse
// si un code vient d'être envoyé, ou s'il y en a eu trop dans l'heure.
export async function creer(idUtilisateur, objet) {
  const envois = await codeModel.derniersEnvois(idUtilisateur, objet)
  if (envois.secondesDepuis !== null && envois.secondesDepuis < DELAI_RENVOI_SECONDES) {
    throw new ErreurApi(429, `Un code vient d’être envoyé. Patientez ${DELAI_RENVOI_SECONDES - envois.secondesDepuis} secondes avant d’en demander un autre.`)
  }
  if (envois.dansLHeure >= ENVOIS_PAR_HEURE) {
    throw new ErreurApi(429, 'Trop de codes demandés. Réessayez dans une heure.')
  }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
  await codeModel.creer(idUtilisateur, objet, empreinte(idUtilisateur, objet, code), DUREE_MINUTES)
  return code
}

// Vérifie le code saisi. Chaque erreur consomme un essai ; au 5e,
// le code est abandonné et il faut en demander un nouveau.
export async function verifier(idUtilisateur, objet, code) {
  const enCours = await codeModel.enCours(idUtilisateur, objet, TENTATIVES_MAX)
  if (!enCours) {
    throw new ErreurApi(400, 'Code expiré ou invalide. Demandez un nouveau code.')
  }
  const attendu = Buffer.from(enCours.empreinte, 'hex')
  const recu = Buffer.from(empreinte(idUtilisateur, objet, code), 'hex')
  // Comparaison à durée constante : on ne peut rien déduire du temps de réponse
  if (!crypto.timingSafeEqual(attendu, recu)) {
    await codeModel.ajouterTentative(enCours.id_code)
    const restants = TENTATIVES_MAX - enCours.tentatives - 1
    throw new ErreurApi(400, restants > 0
      ? `Code incorrect. Il vous reste ${restants} essai${restants > 1 ? 's' : ''}.`
      : 'Code incorrect. Trop d’essais : demandez un nouveau code.')
  }
  await codeModel.marquerUtilise(enCours.id_code)
}
