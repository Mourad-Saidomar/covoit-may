// ============================================================
// Service DOCUMENTS : les PDF téléchargeables
// ------------------------------------------------------------
// Membres :
//   - reçu d'une réservation payée (preuve de la transaction) ;
//   - relevé mensuel (trajets, dépenses, revenus de conducteur).
// Administrateur :
//   - rapport d'activité mensuel (pilotage de la plateforme) ;
//   - relevé des transactions du mois (suivi comptable) ;
//   - journal des actions des administrateurs (traçabilité, RG01.6).
// Chaque fonction renvoie { nom, contenu } : le nom du fichier et le PDF.
// ============================================================
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as documentModel from '../models/documentModel.js'
import * as utilisateurModel from '../models/utilisateurModel.js'
import { DocumentPdf, COULEURS, euros, dateFr, dateHeureFr, moisFr } from './pdf/gabaritPdf.js'

const MODES = { carte: 'Carte bancaire', mobile_money: 'Mobile money' }
const STATUTS_RESERVATION = {
  en_attente: 'En attente', confirmee: 'Confirmée', refusee: 'Refusée', annulee: 'Annulée', terminee: 'Terminée'
}
const STATUTS_PAIEMENT = {
  autorise: 'Autorisé', valide: 'Payé', annule: 'Annulé', rembourse: 'Remboursé', echoue: 'Échoué'
}
const STATUTS_TRAJET = { ouvert: 'Ouvert', complet: 'Complet', termine: 'Terminé', annule: 'Annulé' }
const ANNULE_PAR = { passager: 'le passager', conducteur: 'le conducteur', admin: "l'équipe Covoit'May", systeme: 'le système (sans réponse avant le départ)' }
const ACTIONS = {
  SUSPENSION_COMPTE: 'Suspension de compte',
  REACTIVATION_COMPTE: 'Réactivation de compte',
  VALIDATION_CONDUCTEUR: 'Validation conducteur',
  REFUS_CONDUCTEUR: 'Refus conducteur',
  RESTAURATION_AVIS: "Restauration d'avis",
  SUPPRESSION_AVIS: "Suppression d'avis",
  PRISE_EN_CHARGE_LITIGE: 'Prise en charge de litige',
  RESOLUTION_LITIGE: 'Résolution de litige',
  MODIFICATION_PARAMETRE: 'Modification de paramètre',
  ANNULATION_TRAJET: 'Annulation de trajet',
  ANNULATION_RESERVATION: 'Annulation de réservation'
}

// Paiement simulé pendant le projet : on le dit clairement sur chaque document
const MENTION_DEMO = 'Paiement simulé : Covoit’May est un projet de démonstration, aucune somme réelle n’a été débitée ni versée.'

