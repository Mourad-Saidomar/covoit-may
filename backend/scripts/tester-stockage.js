// ============================================================
// Vérifie la connexion au stockage des médias
// ------------------------------------------------------------
// Lancer (dossier backend) :  npm run test:stockage
// Envoie un petit fichier, le relit puis le supprime. Affiche le
// mode utilisé : « b2 » si les variables B2_… du .env sont remplies,
// sinon « local ».
// ============================================================
import * as stockage from '../src/services/stockageService.js'

const contenu = Buffer.from('Test Covoit\'May ' + new Date().toISOString())
const cle = stockage.nouvelleCle('tests', '.png')

try {
  console.log('Mode de stockage :', stockage.MODE === 'b2' ? 'Backblaze B2' : 'dossier local (variables B2_… absentes)')
  await stockage.enregistrer(cle, contenu, 'image/png')
  console.log('1. Envoi      : OK', cle)
  const relu = await stockage.lire(cle)
  if (!relu || !relu.contenu.equals(contenu)) throw new Error('le fichier relu ne correspond pas')
  console.log('2. Lecture    : OK')
  await stockage.supprimer(cle)
  if (await stockage.lire(cle)) throw new Error('le fichier existe encore après suppression')
  console.log('3. Suppression : OK')
  console.log('Le stockage fonctionne.')
} catch (erreur) {
  console.error('ÉCHEC :', erreur.message)
  process.exit(1)
}
