// ============================================================
// Covoit'May : serveur de l'API REST
// ------------------------------------------------------------
// Ordre de passage d'une requête :
//   sécurité (helmet, CORS, limite) -> lecture du JSON -> journal
//   -> route -> middlewares de la route (connexion, rôle,
//   validation) -> contrôleur -> service -> modèle -> MariaDB
// Toute erreur finit dans errorHandler.
//
// Lancer : npm run dev   (dossier backend, fichier .env rempli)
// ============================================================
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { verifierConnexion } from './config/db.js'
import { requestLogger } from './middlewares/requestLogger.js'
import { limiteurApi } from './middlewares/limiteurs.js'
import { notFound } from './middlewares/notFound.js'
import { errorHandler } from './middlewares/errorHandler.js'
import authRoutes from './routes/auth.routes.js'
import communeRoutes from './routes/commune.routes.js'
import utilisateurRoutes from './routes/utilisateur.routes.js'
import vehiculeRoutes from './routes/vehicule.routes.js'
import demandeConducteurRoutes from './routes/demandeConducteur.routes.js'
import trajetRoutes from './routes/trajet.routes.js'
import reservationRoutes from './routes/reservation.routes.js'
import paiementRoutes from './routes/paiement.routes.js'
import avisRoutes from './routes/avis.routes.js'
import messageRoutes from './routes/message.routes.js'
import litigeRoutes from './routes/litige.routes.js'
import alerteRoutes from './routes/alerte.routes.js'
import favoriRoutes from './routes/favori.routes.js'
import adminRoutes from './routes/admin.routes.js'
import parametreRoutes from './routes/parametre.routes.js'
import documentRoutes from './routes/document.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import contactRoutes from './routes/contact.routes.js'
import * as tempsReel from './tempsReel.js'
import { MODE as MODE_EMAIL } from './services/emailService.js'
import { purgerCodes } from './models/codeModel.js'
import { MODE as MODE_STOCKAGE } from './services/stockageService.js'
import { cloturerTrajetsPasses } from './models/trajetModel.js'
import { purgerJustificatifs } from './services/demandeConducteurService.js'

// ---------- Configuration obligatoire (RG13.10) ----------
// Sans clé JWT solide, le serveur refuse de démarrer.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET manquant ou trop court (32 caractères minimum) : complétez le fichier .env')
  process.exit(1)
}
if (!process.env.DB_USER) {
  console.error('DB_USER manquant : complétez le fichier .env')
  process.exit(1)
}

const PORT = Number(process.env.PORT || 3000)
// Adresse d'écoute imposée par certains hébergeurs (ex. alwaysdata) ;
// absente en local : on écoute alors sur toutes les adresses.
const HOTE = process.env.IP
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const app = express()

// En production, un proxy (hébergeur, Nginx) reçoit les requêtes à la place
// de l'API : on lui fait confiance pour transmettre la vraie adresse IP du
// visiteur, sinon la limite par IP (RG13.6) bloquerait tout le monde d'un coup.
// Jamais en local : un visiteur pourrait inventer son adresse IP.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY))
}

// ---------- Sécurité HTTP (RG13.7) ----------
app.use(helmet())                                   // en-têtes de sécurité
// Seul le frontend peut appeler l'API. Il peut lire le nom des PDF téléchargés.
app.use(cors({ origin: FRONTEND_URL.split(','), exposedHeaders: ['Content-Disposition'] }))
app.use(express.json({ limit: '100kb' }))           // corps JSON limité (RG13.11)
app.use(requestLogger)
app.use('/api', limiteurApi)                        // RG13.6

// ---------- Routes ----------
app.get('/api/sante', function (req, res) {
  res.json({ statut: 'ok', service: 'Covoit’May API' })
})
app.use('/api/auth', authRoutes)
app.use('/api/communes', communeRoutes)
app.use('/api/parametres', parametreRoutes)
app.use('/api/utilisateurs', utilisateurRoutes)
app.use('/api/vehicules', vehiculeRoutes)
app.use('/api/demandes-conducteur', demandeConducteurRoutes)
app.use('/api/trajets', trajetRoutes)
app.use('/api/reservations', reservationRoutes)
app.use('/api/paiements', paiementRoutes)
app.use('/api/avis', avisRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/litiges', litigeRoutes)
app.use('/api/alertes', alerteRoutes)
app.use('/api/favoris', favoriRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/contact', contactRoutes)

// ---------- Fin de chaîne ----------
app.use(notFound)
app.use(errorHandler)

// ---------- Tâches automatiques ----------
// Toutes les 15 minutes : clôture des trajets passés (RG04.16, RG05.11)
// Tous les jours : effacement des justificatifs expirés (RG08.8)
async function lancerTache(nom, tache) {
  try {
    await tache()
  } catch (erreur) {
    console.error(`[tâche ${nom}]`, erreur.message)
  }
}

async function demarrer() {
  try {
    await verifierConnexion()
  } catch (erreur) {
    console.error('Impossible de se connecter à MariaDB :', erreur.message)
    process.exit(1)
  }
  await lancerTache('clôture', cloturerTrajetsPasses)
  await lancerTache('justificatifs', purgerJustificatifs)
  setInterval(() => lancerTache('clôture', cloturerTrajetsPasses), 15 * 60 * 1000)
  setInterval(() => lancerTache('justificatifs', purgerJustificatifs), 24 * 60 * 60 * 1000)
  // Codes de vérification de plus de 7 jours : effacés (minimisation, RGPD)
  setInterval(() => lancerTache('codes', purgerCodes), 24 * 60 * 60 * 1000)

  const pret = function () {
    console.log(`API Covoit'May prête sur le port ${PORT} (/api), stockage des médias : ${MODE_STOCKAGE === 'b2' ? 'Backblaze B2' : 'dossier local'}, ` +
      `emails : ${MODE_EMAIL === 'smtp' ? 'SMTP' : 'affichés dans la console'}, temps réel : /api/temps-reel`)
  }
  const serveur = HOTE ? app.listen(PORT, HOTE, pret) : app.listen(PORT, pret)
  // Le temps réel (WebSocket) partage le port de l'API
  tempsReel.demarrer(serveur, FRONTEND_URL.split(','))
}

demarrer()
