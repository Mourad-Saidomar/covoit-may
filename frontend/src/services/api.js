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

const URL_API = import.meta.env.VITE_API_URL || '/api'

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

// Télécharge un fichier protégé (justificatif) et l'ouvre dans un nouvel onglet.
// Un simple lien ne marcherait pas : il faut envoyer le jeton.
export async function ouvrirFichier(chemin) {
  const reponse = await fetch(URL_API + chemin, { headers: { Authorization: 'Bearer ' + jeton } })
  if (!reponse.ok) {
    let message = 'Fichier indisponible.'
    try { message = (await reponse.json()).erreur || message } catch { /* réponse vide */ }
    throw new ErreurApi(reponse.status, message)
  }
  const fichier = await reponse.blob()
  const lien = URL.createObjectURL(fichier)
  window.open(lien, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(lien), 60000)
}