const pourcent = (taux) => (Number(taux) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %'
const itineraire = (l) => `${l.lieu_depart} – ${l.lieu_arrivee}`
const departTrajet = (l) => `${dateFr(l.date_trajet)} à ${String(l.heure_depart).slice(0, 5)}`

// « 2026-09 » -> { debut: '2026-09-01', fin: '2026-10-01' }
function periode(mois) {
  const [a, m] = mois.split('-').map(Number)
  const suivant = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`
  return { debut: `${mois}-01`, fin: `${suivant}-01` }
}

// Dernier jour du mois, ex. « 30/09/2026 »
function dernierJour(mois) {
  const [a, m] = mois.split('-').map(Number)
  return `${String(new Date(a, m, 0).getDate()).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`
}

// ============================================================
// Reçu de paiement d'une réservation
// ============================================================

// Titre et couleur du document selon l'état du paiement (RG06.7)
const ETATS_RECU = {
  autorise: { type: 'Justificatif de paiement', pastille: 'Paiement autorisé · en attente de la confirmation du conducteur', couleur: COULEURS.or, texte: COULEURS.vertFonce },
  valide: { type: 'Reçu de paiement', pastille: 'Payé', couleur: COULEURS.vert, texte: COULEURS.blanc },
  annule: { type: "Justificatif d'annulation", pastille: 'Paiement annulé · aucun débit', couleur: '#8A9690', texte: COULEURS.blanc },
  rembourse: { type: 'Avis de remboursement', pastille: 'Remboursé intégralement', couleur: '#3E7CB1', texte: COULEURS.blanc },
  echoue: { type: 'Paiement refusé', pastille: 'Paiement refusé par la banque', couleur: COULEURS.corailFonce, texte: COULEURS.blanc }
}

export async function recu(utilisateur, idReservation) {
  const r = await documentModel.recu(idReservation)
  // Le passager de la réservation ou un administrateur ; pour les autres,
  // la réservation « n'existe pas » (on ne révèle rien)
  if (!r || (utilisateur.role !== 'admin' && r.id_passager !== utilisateur.id)) {
    throw new ErreurApi(404, 'Reçu introuvable.')
  }
  const etat = ETATS_RECU[r.paiement_statut] || ETATS_RECU.autorise
  const pdf = new DocumentPdf({ titre: `${etat.type} ${r.reference}`, typeDocument: etat.type, reference: `N° ${r.reference}` })

  pdf.titre(`${etat.type} n° ${r.reference}`, `Réservation n° ${r.id_reservation} · effectuée le ${dateHeureFr(r.date_reservation)}`)
  pdf.pastille(etat.pastille, etat.couleur, etat.texte)

  pdf.blocs([
    {
      titre: 'Passager',
      lignes: [['Nom', `${r.passager_prenom} ${r.passager_nom}`], ['Email', r.passager_email]]
    },
    {
      titre: 'Paiement',
      lignes: [
        ['Référence', r.reference],
        ['Moyen de paiement', MODES[r.mode_paiement] || r.mode_paiement],
        ['Autorisé le', dateHeureFr(r.date_creation)],
        ...(r.date_paiement ? [['Encaissé le', dateHeureFr(r.date_paiement)]] : []),
        ...(r.date_remboursement ? [['Remboursé le', dateHeureFr(r.date_remboursement)]] : [])
      ]
    }
  ])

  pdf.section('Trajet')
  pdf.blocs([
    { titre: itineraire(r), lignes: [['Départ', departTrajet(r)], ['Point de rendez-vous', r.point_rdv]] },
    { titre: 'Conducteur', lignes: [['Nom', `${r.conducteur_prenom} ${r.conducteur_nom}`], ['Véhicule', r.vehicule]] }
  ])

  pdf.section('Détail')
  pdf.tableau(
    [
      { titre: 'Désignation', part: 5 },
      { titre: 'Places', part: 1.2, align: 'center' },
      { titre: 'Prix par place', part: 1.8, align: 'right' },
      { titre: 'Montant', part: 1.8, align: 'right', gras: true }
    ],
    [[`Covoiturage ${itineraire(r)}, le ${departTrajet(r)}`, String(r.nb_places_reservees), euros(r.prix_unitaire), euros(r.montant)]]
  )

  const lignesTotaux = []
  if (r.paiement_statut === 'rembourse') {
    lignesTotaux.push(['Montant payé', euros(r.montant)], ['Montant remboursé', euros(r.montant), true])
  } else if (r.paiement_statut === 'annule' || r.paiement_statut === 'echoue') {
    lignesTotaux.push(['Montant de la réservation', euros(r.montant)], ['Montant débité', euros(0), true])
  } else {
    lignesTotaux.push([r.paiement_statut === 'valide' ? 'Total payé' : 'Total autorisé', euros(r.montant), true])
    if (Number(r.rembourse_litige) > 0) lignesTotaux.push(['Remboursé après litige', '- ' + euros(r.rembourse_litige)])
  }
  pdf.totaux(lignesTotaux)

  if (r.reservation_statut === 'annulee' && r.annulee_par) {
    pdf.note(`Réservation annulée le ${dateHeureFr(r.date_annulation)} par ${ANNULE_PAR[r.annulee_par] || r.annulee_par}. ` +
      'Remboursement intégral si l’annulation a lieu au moins 24 h avant le départ, ou si elle vient du conducteur (RG06.8).')
  }
  // La répartition n'a de sens que si l'argent a été (ou va être) versé au conducteur
  const repartition = ['valide', 'autorise'].includes(r.paiement_statut)
    ? `Répartition : ${euros(r.montant_net)} pour le conducteur et ${euros(r.commission)} de frais de service Covoit'May ` +
      `(commission de ${pourcent(r.taux_commission)}). `
    : ''
  pdf.note(repartition + "Covoit'May met en relation des particuliers qui partagent les frais d'un trajet " +
    '(covoiturage, article L3132-1 du Code des transports) : ce document ne constitue pas une facture de transport.')
  pdf.note(MENTION_DEMO, { encadre: true })

  return { nom: `covoitmay-recu-${r.reference}.pdf`, contenu: await pdf.terminer() }
}

// ============================================================
// Relevé mensuel d'un membre (passager et/ou conducteur)
// ============================================================
export async function releveMensuel(utilisateur, mois) {
  const { debut, fin } = periode(mois)
  const compte = await utilisateurModel.trouverParId(utilisateur.id)
  const [voyages, conduites] = await Promise.all([
    documentModel.trajetsPassager(utilisateur.id, debut, fin),
    documentModel.trajetsConducteur(utilisateur.id, debut, fin)
  ])

  const pdf = new DocumentPdf({ titre: `Relevé ${moisFr(mois)}`, typeDocument: 'Relevé mensuel', reference: moisFr(mois) })
  pdf.titre(`Relevé de ${moisFr(mois)}`, `Activité du 01/${mois.slice(5)}/${mois.slice(0, 4)} au ${dernierJour(mois)} · trajets dont la date de départ est dans le mois`)
  pdf.blocs([
    {
      titre: 'Titulaire',
      lignes: [['Nom', `${compte.prenom} ${compte.nom}`], ['Email', compte.email]]
    },
    {
      titre: 'Compte',
      lignes: [['Profil', compte.role === 'conducteur' ? 'Conducteur (voyage aussi comme passager)' : 'Passager'],
        ['Membre depuis', dateFr(compte.date_inscription)]]
    }
  ])

  const paye = voyages.filter((v) => v.paiement_statut === 'valide').reduce((s, v) => s + Number(v.montant), 0)
  const rembourse = voyages.filter((v) => v.paiement_statut === 'rembourse').reduce((s, v) => s + Number(v.montant), 0)
  const enAttente = voyages.filter((v) => v.paiement_statut === 'autorise').reduce((s, v) => s + Number(v.montant), 0)
  const net = conduites.reduce((s, c) => s + Number(c.net), 0)
  const passagers = conduites.reduce((s, c) => s + Number(c.places_payees), 0)

  const cartes = [
    { libelle: 'Trajets réservés', valeur: String(voyages.length) },
    { libelle: 'Dépenses (payées)', valeur: euros(paye) }
  ]
  if (compte.role === 'conducteur' || conduites.length) {
    cartes.push({ libelle: 'Passagers transportés', valeur: String(passagers) }, { libelle: 'Revenus nets', valeur: euros(net), accent: true })
  } else {
    cartes.push({ libelle: 'Remboursé', valeur: euros(rembourse) }, { libelle: 'En attente', valeur: euros(enAttente), accent: true })
  }
  pdf.chiffres(cartes)

  pdf.section('Mes trajets en tant que passager')
  pdf.tableau(
    [
      { titre: 'Départ', part: 1.6 },
      { titre: 'Trajet', part: 3 },
      { titre: 'Places', part: 0.9, align: 'center' },
      { titre: 'Réservation', part: 1.4 },
      { titre: 'Paiement', part: 1.3 },
      { titre: 'Montant', part: 1.3, align: 'right' }
    ],
    voyages.map((v) => [departTrajet(v), itineraire(v), String(v.nb_places_reservees),
      STATUTS_RESERVATION[v.statut] || v.statut, STATUTS_PAIEMENT[v.paiement_statut] || '—', euros(v.montant)]),
    { vide: 'Aucun trajet réservé ce mois-ci.' }
  )
  if (voyages.length) {
    pdf.totaux([
      ['Payé', euros(paye)],
      ['Remboursé', euros(rembourse)],
      ...(enAttente ? [['Autorisé, en attente', euros(enAttente)]] : []),
      ['Dépense du mois', euros(paye), true]
    ])
  }

  if (compte.role === 'conducteur' || conduites.length) {
    pdf.section('Mes trajets en tant que conducteur')
    pdf.tableau(
      [
        { titre: 'Départ', part: 1.6 },
        { titre: 'Trajet', part: 2.6 },
        { titre: 'Statut', part: 1.1 },
        { titre: 'Passagers', part: 1, align: 'center' },
        { titre: 'Brut', part: 1.1, align: 'right' },
        { titre: 'Commission', part: 1.2, align: 'right' },
        { titre: 'Net', part: 1.1, align: 'right', gras: true }
      ],
      conduites.map((c) => [departTrajet(c), itineraire(c), STATUTS_TRAJET[c.statut] || c.statut,
        `${c.places_payees} / ${c.places_total}`, euros(c.brut), euros(c.commission), euros(c.net)]),
      { vide: 'Aucun trajet proposé ce mois-ci.' }
    )
    if (conduites.length) {
      const brut = conduites.reduce((s, c) => s + Number(c.brut), 0)
      const commission = conduites.reduce((s, c) => s + Number(c.commission), 0)
      pdf.totaux([
        ['Montant payé par les passagers', euros(brut)],
        ["Frais de service Covoit'May", '- ' + euros(commission)],
        ['Revenu net du mois', euros(net), true]
      ])
    }
    pdf.note('Seuls les paiements encaissés comptent dans les revenus : une réservation refusée, annulée ou remboursée n’en fait pas partie. ' +
      'Le covoiturage est un partage de frais : ces montants ne sont pas un salaire.')
  }
  pdf.note(MENTION_DEMO, { encadre: true })

  return { nom: `covoitmay-releve-${mois}.pdf`, contenu: await pdf.terminer() }
}

// ============================================================
// Administrateur : rapport d'activité mensuel
// ============================================================
export async function rapportActivite(admin, mois) {
  const { debut, fin } = periode(mois)
  const [i, statuts, trajets, actions] = await Promise.all([
    documentModel.indicateurs(debut, fin),
    documentModel.reservationsParStatut(debut, fin),
    documentModel.itineraires(debut, fin),
    documentModel.actionsParType(debut, fin)
  ])
  const n = (v) => Number(v || 0)
  const totalReservations = statuts.reduce((s, l) => s + n(l.nb), 0)
  const confirmees = statuts.filter((l) => ['confirmee', 'terminee'].includes(l.statut)).reduce((s, l) => s + n(l.nb), 0)
  const remplissage = n(i.places_proposees) ? Math.round((n(i.places_occupees) / n(i.places_proposees)) * 100) : 0
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + ' %' : '—')

  const pdf = new DocumentPdf({ titre: `Rapport d'activité ${moisFr(mois)}`, typeDocument: "Rapport d'activité", reference: moisFr(mois) })
  pdf.titre(`Rapport d'activité · ${moisFr(mois)}`, `Du 01/${mois.slice(5)}/${mois.slice(0, 4)} au ${dernierJour(mois)} · édité par ${admin.prenom} (administrateur)`)

  pdf.chiffres([
    { libelle: 'Nouveaux membres', valeur: String(n(i.inscriptions)) },
    { libelle: 'Trajets du mois', valeur: String(n(i.trajets_du_mois)) },
    { libelle: 'Réservations', valeur: String(totalReservations) },
    { libelle: 'Taux de remplissage', valeur: remplissage + ' %' },
    { libelle: 'Volume encaissé', valeur: euros(i.encaisse) },
    { libelle: 'Commission perçue', valeur: euros(i.commission), accent: true },
    { libelle: 'Remboursements', valeur: euros(i.rembourse) },
    { libelle: 'Litiges ouverts', valeur: String(n(i.litiges_ouverts)) }
  ])

  pdf.section('Membres')
  pdf.tableau([{ titre: 'Indicateur', part: 4 }, { titre: 'Valeur', part: 1, align: 'right', gras: true }], [
    ['Nouvelles inscriptions', String(n(i.inscriptions))],
    ['dont inscriptions en tant que conducteur', String(n(i.inscriptions_conducteurs))],
    ['Demandes conducteur reçues', String(n(i.demandes_recues))],
    ['Demandes conducteur acceptées / refusées', `${n(i.demandes_acceptees)} / ${n(i.demandes_refusees)}`],
    ['Comptes suspendus', String(n(i.suspensions))],
    ['Comptes supprimés (droit à l’effacement)', String(n(i.suppressions))]
  ])

  pdf.section('Trajets et réservations')
  pdf.tableau([{ titre: 'Indicateur', part: 4 }, { titre: 'Valeur', part: 1, align: 'right', gras: true }], [
    ['Trajets publiés dans le mois', String(n(i.trajets_publies))],
    ['Trajets dont le départ est dans le mois', String(n(i.trajets_du_mois))],
    ['dont terminés / annulés', `${n(i.trajets_termines)} / ${n(i.trajets_annules)}`],
    ['Places proposées / occupées', `${n(i.places_proposees)} / ${n(i.places_occupees)}`],
    ['Taux de remplissage des voitures', remplissage + ' %'],
    ['Taux de confirmation des réservations', pct(confirmees, totalReservations)]
  ])
  pdf.tableau(
    [{ titre: 'Réservations par statut', part: 3 }, { titre: 'Nombre', part: 1, align: 'right' }, { titre: 'Part', part: 1, align: 'right' }],
    statuts.map((l) => [STATUTS_RESERVATION[l.statut] || l.statut, String(l.nb), pct(n(l.nb), totalReservations)]),
    { vide: 'Aucune réservation pour les trajets du mois.' }
  )

  pdf.section('Finances')
  pdf.tableau([{ titre: 'Indicateur', part: 4 }, { titre: 'Montant', part: 1.4, align: 'right', gras: true }], [
    ['Paiements encaissés (confirmés par le conducteur)', euros(i.encaisse)],
    ["Commission de la plateforme", euros(i.commission)],
    ['Reversé aux conducteurs', euros(i.reverse)],
    [`Remboursements (${n(i.nb_remboursements)})`, euros(i.rembourse)],
    ['Remboursements décidés après litige', euros(i.rembourse_litiges)],
    ['Paiements autorisés, en attente de confirmation', String(n(i.autorisations))]
  ])

  pdf.section('Qualité et confiance')
  pdf.tableau([{ titre: 'Indicateur', part: 4 }, { titre: 'Valeur', part: 1, align: 'right', gras: true }], [
    ['Avis déposés', String(n(i.avis))],
    ['Note moyenne des avis publiés', i.note_moyenne ? Number(i.note_moyenne).toFixed(1).replace('.', ',') + ' / 5' : '—'],
    ['Avis signalés', String(n(i.signalements))],
    ['Litiges ouverts / résolus', `${n(i.litiges_ouverts)} / ${n(i.litiges_resolus)}`]
  ])

  pdf.section('Itinéraires les plus actifs')
  pdf.tableau(
    [{ titre: 'Itinéraire', part: 4 }, { titre: 'Trajets', part: 1, align: 'right' }, { titre: 'Places réservées', part: 1.4, align: 'right' }],
    trajets.map((t) => [itineraire(t), String(t.trajets), String(t.places)]),
    { vide: 'Aucun trajet ce mois-ci.' }
  )

  pdf.section('Actions des administrateurs')
  pdf.tableau(
    [{ titre: 'Action', part: 4 }, { titre: 'Nombre', part: 1, align: 'right' }],
    actions.map((a) => [ACTIONS[a.action] || a.action, String(a.nb)]),
    { vide: 'Aucune action enregistrée ce mois-ci.' }
  )
  pdf.note('Montants calculés par la base de données à partir des paiements (RG06.5). Les encaissements sont datés du jour où le ' +
    'conducteur confirme la réservation, les remboursements du jour du remboursement.')
  pdf.note(MENTION_DEMO, { encadre: true })

  return { nom: `covoitmay-rapport-activite-${mois}.pdf`, contenu: await pdf.terminer() }
}

// ============================================================
// Administrateur : relevé des transactions du mois
// ============================================================
export async function releveTransactions(admin, mois) {
  const { debut, fin } = periode(mois)
  const lignes = await documentModel.transactions(debut, fin)

  const pdf = new DocumentPdf({ titre: `Transactions ${moisFr(mois)}`, typeDocument: 'Relevé des transactions', reference: moisFr(mois), paysage: true })
  pdf.titre(`Relevé des transactions · ${moisFr(mois)}`, `Paiements créés du 01/${mois.slice(5)}/${mois.slice(0, 4)} au ${dernierJour(mois)} · édité par ${admin.prenom} (administrateur)`)

  const somme = (statut, champ) => lignes.filter((l) => l.statut === statut).reduce((s, l) => s + Number(l[champ]), 0)
  pdf.chiffres([
    { libelle: 'Transactions', valeur: String(lignes.length) },
    { libelle: 'Encaissé', valeur: euros(somme('valide', 'montant')) },
    { libelle: 'Commission', valeur: euros(somme('valide', 'commission')), accent: true },
    { libelle: 'Reversé aux conducteurs', valeur: euros(somme('valide', 'montant_net')) },
    { libelle: 'Remboursé', valeur: euros(somme('rembourse', 'montant')) }
  ], 5)

  pdf.tableau(
    [
      { titre: 'Date', part: 2 },
      { titre: 'Référence', part: 1.8 },
      { titre: 'Trajet', part: 2.5 },
      { titre: 'Passager', part: 1.4 },
      { titre: 'Moyen', part: 1.3 },
      { titre: 'Statut', part: 1.1 },
      { titre: 'Montant', part: 1.1, align: 'right' },
      { titre: 'Commission', part: 1.2, align: 'right' },
      { titre: 'Net conducteur', part: 1.3, align: 'right', gras: true }
    ],
    lignes.map((l) => [dateHeureFr(l.date_creation), l.reference, itineraire(l), `${l.prenom} ${l.nom_initiale}`,
      MODES[l.mode_paiement] || l.mode_paiement, STATUTS_PAIEMENT[l.statut] || l.statut,
      euros(l.montant),
      // Rien n'est versé pour un paiement annulé, remboursé ou refusé
      ...(['valide', 'autorise'].includes(l.statut) ? [euros(l.commission), euros(l.montant_net)] : ['—', '—'])]),
    { vide: 'Aucune transaction ce mois-ci.' }
  )

  // Totaux par statut
  const parStatut = Object.keys(STATUTS_PAIEMENT)
    .map((s) => [s, lignes.filter((l) => l.statut === s)])
    .filter(([, liste]) => liste.length)
  if (parStatut.length) {
    pdf.section('Totaux par statut')
    pdf.tableau(
      [{ titre: 'Statut', part: 3 }, { titre: 'Nombre', part: 1, align: 'right' }, { titre: 'Montant', part: 1.4, align: 'right' },
        { titre: 'Commission', part: 1.4, align: 'right' }, { titre: 'Net conducteur', part: 1.4, align: 'right' }],
      parStatut.map(([s, liste]) => {
        const verse = ['valide', 'autorise'].includes(s)
        return [STATUTS_PAIEMENT[s], String(liste.length),
          euros(liste.reduce((t, l) => t + Number(l.montant), 0)),
          verse ? euros(liste.reduce((t, l) => t + Number(l.commission), 0)) : '—',
          verse ? euros(liste.reduce((t, l) => t + Number(l.montant_net), 0)) : '—']
      })
    )
  }
  pdf.note('Seuls les paiements « Payé » sont encaissés. « Autorisé » : en attente de la réponse du conducteur. Aucune donnée de carte ' +
    'bancaire n’est conservée : seule la référence du paiement l’est (RG06.6).')
  pdf.note(MENTION_DEMO, { encadre: true })

  return { nom: `covoitmay-transactions-${mois}.pdf`, contenu: await pdf.terminer() }
}

// ============================================================
// Administrateur : journal des actions du mois (RG01.6)
// ============================================================
export async function journalAdmin(admin, mois) {
  const { debut, fin } = periode(mois)
  const lignes = await documentModel.journal(debut, fin)

  const pdf = new DocumentPdf({ titre: `Journal ${moisFr(mois)}`, typeDocument: "Journal d'administration", reference: moisFr(mois), paysage: true })
  pdf.titre(`Journal des actions des administrateurs · ${moisFr(mois)}`,
    `${lignes.length} action(s) du 01/${mois.slice(5)}/${mois.slice(0, 4)} au ${dernierJour(mois)} · édité par ${admin.prenom} (administrateur)`)
  pdf.tableau(
    [
      { titre: 'Date', part: 1.5 },
      { titre: 'Administrateur', part: 1.5 },
      { titre: 'Action', part: 2 },
      { titre: 'Cible', part: 1.3 },
      { titre: 'Détails', part: 4 },
      { titre: 'Adresse IP', part: 1.3 }
    ],
    lignes.map((l) => [dateHeureFr(l.date_action), `${l.prenom} ${l.nom}`, ACTIONS[l.action] || l.action,
      l.table_cible + (l.id_cible ? ' n° ' + l.id_cible : ''), l.details || '—', l.adresse_ip || '—']),
    { vide: 'Aucune action enregistrée ce mois-ci.' }
  )
  pdf.note('Ce journal ne peut être ni modifié ni supprimé : la base de données l’interdit (RG01.6). Il sert à retrouver qui a fait ' +
    'quoi, et quand, sur les comptes, les avis, les litiges et les paramètres.')

  return { nom: `covoitmay-journal-${mois}.pdf`, contenu: await pdf.terminer() }
}
