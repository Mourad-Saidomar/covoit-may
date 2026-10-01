// ============================================================
// Service AUTH : inscription, vérification de l'email, connexion,
// mot de passe oublié
// ------------------------------------------------------------
// Un nouveau compte n'a accès à rien tant que son adresse email
// n'est pas vérifiée par le code à 6 chiffres reçu (RG02.20).
// ============================================================
import bcrypt from 'bcryptjs'
import { ErreurApi } from '../middlewares/errorHandler.js'
import { creerJeton, STATUTS_BLOQUES } from '../middlewares/authentifier.js'
import * as utilisateurModel from '../models/utilisateurModel.js'
import * as administrateurModel from '../models/administrateurModel.js'
import * as parametreModel from '../models/parametreModel.js'
import * as codeService from './codeService.js'
import * as emailService from './emailService.js'

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
  // La base force : compte non vérifié, conducteur « en attente » (RG02.10),
  // adresse email non vérifiée (RG02.20)
  const id = await utilisateurModel.creer({ ...donnees, empreinte })
  const utilisateur = await utilisateurModel.trouverParId(id)
  // Pas de jeton : il faut d'abord saisir le code reçu par email
  const emailEnvoye = await envoyerCodeSansErreur(utilisateur, 'inscription')
  return { verificationRequise: true, email: utilisateur.email, emailEnvoye }
}

// Crée un code et l'envoie. Une panne d'envoi n'annule pas l'inscription :
// la personne pourra demander un nouveau code.
async function envoyerCodeSansErreur(utilisateur, objet) {
  try {
    const code = await codeService.creer(utilisateur.id_utilisateur, objet)
    await emailService.envoyerCode({
      email: utilisateur.email, prenom: utilisateur.prenom, code, objet, minutes: codeService.DUREE_MINUTES
    })
    return true
  } catch (erreur) {
    if (!(erreur instanceof ErreurApi)) console.error('[email]', erreur.message)
    return false
  }
}

const MESSAGE_CODE_INVALIDE = 'Code expiré ou invalide. Demandez un nouveau code.'

// Réponse de connexion : jeton + compte
async function ouvrirSession(id) {
  await utilisateurModel.enregistrerConnexion(id)
  const utilisateur = await utilisateurModel.trouverParId(id)
  return { jeton: creerJeton(id, utilisateur.role), utilisateur: utilisateurModel.versUtilisateur(utilisateur) }
}

// Saisie du code reçu à l'inscription : l'adresse est vérifiée et la
// personne est connectée
export async function verifierEmail(email, code) {
  const utilisateur = await utilisateurModel.trouverParEmail(email)
  if (!utilisateur || utilisateur.email_verifie === 1 || STATUTS_BLOQUES.includes(utilisateur.statut_compte)) {
    throw new ErreurApi(400, MESSAGE_CODE_INVALIDE)
  }
  await codeService.verifier(utilisateur.id_utilisateur, 'inscription', code)
  await utilisateurModel.validerEmail(utilisateur.id_utilisateur)
  return ouvrirSession(utilisateur.id_utilisateur)
}

// Nouveau code d'inscription (le précédent a expiré ou n'est pas arrivé)
export async function renvoyerCodeInscription(email) {
  const utilisateur = await utilisateurModel.trouverParEmail(email)
  if (utilisateur && utilisateur.email_verifie === 0 && !STATUTS_BLOQUES.includes(utilisateur.statut_compte)) {
    const code = await codeService.creer(utilisateur.id_utilisateur, 'inscription')
    await emailService.envoyerCode({
      email: utilisateur.email, prenom: utilisateur.prenom, code, objet: 'inscription', minutes: codeService.DUREE_MINUTES
    })
  }
  return { message: 'Si un compte attend une vérification avec cette adresse, un nouveau code vient d’être envoyé.' }
}

// Mot de passe oublié : même réponse que l'adresse existe ou non (RG13.8)
export async function motDePasseOublie(email) {
  const utilisateur = await utilisateurModel.trouverParEmail(email)
  if (utilisateur && !STATUTS_BLOQUES.includes(utilisateur.statut_compte)) {
    await envoyerCodeSansErreur(utilisateur, 'mot_de_passe')
  }
  return { message: 'Si un compte existe avec cette adresse, un code de réinitialisation vient d’être envoyé.' }
}

// Nouveau mot de passe avec le code reçu. Le code prouve que la personne
// lit cette boîte mail : l'adresse est vérifiée, le blocage levé.
export async function reinitialiserMotDePasse(email, code, nouveauMotDePasse) {
  const utilisateur = await utilisateurModel.trouverParEmail(email)
  if (!utilisateur || STATUTS_BLOQUES.includes(utilisateur.statut_compte)) {
    throw new ErreurApi(400, MESSAGE_CODE_INVALIDE)
  }
  await codeService.verifier(utilisateur.id_utilisateur, 'mot_de_passe', code)
  await utilisateurModel.modifierMotDePasse(utilisateur.id_utilisateur, await bcrypt.hash(nouveauMotDePasse, COUT_BCRYPT))
  await utilisateurModel.validerEmail(utilisateur.id_utilisateur)
  return ouvrirSession(utilisateur.id_utilisateur)
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

  // 5. Adresse email pas encore vérifiée : un nouveau code part (RG02.20)
  if (type === 'utilisateur' && compte.email_verifie !== 1) {
    const emailEnvoye = await envoyerCodeSansErreur(compte, 'inscription')
    throw new ErreurApi(403,
      'Votre adresse email n’est pas encore vérifiée. ' +
      (emailEnvoye ? 'Un nouveau code vient de vous être envoyé.' : 'Saisissez le code reçu ou demandez-en un nouveau.'),
      { code: 'EMAIL_NON_VERIFIE', email: compte.email })
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
