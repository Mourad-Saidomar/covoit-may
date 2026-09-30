// ============================================================
// Service AUTH : inscription et connexion
// ============================================================
import bcrypt from 'bcryptjs'
import { ErreurApi } from '../middlewares/errorHandler.js'
import { creerJeton, STATUTS_BLOQUES } from '../middlewares/authentifier.js'
import * as utilisateurModel from '../models/utilisateurModel.js'
import * as administrateurModel from '../models/administrateurModel.js'
import * as parametreModel from '../models/parametreModel.js'

// Coût de bcrypt : 12 = environ 0,25 s par empreinte. Assez lent pour
// décourager un pirate qui essaie des millions de mots de passe (RG02.5).
export const COUT_BCRYPT = 12

// Empreinte "leurre" : quand l'email n'existe pas, on fait quand même une
// comparaison bcrypt pour que la réponse prenne le même temps. Un pirate
// ne peut donc pas deviner quels emails sont inscrits (RG13.8).
const EMPREINTE_LEURRE = bcrypt.hashSync('leurre-covoitmay', COUT_BCRYPT)

const MESSAGE_IDENTIFIANTS = 'Email ou mot de passe incorrect.'

const MESSAGES_BLOCAGE = {
  suspendu: 'Ce compte a été suspendu. Contactez le support.',
  refuse: 'Ce compte n’a pas été validé par l’équipe Covoit’May.',
  supprime: 'Ce compte a été supprimé.'
}

export async function inscrire(donnees) {
  // Acceptation des CGU obligatoire (RG02.9)
  if (donnees.cguAcceptees !== true) {
    throw new ErreurApi(400, 'Vous devez accepter les conditions générales et la politique de confidentialité.')
  }
  const empreinte = await bcrypt.hash(donnees.motDePasse, COUT_BCRYPT)
  // La base force : compte non vérifié, conducteur « en attente » (RG02.10)
  const id = await utilisateurModel.creer({ ...donnees, empreinte })
  const utilisateur = await utilisateurModel.trouverParId(id)
  return {
    jeton: creerJeton(id, utilisateur.role),
    utilisateur: utilisateurModel.versUtilisateur(utilisateur)
  }
}

export async function connecter(email, motDePasse) {
  const reglages = await parametreModel.valeurs()
  const maximum = reglages.tentatives_connexion_max || 5
  const minutes = reglages.duree_blocage_minutes || 15

  // 1. On cherche d'abord un membre, puis un administrateur
  let compte = await utilisateurModel.trouverPourConnexion(email)
  let type = 'utilisateur'
  if (!compte) {
    compte = await administrateurModel.trouverPourConnexion(email)
    type = 'admin'
  }
  if (!compte || !compte.mot_de_passe) {
    await bcrypt.compare(motDePasse, EMPREINTE_LEURRE)
    throw new ErreurApi(401, MESSAGE_IDENTIFIANTS)
  }

  // 2. Compte bloqué après trop d'échecs (RG02.13)
  if (compte.est_bloque) {
    throw new ErreurApi(429, `Trop de tentatives échouées. Réessayez dans ${minutes} minutes.`)
  }

  // 3. Vérification du mot de passe
  const correct = await bcrypt.compare(motDePasse, compte.mot_de_passe)
  const modele = type === 'admin' ? administrateurModel : utilisateurModel
  const id = type === 'admin' ? compte.id_admin : compte.id_utilisateur
  if (!correct) {
    await modele.enregistrerEchec(id, maximum, minutes)
    throw new ErreurApi(401, MESSAGE_IDENTIFIANTS)
  }

  // 4. Compte bloqué par l'administration (RG02.12)
  if (type === 'utilisateur' && STATUTS_BLOQUES.includes(compte.statut_compte)) {
    throw new ErreurApi(403, MESSAGES_BLOCAGE[compte.statut_compte])
  }
  if (type === 'admin' && !compte.actif) {
    throw new ErreurApi(403, 'Ce compte administrateur est désactivé.')
  }

  await modele.enregistrerConnexion(id)

  if (type === 'admin') {
    return { jeton: creerJeton(id, 'admin'), utilisateur: administrateurModel.versAdministrateur(compte) }
  }
  const utilisateur = await utilisateurModel.trouverParId(id)
  return {
    jeton: creerJeton(id, utilisateur.role),
    utilisateur: utilisateurModel.versUtilisateur(utilisateur)
  }
}

// Le compte de la personne connectée
export async function moi(utilisateurConnecte) {
  if (utilisateurConnecte.role === 'admin') {
    const admin = await administrateurModel.trouverParId(utilisateurConnecte.id)
    return administrateurModel.versAdministrateur(admin)
  }
  const utilisateur = await utilisateurModel.trouverParId(utilisateurConnecte.id)
  return utilisateurModel.versUtilisateur(utilisateur)
}
