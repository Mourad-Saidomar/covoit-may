// ============================================================
// Appels à l'API du backend
// ------------------------------------------------------------
// Toutes les pages passent par ce fichier pour parler au serveur.
// Il ajoute le jeton de connexion, transforme la réponse JSON et
// lance une erreur avec le message du serveur si ça échoue.
//
// L'adresse de l'API : /api (Vite relaie vers le backend, voir
// vite.config.ts). En production on peut la changer avec la
// variable VITE_API_URL.
// ============================================================

export const URL_API = import.meta.env.VITE_API_URL || '/api'

// Adresse complète d'un média renvoyé par l'API (ex. « /utilisateurs/4/photo?v=… »)
export function urlMedia(chemin) {
  return chemin ? URL_API + chemin : null
}

// Erreur renvoyée par l'API : statut HTTP + message en français
export class ErreurApi extends Error {
  constructor(statut, message, details = null) {
    super(message)
    this.statut = statut
    this.details = details
  }
}

// Le jeton de la personne connectée (null = visiteur)
let jeton = null
export function definirJeton(nouveauJeton) {
  jeton = nouveauJeton
}

// Fonction appelée quand le serveur répond 401 alors qu'on était
// connecté : session expirée, ou compte suspendu entre-temps
let quandSessionFermee = null
export function surSessionFermee(fonction) {
  quandSessionFermee = fonction
}

// Construit l'adresse avec les paramètres (?depart=…&prixMax=…),
// en ignorant les paramètres vides
function adresse(chemin, parametres) {
  const recherche = new URLSearchParams()
  Object.entries(parametres || {}).forEach(function ([cle, valeur]) {
    if (valeur !== undefined && valeur !== null && valeur !== '' && valeur !== false) {
      recherche.append(cle, valeur)
    }
  })
  const texte = recherche.toString()
  return URL_API + chemin + (texte ? '?' + texte : '')
}

// La fonction principale. Exemples :
//   api('/trajets', { parametres: { depart: 'Combani' } })
//   api('/reservations', { methode: 'POST', corps: { idTrajet: 3, nbPlaces: 1 } })
export async function api(chemin, { methode = 'GET', corps, formulaire, parametres } = {}) {
  const entetes = {}
  if (jeton) entetes.Authorization = 'Bearer ' + jeton

  let body
  if (formulaire) {
    body = formulaire // FormData : le navigateur écrit lui-même l'en-tête
  } else if (corps !== undefined) {
    entetes['Content-Type'] = 'application/json'
    body = JSON.stringify(corps)
  }

  let reponse
  try {
    reponse = await fetch(adresse(chemin, parametres), { method: methode, headers: entetes, body: body })
  } catch {
    throw new ErreurApi(0, 'Le serveur ne répond pas. Vérifiez que l’API est lancée (dossier backend : npm run dev).')
  }

  if (reponse.status === 204) return null

  let donnees = null
  try {
    donnees = await reponse.json()
  } catch {
    donnees = null
  }

  if (!reponse.ok) {
    const message = (donnees && donnees.erreur) || 'Une erreur est survenue (' + reponse.status + ').'
    if (reponse.status === 401 && jeton && quandSessionFermee) {
      quandSessionFermee(message)
    }
    throw new ErreurApi(reponse.status, message, donnees && donnees.details)
  }
  return donnees
}

// Raccourcis
export const lire = (chemin, parametres) => api(chemin, { parametres })
export const envoyer = (chemin, corps) => api(chemin, { methode: 'POST', corps })
export const remplacer = (chemin, corps) => api(chemin, { methode: 'PUT', corps })
export const modifier = (chemin, corps) => api(chemin, { methode: 'PATCH', corps })
export const supprimer = (chemin, corps) => api(chemin, { methode: 'DELETE', corps })

// Lit un fichier protégé (justificatif, PDF, photo ou vocal d'un message).
// Une simple balise <img src> ou un lien ne marcheraient pas : il faut
// envoyer le jeton. Renvoie le fichier (Blob) et la réponse.
export async function lireFichier(chemin) {
  let reponse
  try {
    reponse = await fetch(URL_API + chemin, { headers: jeton ? { Authorization: 'Bearer ' + jeton } : {} })
  } catch {
    throw new ErreurApi(0, 'Le serveur ne répond pas.')
  }
  if (!reponse.ok) {
    let message = 'Fichier indisponible.'
    try { message = (await reponse.json()).erreur || message } catch { /* réponse vide */ }
    if (reponse.status === 401 && jeton && quandSessionFermee) quandSessionFermee(message)
    throw new ErreurApi(reponse.status, message)
  }
  return { fichier: await reponse.blob(), reponse }
}

// Ouvre un fichier protégé (justificatif) dans un nouvel onglet
export async function ouvrirFichier(chemin) {
  const { fichier } = await lireFichier(chemin)
  const lien = URL.createObjectURL(fichier)
  window.open(lien, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(lien), 60000)
}

// Télécharge un document (PDF) sous le nom donné par le serveur
export async function telechargerFichier(chemin, nomParDefaut = 'document.pdf') {
  const { fichier, reponse } = await lireFichier(chemin)
  const entete = reponse.headers.get('Content-Disposition') || ''
  const nom = (entete.match(/filename="([^"]+)"/) || [])[1] || nomParDefaut
  const lien = URL.createObjectURL(fichier)
  const a = document.createElement('a')
  a.href = lien
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(lien), 60000)
}
