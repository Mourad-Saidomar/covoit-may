// ============================================================
// Connexion temps réel avec l'API (WebSocket /api/temps-reel)
// ------------------------------------------------------------
// Le serveur prévient le site tout de suite : nouveau message,
// message reçu ou lu, modifié, supprimé, « en train d'écrire »,
// nouveau trajet pour une alerte.
// - connecter(jeton) : à la connexion d'un membre ;
// - deconnecter() : à la déconnexion ;
// - ecouter(type, fonction) : s'abonner à un événement (renvoie
//   une fonction pour se désabonner) ;
// - envoyer(objet) : par exemple { type: 'ecrit', avec: 12 }.
// Si la connexion tombe, elle est relancée (1 s, 2 s, 4 s… 30 s).
// Les pages ne dépendent pas du temps réel : sans lui, elles
// interrogent l'API régulièrement (voir estConnecte()).
// ============================================================
import { reactive } from 'vue'
import { URL_API } from './api'

// État lisible par les pages (réactif)
export const etatTempsReel = reactive({ connecte: false })

const abonnes = new Map() // type -> Set de fonctions
let socket = null
let jetonActuel = null
let attente = 1000
let minuteurReconnexion = null

// /api (développement, relayé par Vite) ou https://…/api (production)
// -> ws://…/api/temps-reel ou wss://…/api/temps-reel
function adresse() {
  const base = new URL(URL_API, window.location.href)
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
  return base.href.replace(/\/$/, '') + '/temps-reel'
}

function diffuser(evenement) {
  const liste = abonnes.get(evenement.type)
  if (liste) liste.forEach((fonction) => fonction(evenement))
  const tous = abonnes.get('*')
  if (tous) tous.forEach((fonction) => fonction(evenement))
}

function ouvrir() {
  if (!jetonActuel || !window.WebSocket) return
  try {
    socket = new WebSocket(adresse())
  } catch {
    planifierReconnexion()
    return
  }
  socket.onopen = () => {
    // Le jeton part dans le premier message, jamais dans l'adresse
    socket.send(JSON.stringify({ type: 'auth', jeton: jetonActuel }))
  }
  socket.onmessage = (e) => {
    let evenement
    try {
      evenement = JSON.parse(e.data)
    } catch {
      return
    }
    if (evenement.type === 'pret') {
      etatTempsReel.connecte = true
      attente = 1000
    }
    diffuser(evenement)
  }
  socket.onclose = (e) => {
    const etaitConnecte = etatTempsReel.connecte
    etatTempsReel.connecte = false
    socket = null
    if (etaitConnecte) diffuser({ type: 'deconnecte' })
    // 4001 : session refusée par le serveur, inutile d'insister
    if (jetonActuel && e.code !== 4001 && e.code !== 4003) planifierReconnexion()
  }
  socket.onerror = () => {
    // l'événement close suit : la reconnexion y est gérée
  }
}

function planifierReconnexion() {
  clearTimeout(minuteurReconnexion)
  minuteurReconnexion = setTimeout(ouvrir, attente)
  attente = Math.min(attente * 2, 30000)
}

export function connecter(jeton) {
  if (jeton === jetonActuel && socket) return
  deconnecter()
  jetonActuel = jeton
  attente = 1000
  ouvrir()
}

export function deconnecter() {
  jetonActuel = null
  clearTimeout(minuteurReconnexion)
  if (socket) {
    socket.onclose = null
    socket.close()
    socket = null
  }
  etatTempsReel.connecte = false
}

export function envoyer(objet) {
  if (socket && etatTempsReel.connecte) socket.send(JSON.stringify(objet))
}

export function ecouter(type, fonction) {
  if (!abonnes.has(type)) abonnes.set(type, new Set())
  abonnes.get(type).add(fonction)
  return () => abonnes.get(type).delete(fonction)
}

export function estConnecte() {
  return etatTempsReel.connecte
}
