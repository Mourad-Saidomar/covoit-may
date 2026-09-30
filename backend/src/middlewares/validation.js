// ============================================================
// Outils de validation des données reçues
// ------------------------------------------------------------
// Toute donnée envoyée par le navigateur est contrôlée AVANT
// d'arriver aux services et à la base : type, longueur, format,
// liste de valeurs (RG13.4).
//
// Les champs non prévus sont supprimés : un client ne peut pas
// glisser "role": "admin" ou "montant": 0 dans sa requête (RG13.5).
//
// Chaque règle ci-dessous renvoie un objet :
//   { facultatif, verifier(valeur) } -> { valeur } ou { erreur }
// ============================================================
import { ErreurApi } from './errorHandler.js'

// Caractères invisibles de contrôle (hors retour à la ligne et tabulation)
// eslint-disable-next-line no-control-regex
const CARACTERES_CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

export const JOURS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

// ---------- Les règles ----------

export function texte({ min = 1, max = 255, facultatif = false, motif = null, message = '' } = {}) {
  return {
    facultatif,
    verifier(v) {
      if (typeof v !== 'string') return { erreur: 'doit être un texte' }
      const t = v.trim()
      if (CARACTERES_CONTROLE.test(t)) return { erreur: 'contient des caractères interdits' }
      if (t.length < min) return { erreur: min <= 1 ? 'est obligatoire' : `doit contenir au moins ${min} caractères` }
      if (t.length > max) return { erreur: `doit contenir au plus ${max} caractères` }
      if (motif && !motif.test(t)) return { erreur: message || 'a un format invalide' }
      return { valeur: t }
    }
  }
}

// Email : format simple, enregistré en minuscules (RG02.6)
export function email({ facultatif = false } = {}) {
  const regle = texte({ max: 150, facultatif, motif: /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i, message: 'n’est pas une adresse email valide' })
  return {
    facultatif,
    verifier(v) {
      const r = regle.verifier(v)
      return r.erreur ? r : { valeur: r.valeur.toLowerCase() }
    }
  }
}

// Mot de passe : 8 à 72 caractères, au moins une lettre et un chiffre (RG02.5).
// 72 : au-delà, bcrypt ignore la fin du mot de passe.
export function motDePasse({ facultatif = false } = {}) {
  return {
    facultatif,
    verifier(v) {
      if (typeof v !== 'string') return { erreur: 'doit être un texte' }
      if (v.length < 8) return { erreur: 'doit contenir au moins 8 caractères' }
      if (Buffer.byteLength(v) > 72) return { erreur: 'est trop long (72 caractères au plus)' }
      if (!/[a-zA-ZÀ-ſ]/.test(v) || !/[0-9]/.test(v)) {
        return { erreur: 'doit contenir au moins une lettre et un chiffre' }
      }
      return { valeur: v }
    }
  }
}

// Téléphone de Mayotte ou de France : 0639 12 34 56, +262 639 12 34 56 (RG02.7)
export function telephone({ facultatif = false } = {}) {
  return texte({ max: 20, facultatif, motif: /^(\+262 ?|0)[1-9]([ .]?[0-9]{2}){4}$/, message: 'n’est pas un numéro valide (ex. 0639 12 34 56)' })
}

export function entier({ min = 0, max = 1000000, facultatif = false } = {}) {
  return {
    facultatif,
    verifier(v) {
      const n = typeof v === 'string' && /^-?[0-9]+$/.test(v.trim()) ? Number(v) : v
      if (!Number.isInteger(n)) return { erreur: 'doit être un nombre entier' }
      if (n < min || n > max) return { erreur: `doit être compris entre ${min} et ${max}` }
      return { valeur: n }
    }
  }
}

