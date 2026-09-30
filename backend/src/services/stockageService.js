// ============================================================
// Service STOCKAGE : photos de profil, photos et vocaux envoyés
// dans la messagerie
// ------------------------------------------------------------
// Deux modes, choisis au démarrage :
// - « b2 » : Backblaze B2, dans un bucket PRIVÉ, par son API
//   compatible S3. Les requêtes sont signées (AWS Signature v4)
//   avec aws4fetch, une petite bibliothèque sans dépendance.
//   Utilisé en production (l'hébergement gratuit n'a que 100 Mo).
// - « local » : un dossier du serveur (backend/uploads/medias),
//   non servi publiquement. Utilisé en développement, quand les
//   variables B2_… ne sont pas remplies.
// Les fichiers ne sont jamais servis directement : l'API les lit
// ici après avoir vérifié les droits de la personne.
// ============================================================
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { AwsClient } from 'aws4fetch'

const DOSSIER_LOCAL = path.resolve(import.meta.dirname, '../../uploads/medias')

// Type de chaque extension (mode local, et en secours)
export const TYPES_PAR_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4'
}

const { B2_S3_ENDPOINT, B2_BUCKET_MEDIAS, B2_KEY_ID, B2_APPLICATION_KEY } = process.env
export const MODE = B2_S3_ENDPOINT && B2_BUCKET_MEDIAS && B2_KEY_ID && B2_APPLICATION_KEY ? 'b2' : 'local'

let client = null
let urlBucket = ''
if (MODE === 'b2') {
  // La région est dans l'adresse : https://s3.eu-central-003.backblazeb2.com
  const region = (B2_S3_ENDPOINT.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/) || [])[1] || 'us-east-1'
  client = new AwsClient({ accessKeyId: B2_KEY_ID, secretAccessKey: B2_APPLICATION_KEY, service: 's3', region })
  urlBucket = B2_S3_ENDPOINT.replace(/\/+$/, '') + '/' + B2_BUCKET_MEDIAS
}

// Une clé de stockage ne contient que des caractères sûrs : elle est
// fabriquée par l'API (jamais par le client), mais on vérifie quand même.
function verifierCle(cle) {
  if (typeof cle !== 'string' || !/^[a-z0-9]+(\/[a-z0-9-]+)*\/[a-f0-9]{32}\.[a-z0-9]{2,4}$/.test(cle)) {
    throw new Error('Clé de stockage invalide : ' + cle)
  }
  return cle
}

// Nouvelle clé aléatoire, ex. « photos/12/9f3c…e1.jpg »
export function nouvelleCle(dossier, extension) {
  return verifierCle(`${dossier}/${crypto.randomBytes(16).toString('hex')}${extension}`)
}

// ---------- Backblaze B2 (API S3) ----------
async function requeteB2(methode, cle, options = {}) {
  const corps = options.corps
  const entetes = { ...(options.entetes || {}) }
  // Empreinte SHA-256 du contenu, exigée par la signature S3
  entetes['X-Amz-Content-Sha256'] = crypto.createHash('sha256').update(corps || '').digest('hex')
  const reponse = await client.fetch(`${urlBucket}/${cle}`, { method: methode, headers: entetes, body: corps })
  if (!reponse.ok && reponse.status !== 404) {
    const detail = await reponse.text().catch(() => '')
    throw new Error(`Stockage B2 : ${methode} ${cle} -> ${reponse.status} ${detail.slice(0, 200)}`)
  }
  return reponse
}

// ---------- Fonctions utilisées par les services ----------

export async function enregistrer(cle, contenu, type) {
  verifierCle(cle)
  if (MODE === 'b2') {
    await requeteB2('PUT', cle, { corps: contenu, entetes: { 'Content-Type': type } })
    return
  }
  const chemin = path.join(DOSSIER_LOCAL, cle)
  await fs.mkdir(path.dirname(chemin), { recursive: true })
  await fs.writeFile(chemin, contenu)
}

// Renvoie { contenu, type } ou null si le fichier n'existe pas
export async function lire(cle) {
  verifierCle(cle)
  if (MODE === 'b2') {
    const reponse = await requeteB2('GET', cle)
    if (reponse.status === 404) return null
    return {
      contenu: Buffer.from(await reponse.arrayBuffer()),
      type: reponse.headers.get('content-type') || TYPES_PAR_EXTENSION[path.extname(cle)]
    }
  }
  try {
    const contenu = await fs.readFile(path.join(DOSSIER_LOCAL, cle))
    return { contenu, type: TYPES_PAR_EXTENSION[path.extname(cle)] || 'application/octet-stream' }
  } catch (erreur) {
    if (erreur.code === 'ENOENT') return null
    throw erreur
  }
}

// Supprime un fichier (sans erreur s'il n'existe plus)
export async function supprimer(cle) {
  if (!cle) return
  verifierCle(cle)
  if (MODE === 'b2') {
    await requeteB2('DELETE', cle)
    return
  }
  await fs.rm(path.join(DOSSIER_LOCAL, cle), { force: true })
}

// Suppression « au mieux » : un échec est noté mais ne bloque pas l'action
export async function supprimerSansErreur(cle) {
  try {
    await supprimer(cle)
  } catch (erreur) {
    console.error('[stockage]', erreur.message)
  }
}
