// ============================================================
// Réception des justificatifs (pièce d'identité + permis)
// ------------------------------------------------------------
// RG08.1 : PDF, JPEG ou PNG, 5 Mo maximum par fichier.
// RG08.4 : rangés dans backend/uploads/justificatifs, un dossier
//          qui n'est PAS servi publiquement, sous un nom aléatoire
//          (le nom d'origine du fichier n'est jamais réutilisé).
// Le type annoncé par le navigateur peut mentir : on vérifie
// aussi les premiers octets du fichier (sa "signature").
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import multer from 'multer'
import { ErreurApi } from './errorHandler.js'

export const DOSSIER_JUSTIFICATIFS = path.resolve(import.meta.dirname, '../../uploads/justificatifs')
fs.mkdirSync(DOSSIER_JUSTIFICATIFS, { recursive: true })

const EXTENSIONS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png'
}

// Premiers octets attendus pour chaque type de fichier
const SIGNATURES = {
  '.pdf': Buffer.from('%PDF-'),
  '.jpg': Buffer.from([0xff, 0xd8, 0xff]),
  '.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
}

const stockage = multer.diskStorage({
  destination: DOSSIER_JUSTIFICATIFS,
  filename: function (req, fichier, suite) {
    // 32 caractères aléatoires + l'extension correspondant au type
    suite(null, crypto.randomBytes(16).toString('hex') + EXTENSIONS[fichier.mimetype])
  }
})

const envoi = multer({
  storage: stockage,
  limits: { fileSize: 5 * 1024 * 1024, files: 2, fields: 10 },
  fileFilter: function (req, fichier, suite) {
    if (!EXTENSIONS[fichier.mimetype]) {
      return suite(new ErreurApi(400, 'Seuls les fichiers PDF, JPEG et PNG sont acceptés.'))
    }
    suite(null, true)
  }
}).fields([
  { name: 'pieceIdentite', maxCount: 1 },
  { name: 'permis', maxCount: 1 }
])

// Supprime les fichiers reçus (en cas d'erreur)
export function supprimerFichiersRecus(req) {
  for (const liste of Object.values(req.files || {})) {
    for (const f of liste) fs.rm(f.path, { force: true }, () => {})
  }
}

// Le contenu du fichier correspond-il à son extension ?
function signatureValide(fichier) {
  const attendu = SIGNATURES[path.extname(fichier.filename)]
  const debut = Buffer.alloc(attendu.length)
  const descripteur = fs.openSync(fichier.path, 'r')
  fs.readSync(descripteur, debut, 0, attendu.length, 0)
  fs.closeSync(descripteur)
  return debut.equals(attendu)
}

export function uploadJustificatifs(req, res, next) {
  envoi(req, res, function (erreur) {
    if (erreur) {
      supprimerFichiersRecus(req)
      return next(erreur)
    }
    const identite = req.files && req.files.pieceIdentite && req.files.pieceIdentite[0]
    const permis = req.files && req.files.permis && req.files.permis[0]
    if (!identite || !permis) {
      supprimerFichiersRecus(req)
      return next(new ErreurApi(400, 'La pièce d’identité et le permis de conduire sont obligatoires.'))
    }
    if (!signatureValide(identite) || !signatureValide(permis)) {
      supprimerFichiersRecus(req)
      return next(new ErreurApi(400, 'Le contenu d’un fichier ne correspond pas à son type.'))
    }
    next()
  })
}
