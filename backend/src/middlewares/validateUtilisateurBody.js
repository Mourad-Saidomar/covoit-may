// ============================================================
// Validation : profil, mot de passe, suppression du compte,
// et actions de l'administrateur sur un compte
// ============================================================
import { verifierCorps, verifierFiltres, texte, motDePasse, telephone, date, choix } from './validation.js'

const NOM = /^[\p{L}][\p{L} '’-]*$/u

// Modification du profil : seuls ces champs sont modifiables par la
// personne elle-même. Rôle, statut, vérification et note ne le sont
// jamais (RG02.17).
export const validateProfilBody = verifierCorps({
  nom: texte({ max: 100, motif: NOM, message: 'ne doit contenir que des lettres' }),
  prenom: texte({ max: 100, motif: NOM, message: 'ne doit contenir que des lettres' }),
  telephone: telephone(),
  commune: texte({ max: 60 }),
  adresse: texte({ max: 255 }),
  bio: texte({ max: 500 }),
  dateNaissance: date()
}, { partiel: true })

export const validateMotDePasseBody = verifierCorps({
  ancienMotDePasse: texte({ max: 200 }),
  nouveauMotDePasse: motDePasse()
})

// Suppression du compte : le mot de passe est redemandé
export const validateSuppressionBody = verifierCorps({
  motDePasse: texte({ max: 200 })
})

// Administrateur : suspendre ou réactiver un compte
export const validateStatutBody = verifierCorps({
  statut: choix(['actif', 'suspendu']),
  motif: texte({ max: 255, facultatif: true })
})

// Administrateur : recherche dans la liste des utilisateurs
export const validateRechercheUtilisateurs = verifierFiltres({
  recherche: texte({ max: 100 }),
  role: choix(['passager', 'conducteur']),
  statut: choix(['actif', 'en_attente', 'suspendu', 'refuse', 'supprime'])
})
