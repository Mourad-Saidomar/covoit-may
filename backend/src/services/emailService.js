// ============================================================
// Service EMAIL : envoi des codes de vérification
// ------------------------------------------------------------
// Envoi par SMTP avec nodemailer. Réglages dans .env :
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM
// Sans SMTP_HOST (développement), l'email n'est pas envoyé : il est
// affiché dans la console du serveur, code compris.
// ============================================================
import nodemailer from 'nodemailer'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM } = process.env
export const MODE = SMTP_HOST ? 'smtp' : 'console'

const transport = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      // 465 : connexion chiffrée dès le départ ; 587 : chiffrement négocié (STARTTLS)
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined
    })
  : null

const EXPEDITEUR = MAIL_FROM || "Covoit'May <no-reply@covoitmay.local>"

const OBJETS = {
  inscription: {
    sujet: 'Votre code de vérification',
    titre: 'Confirmez votre adresse email',
    texte: 'Bienvenue sur Covoit’May ! Pour activer votre compte, saisissez ce code sur le site :'
  },
  mot_de_passe: {
    sujet: 'Réinitialisation de votre mot de passe',
    titre: 'Mot de passe oublié',
    texte: 'Vous avez demandé à réinitialiser votre mot de passe. Saisissez ce code sur le site :'
  }
}

// Email HTML simple : les messageries n'acceptent que des styles en ligne
function html({ prenom, titre, texte, code, minutes }) {
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#fffdf5;font-family:Segoe UI,Arial,sans-serif;color:#2d4038">
  <table role="presentation" width="100%" style="max-width:520px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4dfcf">
    <tr><td style="background:#2d6c58;padding:20px 28px;font-size:22px;font-weight:800;color:#ffffff">Covoit'<span style="color:#f57b57">May</span></td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 12px;font-size:20px;color:#1f4d3e">${titre}</h1>
      <p style="margin:0 0 20px;line-height:1.5">Bonjour ${prenom},<br>${texte}</p>
      <p style="margin:0 0 20px;text-align:center"><span style="display:inline-block;padding:14px 24px;border-radius:10px;background:#e8f2e9;font-size:32px;font-weight:800;letter-spacing:8px;color:#1f4d3e">${code}</span></p>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7b73">Ce code est valable ${minutes} minutes. Ne le communiquez à personne : l’équipe Covoit’May ne vous le demandera jamais.</p>
      <p style="margin:0;font-size:14px;color:#6b7b73">Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email.</p>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#fbf7ee;font-size:12px;color:#6b7b73">Covoit’May · le covoiturage local à Mayotte</td></tr>
  </table></body></html>`
}

// Envoie un code à 6 chiffres. objet : 'inscription' ou 'mot_de_passe'
export async function envoyerCode({ email, prenom, code, objet, minutes }) {
  const modele = OBJETS[objet]
  const texte = `Bonjour ${prenom},\n\n${modele.texte}\n\n    ${code}\n\nCe code est valable ${minutes} minutes. Ne le communiquez à personne.\n` +
    'Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.\n\nCovoit’May'
  if (!transport) {
    console.log(`\n[email non envoyé : SMTP non configuré] À : ${email} · ${modele.sujet}\n  >>> CODE : ${code} <<<\n`)
    return
  }
  await transport.sendMail({
    from: EXPEDITEUR,
    to: email,
    subject: `${code} · ${modele.sujet} · Covoit'May`,
    text: texte,
    html: html({ prenom, titre: modele.titre, texte: modele.texte, code, minutes })
  })
}

// Message du formulaire de contact, envoyé à l'équipe (CONTACT_EMAIL,
// sinon l'adresse SMTP_USER). « Répondre » dans la messagerie écrit
// directement à la personne (replyTo).
// Volontairement en texte brut : le contenu tapé par un visiteur n'est
// jamais interprété comme du HTML. Et aucun accusé de réception n'est
// envoyé au visiteur : sinon n'importe qui pourrait faire envoyer des
// emails par Covoit'May à l'adresse de son choix.
export async function envoyerMessageContact({ nom, email, sujet, message, idUtilisateur }) {
  const texte = `Nouveau message depuis le formulaire de contact\n\n` +
    `De : ${nom} <${email}>\n` +
    `Compte : ${idUtilisateur ? 'membre n° ' + idUtilisateur : 'visiteur (non connecté)'}\n` +
    `Sujet : ${sujet}\n\n${message}\n`
  if (!transport) {
    console.log(`\n[email non envoyé : SMTP non configuré] Formulaire de contact\n${texte}`)
    return
  }
  await transport.sendMail({
    from: EXPEDITEUR,
    to: process.env.CONTACT_EMAIL || SMTP_USER,
    replyTo: { name: nom, address: email },
    subject: `[Contact] ${sujet} · ${nom}`,
    text: texte
  })
}

// Vérifie la connexion au serveur SMTP (script de test)
export async function verifierConnexion() {
  if (!transport) return false
  await transport.verify()
  return true
}
