// ============================================================
// Gestion centrale des erreurs
// ------------------------------------------------------------
// Toutes les erreurs arrivent ici. Le client reçoit un message
// clair en français, SANS détail technique : ni requête SQL, ni
// nom de table, ni pile d'appels (RG13.8). Le détail complet
// reste dans la console du serveur.
// ============================================================

// Erreur "prévue" lancée par un service : on connaît le code HTTP
// et le message à renvoyer. Exemple : throw new ErreurApi(404, 'Trajet introuvable.')
export class ErreurApi extends Error {
  constructor(statut, message, details = null) {
    super(message)
    this.statut = statut
    this.details = details
  }
}

// Messages lisibles pour les doublons (index UNIQUE de la base)
const MESSAGES_DOUBLONS = {
  uk_utilisateur_email: 'Un compte existe déjà avec cet email.',
  uk_admin_email: 'Un compte existe déjà avec cet email.',
  uk_vehicule_immatriculation: 'Cette immatriculation est déjà enregistrée.',
  uk_trajet_conducteur_horaire: 'Vous avez déjà un trajet à cette date et à cette heure.',
  uk_reservation_active: 'Vous avez déjà une réservation active sur ce trajet.',
  uk_paiement_reservation: 'Cette réservation a déjà un paiement.',
  uk_avis_auteur_trajet: 'Vous avez déjà laissé un avis sur ce trajet.',
  uk_demande_une_en_attente: 'Vous avez déjà une demande en cours d’examen.',
  uk_litige_un_en_cours: 'Un litige est déjà en cours sur cette réservation.',
  uk_alerte_doublon: 'Vous avez déjà une alerte identique.',
  PRIMARY: 'Cet élément existe déjà.'
}

// Messages lisibles pour les contraintes CHECK de la base
const MESSAGES_CONTRAINTES = {
  ck_util_email: 'Adresse email invalide.',
  ck_util_telephone: 'Numéro de téléphone invalide.',
  ck_trajet_lieux: 'Le départ et l’arrivée doivent être différents.',
  ck_trajet_prix: 'Le prix par place doit être compris entre 1 € et 10 €.',
  ck_trajet_places: 'Un trajet propose de 1 à 6 places.',
  ck_trajet_recurrence: 'Un trajet régulier doit avoir au moins un jour.',
  ck_vehicule_immat: 'Immatriculation invalide (format AA-123-AA).',
  ck_vehicule_places: 'Un véhicule a de 1 à 8 places passagers.',
  ck_avis_note: 'La note doit être comprise entre 1 et 5.',
  ck_avis_commentaire: 'Le commentaire doit contenir au moins 10 caractères.',
  ck_alerte_heures: 'L’heure minimum doit être avant l’heure maximum.',
  ck_alerte_lieux: 'Le départ et l’arrivée doivent être différents.',
  ck_demande_motif: 'Un refus doit être motivé.'
}

// Traduit une erreur MariaDB en réponse { statut, message }
function traduireErreurBase(erreur) {
  // SIGNAL SQLSTATE '45000' d'un trigger : c'est une règle de gestion,
  // son message est déjà écrit pour l'utilisateur (ex. « … (RG05.3). »)
  if (erreur.sqlState === '45000') {
    return { statut: 409, message: erreur.text }
  }
  if (erreur.errno === 1062) {
    const index = (erreur.text.match(/for key '(?:[^.']*\.)?([^']+)'/) || [])[1]
    return { statut: 409, message: MESSAGES_DOUBLONS[index] || 'Cette donnée existe déjà.' }
  }
  if (erreur.errno === 4025) {
    const contrainte = (erreur.text.match(/CONSTRAINT `([^`]+)`/) || [])[1]
    return { statut: 400, message: MESSAGES_CONTRAINTES[contrainte] || 'Une donnée envoyée n’est pas valide.' }
  }
  if (erreur.errno === 1452) {
    return { statut: 400, message: 'Un élément lié est introuvable (commune, trajet, utilisateur…).' }
  }
  if (erreur.errno === 1265 || erreur.errno === 1366) {
    return { statut: 400, message: 'Une valeur envoyée n’est pas autorisée.' }
  }
  return null
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(erreur, req, res, next) {
  // 1. Erreur prévue par un service ou un middleware
  if (erreur instanceof ErreurApi) {
    const corps = { erreur: erreur.message }
    if (erreur.details) corps.details = erreur.details
    return res.status(erreur.statut).json(corps)
  }

  // 2. JSON mal formé ou trop gros
  if (erreur.type === 'entity.parse.failed') {
    return res.status(400).json({ erreur: 'Le corps de la requête n’est pas un JSON valide.' })
  }
  if (erreur.type === 'entity.too.large') {
    return res.status(413).json({ erreur: 'La requête est trop volumineuse.' })
  }

  // 3. Fichier refusé par multer (taille, nombre de fichiers)
  if (erreur.name === 'MulterError') {
    const message = erreur.code === 'LIMIT_FILE_SIZE'
      ? 'Chaque fichier doit faire 5 Mo au maximum.'
      : 'Envoi de fichiers invalide.'
    return res.status(400).json({ erreur: message })
  }

  // 4. Erreur de la base (règle de gestion, doublon, contrainte…)
  if (erreur.sqlState) {
    const traduction = traduireErreurBase(erreur)
    if (traduction) {
      return res.status(traduction.statut).json({ erreur: traduction.message })
    }
  }

  // 5. Erreur imprévue : on la note côté serveur, le client reçoit un message neutre
  console.error('[erreur]', req.method, req.originalUrl, erreur)
  res.status(500).json({ erreur: 'Une erreur interne est survenue. Réessayez plus tard.' })
}
