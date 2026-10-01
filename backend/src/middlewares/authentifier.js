// ============================================================
// Authentification par jeton JWT (RG13.1)
// ------------------------------------------------------------
// Après la connexion, le navigateur reçoit un jeton signé. Il le
// renvoie à chaque requête dans l'en-tête :
//     Authorization: Bearer <jeton>
// On vérifie la signature et la date d'expiration, puis on relit
// le compte dans la base : un compte suspendu ou supprimé est
// refusé dès sa requête suivante (RG02.12).
// ============================================================
import jwt from 'jsonwebtoken'
import { ErreurApi } from './errorHandler.js'
import * as utilisateurModel from '../models/utilisateurModel.js'
import * as administrateurModel from '../models/administrateurModel.js'

export const STATUTS_BLOQUES = ['suspendu', 'refuse', 'supprime']

// Crée le jeton d'une personne qui vient de se connecter
export function creerJeton(id, role) {
  return jwt.sign({ sub: String(id), role: role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_DUREE || '2h',
    issuer: 'covoitmay'
  })
}

// Vérifie un jeton et relit le compte : renvoie la personne connectée
// { id, role, prenom… } ou lance une ErreurApi 401. Utilisée par
// authentifier et par la connexion temps réel (tempsReel.js).
export async function verifierJeton(jeton) {
  let contenu
  try {
    // On impose l'algorithme : un jeton "alg: none" est refusé
    contenu = jwt.verify(jeton, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'covoitmay' })
  } catch {
    throw new ErreurApi(401, 'Votre session a expiré. Reconnectez-vous.')
  }

  const id = Number(contenu.sub)
  if (contenu.role === 'admin') {
    const admin = await administrateurModel.trouverParId(id)
    if (!admin || !admin.actif) throw new ErreurApi(401, 'Ce compte administrateur n’est plus actif.')
    return { id: id, role: 'admin', prenom: admin.prenom }
  }
  const utilisateur = await utilisateurModel.trouverParId(id)
  if (!utilisateur || STATUTS_BLOQUES.includes(utilisateur.statut_compte)) {
    throw new ErreurApi(401, 'Ce compte n’est plus actif. Contactez le support.')
  }
  // Adresse email non vérifiée : aucun accès (RG02.20)
  if (utilisateur.email_verifie !== 1) {
    throw new ErreurApi(401, 'Votre adresse email n’est pas vérifiée.')
  }
  // Le rôle vient de la base, pas du jeton : il est à jour si
  // l'administrateur vient d'accepter une demande conducteur.
  return {
    id: id,
    role: utilisateur.role,
    prenom: utilisateur.prenom,
    statut: utilisateur.statut_compte,
    verifie: utilisateur.statut_verification === 1
  }
}

export async function authentifier(req, res, next) {
  const entete = req.headers.authorization || ''
  const [type, jeton] = entete.split(' ')
  if (type !== 'Bearer' || !jeton) {
    throw new ErreurApi(401, 'Vous devez être connecté.')
  }
  req.utilisateur = await verifierJeton(jeton)
  next()
}