// Nombre décimal (prix), 2 chiffres après la virgule au maximum
export function nombre({ min = 0, max = 1000000, facultatif = false } = {}) {
  return {
    facultatif,
    verifier(v) {
      const n = typeof v === 'string' && /^[0-9]+([.,][0-9]+)?$/.test(v.trim()) ? Number(v.replace(',', '.')) : v
      if (typeof n !== 'number' || !Number.isFinite(n)) return { erreur: 'doit être un nombre' }
      if (Math.round(n * 100) !== n * 100) return { erreur: 'a trop de décimales' }
      if (n < min || n > max) return { erreur: `doit être compris entre ${min} et ${max}` }
      return { valeur: n }
    }
  }
}

export function booleen({ facultatif = false } = {}) {
  return {
    facultatif,
    verifier(v) {
      if (v === true || v === 'true' || v === 1 || v === '1') return { valeur: true }
      if (v === false || v === 'false' || v === 0 || v === '0') return { valeur: false }
      return { erreur: 'doit valoir vrai ou faux' }
    }
  }
}

// Date "AAAA-MM-JJ" qui existe vraiment (pas de 31 février)
export function date({ facultatif = false } = {}) {
  return {
    facultatif,
    verifier(v) {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { erreur: 'doit être une date AAAA-MM-JJ' }
      const d = new Date(v + 'T00:00:00Z')
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return { erreur: 'n’est pas une date qui existe' }
      return { valeur: v }
    }
  }
}

// Heure "HH:MM"
export function heure({ facultatif = false } = {}) {
  return texte({ max: 5, facultatif, motif: /^([01][0-9]|2[0-3]):[0-5][0-9]$/, message: 'doit être une heure HH:MM' })
}

// Une valeur parmi une liste
export function choix(valeurs, { facultatif = false } = {}) {
  return {
    facultatif,
    verifier(v) {
      if (!valeurs.includes(v)) return { erreur: `doit valoir : ${valeurs.join(', ')}` }
      return { valeur: v }
    }
  }
}

// Un tableau de valeurs prises dans une liste (sans doublon)
export function listeDe(valeurs, { facultatif = false } = {}) {
  return {
    facultatif,
    verifier(v) {
      if (!Array.isArray(v) || v.some((x) => !valeurs.includes(x))) return { erreur: `doit être une liste parmi : ${valeurs.join(', ')}` }
      return { valeur: [...new Set(v)] }
    }
  }
}

// ---------- Application des règles ----------

// Vérifie "donnees" avec les "regles". Renvoie un objet propre ne
// contenant QUE les champs prévus, ou lance une erreur 400.
// partiel = true : tous les champs deviennent facultatifs (modification).
// accepterVide = true : aucun champ fourni n'est pas une erreur (filtres).
export function valider(regles, donnees, { partiel = false, accepterVide = false } = {}) {
  const propre = {}
  const erreurs = []
  const source = donnees && typeof donnees === 'object' ? donnees : {}

  for (const [nom, regle] of Object.entries(regles)) {
    const valeur = source[nom]
    const vide = valeur === undefined || valeur === null || valeur === ''
    if (vide) {
      if (!regle.facultatif && !partiel) erreurs.push({ champ: nom, message: 'est obligatoire' })
      continue
    }
    const resultat = regle.verifier(valeur)
    if (resultat.erreur) {
      erreurs.push({ champ: nom, message: resultat.erreur })
    } else {
      propre[nom] = resultat.valeur
    }
  }

  if (erreurs.length) {
    const premiere = erreurs[0]
    throw new ErreurApi(400, `Données invalides : « ${premiere.champ} » ${premiere.message}.`, erreurs)
  }
  if (partiel && !accepterVide && Object.keys(propre).length === 0) {
    throw new ErreurApi(400, 'Aucune donnée à modifier.')
  }
  return propre
}

// Middleware : valide le corps de la requête (req.body)
export function verifierCorps(regles, options) {
  return function (req, res, next) {
    req.body = valider(regles, req.body, options)
    next()
  }
}

// Middleware : valide les paramètres d'adresse (?depart=…&prixMax=…)
// Le résultat est rangé dans req.filtres.
export function verifierFiltres(regles) {
  return function (req, res, next) {
    req.filtres = valider(regles, req.query, { partiel: true, accepterVide: true })
    next()
  }
}
