// ============================================================
// Validation : inscription et connexion
// ============================================================
import { verifierCorps, texte, email, motDePasse, telephone, choix, date, booleen } from './validation.js'

// Noms et prénoms : lettres (accents compris), espaces, tirets, apostrophes
const NOM = /^[\p{L}][\p{L} '’-]*$/u

export const validateInscriptionBody = verifierCorps({
  nom: texte({ max: 100, motif: NOM, message: 'ne doit contenir que des lettres' }),
  prenom: texte({ max: 100, motif: NOM, message: 'ne doit contenir que des lettres' }),
  email: email(),
  motDePasse: motDePasse(),
  telephone: telephone(),
  commune: texte({ max: 60 }),
  // Seuls ces deux rôles s'ouvrent à l'inscription : jamais "admin" (RG01.3)
  role: choix(['passager', 'conducteur']),
  dateNaissance: date({ facultatif: true }),
  // Acceptation des CGU et de la politique de confidentialité (RG02.9)
  cguAcceptees: booleen()
})

export const validateConnexionBody = verifierCorps({
  email: email(),
  // À la connexion on ne vérifie pas la robustesse : juste un texte non vide
  motDePasse: texte({ max: 200 })
})
