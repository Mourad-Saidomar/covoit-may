// ============================================================
// Temps réel : connexion WebSocket entre le site et l'API
// ------------------------------------------------------------
// Une requête HTTP classique ne part que du navigateur. Une
// WebSocket reste ouverte : le serveur peut prévenir le navigateur
// tout de suite (nouveau message, message lu, « en train d'écrire »,
// nouveau trajet pour une alerte…).
//
// Adresse : /api/temps-reel. Sécurité :
// - seule l'adresse du site (FRONTEND_URL) peut s'y connecter ;
// - le premier message doit être { type: 'auth', jeton } : le jeton
//   n'est pas mis dans l'adresse (il apparaîtrait dans les journaux) ;
// - le compte est revérifié toutes les 4 minutes environ (suspension,
//   jeton expiré) ; les messages reçus sont petits (4 Ko au plus).
// Si la connexion est impossible, le site interroge l'API à intervalle
// régulier : rien ne dépend uniquement du temps réel.
// ============================================================
import { WebSocketServer } from 'ws'
import { verifierJeton } from './middlewares/authentifier.js'
import * as reservationModel from './models/reservationModel.js'
import * as messageModel from './models/messageModel.js'

// id de la personne -> ses connexions ouvertes (plusieurs onglets possibles)
const connexions = new Map()

const BATTEMENT_MS = 25000
const REVERIFICATION_TOUS_LES = 10 // battements (≈ 4 minutes)
const DELAI_AUTH_MS = 10000
const DELAI_ECRIT_MS = 1500

// ---------- Envoi vers une personne ----------

export function envoyerA(idUtilisateur, evenement) {
  const liste = connexions.get(Number(idUtilisateur))
  if (!liste) return
  const texte = JSON.stringify(evenement)
  for (const ws of liste) {
    if (ws.readyState === ws.OPEN) ws.send(texte)
  }
}

export function estConnecte(idUtilisateur) {
  const liste = connexions.get(Number(idUtilisateur))
  return Boolean(liste && liste.size)
}

function ajouter(ws) {
  if (!connexions.has(ws.idUtilisateur)) connexions.set(ws.idUtilisateur, new Set())
  connexions.get(ws.idUtilisateur).add(ws)
}

function retirer(ws) {
  const liste = connexions.get(ws.idUtilisateur)
  if (!liste) return
  liste.delete(ws)
  if (!liste.size) connexions.delete(ws.idUtilisateur)
}

// ---------- Messages reçus du navigateur ----------

async function authentifier(ws, jeton) {
  try {
    const utilisateur = await verifierJeton(jeton)
    // Le temps réel sert à la messagerie et aux alertes : membres uniquement
    if (utilisateur.role === 'admin') return ws.close(4003, 'Réservé aux membres')
    ws.idUtilisateur = utilisateur.id
    ws.jeton = jeton
    ajouter(ws)
    ws.send(JSON.stringify({ type: 'pret' }))
    // Connecté : les messages en attente sont « reçus » (RG09.9)
    const expediteurs = await messageModel.marquerRecus(utilisateur.id)
    for (const id of expediteurs) envoyerA(id, { type: 'recus', par: utilisateur.id })
  } catch {
    ws.close(4001, 'Session invalide')
  }
}

// « En train d'écrire » : seulement vers une personne liée par une
// réservation (RG09.1), et pas plus d'un signal toutes les 1,5 s
async function signalerEcriture(ws, idAutre) {
  if (!Number.isInteger(idAutre) || idAutre === ws.idUtilisateur) return
  const maintenant = Date.now()
  if (ws.dernierEcrit && maintenant - ws.dernierEcrit < DELAI_ECRIT_MS) return
  ws.dernierEcrit = maintenant
  ws.liens = ws.liens || new Map()
  if (!ws.liens.has(idAutre)) ws.liens.set(idAutre, await reservationModel.sontLies(ws.idUtilisateur, idAutre))
  if (ws.liens.get(idAutre)) envoyerA(idAutre, { type: 'ecrit', de: ws.idUtilisateur })
}

// ---------- Démarrage, attaché au serveur HTTP de l'API ----------

export function demarrer(serveur, originesAutorisees) {
  const wss = new WebSocketServer({ server: serveur, path: '/api/temps-reel', maxPayload: 4096 })

  wss.on('connection', function (ws, req) {
    const origine = req.headers.origin
    if (origine && !originesAutorisees.includes(origine)) {
      ws.close(4003, 'Origine refusée')
      return
    }
    ws.enVie = true
    ws.battements = 0
    ws.on('pong', () => { ws.enVie = true })
    const delai = setTimeout(() => { if (!ws.idUtilisateur) ws.close(4001, 'Authentification attendue') }, DELAI_AUTH_MS)

    ws.on('message', function (brut) {
      let message
      try {
        message = JSON.parse(brut)
      } catch {
        return
      }
      if (message.type === 'auth' && !ws.idUtilisateur && typeof message.jeton === 'string') {
        authentifier(ws, message.jeton)
      } else if (message.type === 'ecrit' && ws.idUtilisateur) {
        signalerEcriture(ws, Number(message.avec)).catch(() => {})
      }
    })
    ws.on('close', () => {
      clearTimeout(delai)
      if (ws.idUtilisateur) retirer(ws)
    })
    ws.on('error', () => {})
  })

  // Battement de cœur : une connexion qui ne répond plus est fermée ;
  // de temps en temps, on revérifie le compte (suspendu, jeton expiré)
  const battement = setInterval(function () {
    for (const ws of wss.clients) {
      if (!ws.enVie) {
        ws.terminate()
        continue
      }
      ws.enVie = false
      ws.ping()
      ws.battements++
      if (ws.idUtilisateur && ws.battements % REVERIFICATION_TOUS_LES === 0) {
        verifierJeton(ws.jeton).catch(() => ws.close(4001, 'Session expirée'))
      }
    }
  }, BATTEMENT_MS)
  wss.on('close', () => clearInterval(battement))
  return wss
}
