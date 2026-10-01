// ============================================================
// Vérifie l'envoi des emails (codes de vérification)
// ------------------------------------------------------------
// Lancer (dossier backend) :  npm run test:email -- ton.adresse@exemple.fr
// Se connecte au serveur SMTP du .env, puis envoie un faux code
// à l'adresse donnée. Sans SMTP_HOST, l'email est affiché ici.
// ============================================================
import * as emailService from '../src/services/emailService.js'

const destinataire = process.argv[2]
if (!destinataire) {
  console.error('Indiquez une adresse : npm run test:email -- vous@exemple.fr')
  process.exit(1)
}

try {
  console.log('Mode :', emailService.MODE === 'smtp' ? 'SMTP (' + process.env.SMTP_HOST + ')' : 'console (SMTP_HOST absent)')
  if (emailService.MODE === 'smtp') {
    await emailService.verifierConnexion()
    console.log('1. Connexion au serveur SMTP : OK')
  }
  await emailService.envoyerCode({ email: destinataire, prenom: 'Test', code: '123456', objet: 'inscription', minutes: 10 })
  console.log('2. Email envoyé à', destinataire, ': vérifiez la boîte de réception (et les indésirables).')
} catch (erreur) {
  console.error('ÉCHEC :', erreur.message)
  process.exit(1)
}
