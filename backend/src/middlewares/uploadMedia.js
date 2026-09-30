// ============================================================
// Réception des médias : photo de profil, photo ou message vocal
// envoyés dans la messagerie
// ------------------------------------------------------------
// Le fichier reste en mémoire (il part ensuite vers le stockage,
// voir stockageService.js). Comme pour les justificatifs, le type
// annoncé par le navigateur ne suffit pas : on vérifie aussi les
// premiers octets du fichier (sa « signature »).
// Résultat : req.fichier = { contenu, type, extension, categorie }
// ============================================================
import multer from 'multer'
import { ErreurApi } from './errorHandler.js'

const Mo = 1024 * 1024

// Types acceptés : extension, catégorie et test de la signature
const TYPES = {
  'image/jpeg': { extension: '.jpg', categorie: 'image', signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { extension: '.png', categorie: 'image', signature: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { extension: '.webp', categorie: 'image', signature: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  // Messages vocaux enregistrés par le navigateur (MediaRecorder) :
  // WebM (Chrome, Edge, Firefox), Ogg (anciens Firefox), MP4 (Safari)
  'audio/webm': { extension: '.webm', categorie: 'vocal', signature: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
  'audio/ogg': { extension: '.ogg', categorie: 'vocal', signature: (b) => b.toString('ascii', 0, 4) === 'OggS' },
  'audio/mp4': { extension: '.m4a', categorie: 'vocal', signature: (b) => b.toString('ascii', 4, 8) === 'ftyp' }
}

// « audio/webm;codecs=opus » -> « audio/webm »
function typeSimple(type) {
  return String(type || '').split(';')[0].trim().toLowerCase()
}

// Fabrique un middleware pour un champ de formulaire donné
// categories : ['image'] ou ['image', 'vocal'] ; tailles : { image, vocal } en octets
function fabriquer({ champ, categories, tailles, messageTypes }) {
  const tailleMax = Math.max(...categories.map((c) => tailles[c]))
  const envoi = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: tailleMax, files: 1, fields: 5 },
    fileFilter: function (req, fichier, suite) {
      const infos = TYPES[typeSimple(fichier.mimetype)]
      if (!infos || !categories.includes(infos.categorie)) return suite(new ErreurApi(400, messageTypes))
      suite(null, true)
    }
  }).single(champ)

  return function (req, res, next) {
    envoi(req, res, function (erreur) {
      if (erreur) {
        if (erreur.name === 'MulterError' && erreur.code === 'LIMIT_FILE_SIZE') {
          return next(new ErreurApi(400, `Fichier trop volumineux (${Math.round(tailleMax / Mo)} Mo maximum).`))
        }
        return next(erreur.name === 'MulterError' ? new ErreurApi(400, 'Envoi de fichier invalide.') : erreur)
      }
      if (!req.file) return next(new ErreurApi(400, 'Aucun fichier reçu.'))
      const type = typeSimple(req.file.mimetype)
      const infos = TYPES[type]
      if (req.file.size > tailles[infos.categorie]) {
        return next(new ErreurApi(400, `Fichier trop volumineux (${Math.round(tailles[infos.categorie] / Mo)} Mo maximum).`))
      }
      if (req.file.size < 12 || !infos.signature(req.file.buffer)) {
        return next(new ErreurApi(400, 'Le contenu du fichier ne correspond pas à son type.'))
      }
      req.fichier = { contenu: req.file.buffer, type, extension: infos.extension, categorie: infos.categorie }
      next()
    })
  }
}

// Photo de profil : JPEG, PNG ou WebP, 2 Mo maximum (RG02.19).
// Le navigateur la recadre et la réduit avant l'envoi.
export const uploadPhotoProfil = fabriquer({
  champ: 'photo',
  categories: ['image'],
  tailles: { image: 2 * Mo },
  messageTypes: 'Photo de profil : formats JPEG, PNG ou WebP uniquement.'
})

// Pièce jointe d'un message : photo (5 Mo) ou vocal (3 Mo) (RG09.6, RG09.7)
export const uploadPieceJointe = fabriquer({
  champ: 'fichier',
  categories: ['image', 'vocal'],
  tailles: { image: 5 * Mo, vocal: 3 * Mo },
  messageTypes: 'Seules les photos (JPEG, PNG, WebP) et les messages vocaux sont acceptés.'
})
