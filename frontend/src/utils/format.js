// ============================================================
// Petites fonctions utiles pour afficher les dates et les prix
// ============================================================

// Transforme une date reçue de l'API en objet Date.
// MariaDB envoie "2026-09-28 17:30:00" : on remplace l'espace par
// un "T" pour que tous les navigateurs la lisent en heure locale.
export function versDate(texteDate) {
  if (texteDate instanceof Date) return texteDate
  if (typeof texteDate === 'string' && /^\d{4}-\d{2}-\d{2} \d/.test(texteDate)) {
    return new Date(texteDate.replace(' ', 'T'))
  }
  return new Date(texteDate)
}

// Affiche une date courte, exemple : "lun. 8 sept."
export function formatDate(texteDate) {
  if (!texteDate) return '—'
  return versDate(texteDate).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

// Affiche une date complète, exemple : "lundi 8 septembre 2026"
export function formatDateLong(texteDate) {
  if (!texteDate) return '—'
  return versDate(texteDate).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Affiche une heure, exemple : "17:30"
export function formatTime(texteDate) {
  if (!texteDate) return '—'
  return versDate(texteDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Affiche la date ET l'heure, exemple : "lun. 8 sept. à 17:30"
export function formatDateTime(texteDate) {
  if (!texteDate) return '—'
  return formatDate(texteDate) + ' à ' + formatTime(texteDate)
}

// Affiche un prix en euros, exemple : "3,50 €"
export function formatPrice(nombre) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(nombre || 0)
}

// Renvoie les initiales d'un utilisateur, exemple : "RA"
// (utilisé pour les ronds de couleur qui servent d'avatar)
export function initials(utilisateur) {
  if (!utilisateur) return '?'
  const premiereLettrePrenom = utilisateur.prenom ? utilisateur.prenom[0] : '?'
  const premiereLettreNom = utilisateur.nom ? utilisateur.nom[0] : ''
  return (premiereLettrePrenom + premiereLettreNom).toUpperCase()
}

// Initiales à partir d'un nom complet, exemple : "Naïma M." -> "NM"
export function initialesTexte(nomComplet) {
  if (!nomComplet) return '?'
  return nomComplet.split(' ').map((mot) => mot[0]).join('').slice(0, 2).toUpperCase()
}

// Affiche depuis combien de temps, exemple : "il y a 5 min"
export function timeAgo(texteDate) {
  const differenceMs = Date.now() - versDate(texteDate).getTime()
  const minutes = Math.floor(differenceMs / 60000)

  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return 'il y a ' + minutes + ' min'

  const heures = Math.floor(minutes / 60)
  if (heures < 24) return 'il y a ' + heures + ' h'

  const jours = Math.floor(heures / 24)
  return 'il y a ' + jours + ' j'
}

// Le message d'une erreur de l'API, ou un message par défaut
export function messageErreur(erreur) {
  return (erreur && erreur.message) || 'Une erreur est survenue.'
}

// Le libellé et la couleur Bootstrap de chaque statut de réservation
export const STATUT_RESERVATION = {
  en_attente: { label: 'En attente', class: 'bg-warning text-dark' },
  confirmee: { label: 'Confirmée', class: 'bg-success' },
  refusee: { label: 'Refusée', class: 'bg-danger' },
  annulee: { label: 'Annulée', class: 'bg-secondary' },
  terminee: { label: 'Terminée', class: 'bg-info text-dark' }
}

// Statut d'un trajet
export const STATUT_TRAJET = {
  ouvert: { label: 'Ouvert', class: 'bg-success' },
  complet: { label: 'Complet', class: 'bg-warning text-dark' },
  termine: { label: 'Terminé', class: 'bg-info text-dark' },
  annule: { label: 'Annulé', class: 'bg-secondary' }
}

// Statut d'un paiement (RG06.7)
export const STATUT_PAIEMENT = {
  autorise: { label: 'Autorisé', class: 'bg-warning text-dark' },
  valide: { label: 'Encaissé', class: 'bg-success' },
  annule: { label: 'Annulé', class: 'bg-secondary' },
  rembourse: { label: 'Remboursé', class: 'bg-info text-dark' },
  echoue: { label: 'Échoué', class: 'bg-danger' }
}

// Moyens de paiement
export const MODES_PAIEMENT = {
  carte: 'Carte bancaire',
  mobile_money: 'Mobile money'
}

// Décisions possibles sur un litige (RG10.5)
export const DECISIONS_LITIGE = {
  remboursement_total: 'Remboursement total',
  remboursement_partiel: 'Remboursement partiel',
  avertissement: 'Avertissement',
  sans_suite: 'Sans suite'
}
