// ============================================================
// Modèle STATISTIQUES (tableau de bord de l'administrateur)
// ============================================================
import { requete } from '../config/db.js'

export async function chiffresCles() {
  const [ligne] = await requete(
    `SELECT
       (SELECT COUNT(*) FROM utilisateur WHERE statut_compte <> 'supprime') AS utilisateurs,
       (SELECT COUNT(*) FROM utilisateur WHERE role = 'conducteur' AND statut_compte = 'actif') AS conducteurs_actifs,
       (SELECT COUNT(*) FROM trajet) AS trajets,
       (SELECT COUNT(*) FROM trajet WHERE statut IN ('ouvert','complet') AND TIMESTAMP(date_trajet, heure_depart) > NOW()) AS trajets_a_venir,
       (SELECT COUNT(*) FROM reservation) AS reservations,
       (SELECT COALESCE(SUM(montant), 0) FROM paiement WHERE statut = 'valide') AS volume_paye,
       (SELECT COALESCE(SUM(commission), 0) FROM paiement WHERE statut = 'valide') AS commission,
       (SELECT COUNT(*) FROM avis WHERE signale = 0) AS avis_publies,
       (SELECT COUNT(*) FROM demande_conducteur WHERE statut = 'en_attente') AS demandes_en_attente,
       (SELECT COUNT(*) FROM avis WHERE signale = 1) AS avis_signales,
       (SELECT COUNT(*) FROM litige WHERE statut <> 'resolu') AS litiges_ouverts`)
  return {
    utilisateurs: ligne.utilisateurs,
    conducteursActifs: ligne.conducteurs_actifs,
    trajets: ligne.trajets,
    trajetsAVenir: ligne.trajets_a_venir,
    reservations: ligne.reservations,
    volumePaye: ligne.volume_paye,
    commission: ligne.commission,
    avisPublies: ligne.avis_publies,
    aTraiter: {
      demandesConducteur: ligne.demandes_en_attente,
      avisSignales: ligne.avis_signales,
      litiges: ligne.litiges_ouverts
    }
  }
}

// Les itinéraires les plus publiés
export async function itinerairesPopulaires(limite = 5) {
  const lignes = await requete(
    `SELECT lieu_depart, lieu_arrivee, COUNT(*) AS nb FROM trajet
      GROUP BY lieu_depart, lieu_arrivee ORDER BY nb DESC, lieu_depart LIMIT ${Number(limite)}`)
  return lignes.map((l) => ({ itineraire: l.lieu_depart + ' → ' + l.lieu_arrivee, nb: l.nb }))
}
