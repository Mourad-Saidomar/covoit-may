// ============================================================
// Limitation du nombre de requêtes par adresse IP (RG13.6)
// ------------------------------------------------------------
// Freine les robots qui essaient des milliers de mots de passe
// ou qui saturent le serveur. Au-delà de la limite : erreur 429.
// ============================================================
import rateLimit from 'express-rate-limit'

const QUINZE_MINUTES = 15 * 60 * 1000

// Toute l'API : 300 requêtes par quart d'heure et par IP
export const limiteurApi = rateLimit({
  windowMs: QUINZE_MINUTES,
  limit: Number(process.env.LIMITE_REQUETES || 300),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { erreur: 'Trop de requêtes. Réessayez dans quelques minutes.' }
})

// Connexion et inscription : 10 essais par quart d'heure et par IP
export const limiteurConnexion = rateLimit({
  windowMs: QUINZE_MINUTES,
  limit: Number(process.env.LIMITE_CONNEXIONS || 10),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { erreur: 'Trop de tentatives. Réessayez dans 15 minutes.' }
})
