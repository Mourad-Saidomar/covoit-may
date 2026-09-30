// ============================================================
// Store des données du site
// ------------------------------------------------------------
// Les données viennent de l'API (backend + base MariaDB).
// Ce store regroupe tous les appels au serveur, pour que les
// pages n'aient pas à connaître les adresses de l'API.
//
// Il garde aussi quelques informations partagées entre les pages :
// les communes, les trajets à venir (accueil et carte du hero),
// le taux de commission et les compteurs de la barre de navigation.
//
// Les règles (places, prix, droits…) sont vérifiées par le serveur :
// en cas de refus, l'appel lance une erreur avec son message.
// ============================================================
import { defineStore } from 'pinia'
import { api, lire, envoyer, remplacer, modifier, supprimer, ouvrirFichier } from '../services/api'
import { COORDONNEES_COMMUNES } from '../data/mapData'

export const useDataStore = defineStore('data', {
  state() {
    return {
      // Liste de départ (identique à la table commune), remplacée par celle de l'API
      communes: Object.keys(COORDONNEES_COMMUNES).sort((a, b) => a.localeCompare(b, 'fr')),
      trajetsAVenir: [],
      commission: 0.12,
      delaiRemboursementHeures: 24,
      // Compteurs de la barre de navigation
      nbMessagesNonLus: 0,
      nbAlertesActives: 0,
      // Compteurs du menu de l'administration
      aTraiter: { demandesConducteur: 0, avisSignales: 0, litiges: 0 }
    }
  },

  actions: {
    // ========== RÉFÉRENCES ==========

    async chargerReferences() {
      try {
        const [communes, parametres] = await Promise.all([lire('/communes'), lire('/parametres')])
        this.communes = communes.map((c) => c.nom)
        this.commission = parametres.tauxCommission
        this.delaiRemboursementHeures = parametres.delaiRemboursementHeures
      } catch {
        // API injoignable : on garde les valeurs de départ
      }
    },

    // ========== TRAJETS ==========

    // Les prochains trajets ouverts (accueil, carte du hero)
    async chargerTrajetsAVenir() {
      this.trajetsAVenir = await lire('/trajets', { tri: 'depart', limite: 50 })
      return this.trajetsAVenir
    },

    // Recherche : { depart, arrivee, date, prixMax, heureMin, heureMax, places, detour, verifies, tri }
    rechercherTrajets(filtres) {
      return lire('/trajets', filtres)
    },

    trajet(id) {
      return lire('/trajets/' + id)
    },

    mesTrajets() {
      return lire('/trajets/moi')
    },

    publierTrajet(trajet) {
      return envoyer('/trajets', trajet)
    },

    annulerTrajet(id) {
      return envoyer('/trajets/' + id + '/annuler')
    },

    // Les demandes et passagers d'un de mes trajets
    reservationsDuTrajet(id) {
      return lire('/trajets/' + id + '/reservations')
    },

    // ========== RÉSERVATIONS ==========

    reserver(idTrajet, nbPlaces, modePaiement) {
      return envoyer('/reservations', { idTrajet, nbPlaces, modePaiement })
    },

    mesReservations() {
      return lire('/reservations/moi')
    },

    accepterReservation(id) {
      return envoyer('/reservations/' + id + '/accepter')
    },

    refuserReservation(id) {
      return envoyer('/reservations/' + id + '/refuser')
    },

    annulerReservation(id) {
      return envoyer('/reservations/' + id + '/annuler')
    },

    // ========== PROFILS ET AVIS ==========

    profilPublic(id) {
      return lire('/utilisateurs/' + id + '/profil')
    },

    avisRecus(idUtilisateur) {
      return lire('/utilisateurs/' + idUtilisateur + '/avis')
    },

    deposerAvis(idTrajet, note, commentaire) {
      return envoyer('/avis', { idTrajet, note, commentaire })
    },

    signalerAvis(id, motif) {
      return envoyer('/avis/' + id + '/signaler', { motif })
    },

    modifierProfil(champs) {
      return remplacer('/utilisateurs/moi', champs)
    },

    changerMotDePasse(ancienMotDePasse, nouveauMotDePasse) {
      return remplacer('/utilisateurs/moi/mot-de-passe', { ancienMotDePasse, nouveauMotDePasse })
    },

    supprimerMonCompte(motDePasse) {
      return supprimer('/utilisateurs/moi', { motDePasse })
    },

    // ========== VÉHICULES ET DEMANDE CONDUCTEUR ==========

    mesVehicules() {
      return lire('/vehicules')
    },

    ajouterVehicule(vehicule) {
      return envoyer('/vehicules', vehicule)
    },

    mesDemandesConducteur() {
      return lire('/demandes-conducteur/moi')
    },

    // vehicule : { marque, modele, couleur, immatriculation, nbPlaces }
    // pieceIdentite et permis : les fichiers choisis dans le formulaire
    deposerDemandeConducteur(vehicule, pieceIdentite, permis) {
      const formulaire = new FormData()
      Object.entries(vehicule).forEach(([cle, valeur]) => {
        if (valeur !== '' && valeur !== null && valeur !== undefined) formulaire.append(cle, valeur)
      })
      formulaire.append('pieceIdentite', pieceIdentite)
      formulaire.append('permis', permis)
      return api('/demandes-conducteur', { methode: 'POST', formulaire })
    },

    // ========== MESSAGERIE ==========

    async conversations() {
      const resultat = await lire('/messages')
      this.nbMessagesNonLus = resultat.nonLus
      return resultat.conversations
    },

    async conversationAvec(id) {
      const messages = await lire('/messages/avec/' + id)
      this.chargerCompteurs()
      return messages
    },

    envoyerMessage(idDestinataire, contenu) {
      return envoyer('/messages', { idDestinataire, contenu })
    },

    // ========== ALERTES ET FAVORIS ==========

    async mesAlertes() {
      const alertes = await lire('/alertes')
      this.nbAlertesActives = alertes.filter((a) => a.active).length
      return alertes
    },

    creerAlerte(alerte) {
      return envoyer('/alertes', alerte)
    },

    changerEtatAlerte(id, active) {
      return modifier('/alertes/' + id, { active })
    },

    supprimerAlerte(id) {
      return supprimer('/alertes/' + id)
    },

    mesFavoris() {
      return lire('/favoris')
    },

    ajouterFavori(idConducteur) {
      return envoyer('/favoris/' + idConducteur)
    },

    retirerFavori(idConducteur) {
      return supprimer('/favoris/' + idConducteur)
    },

    // ========== LITIGES ==========

    ouvrirLitige(idReservation, motif, description) {
      return envoyer('/litiges', { idReservation, motif, description })
    },

    mesLitiges() {
      return lire('/litiges/moi')
    },

    // ========== COMPTEURS DE LA BARRE DE NAVIGATION ==========

    // Messages non lus et alertes actives du membre connecté.
    // En cas d'erreur, on garde les anciens chiffres (ce n'est pas grave).
    async chargerCompteurs() {
      try {
        const [messages, alertes] = await Promise.all([lire('/messages'), lire('/alertes')])
        this.nbMessagesNonLus = messages.nonLus
        this.nbAlertesActives = alertes.filter((a) => a.active).length
      } catch {
        // rien
      }
    },

    viderCompteurs() {
      this.nbMessagesNonLus = 0
      this.nbAlertesActives = 0
    },

    // ========== ADMINISTRATION ==========

    async tableauDeBord() {
      const tableau = await lire('/admin/tableau-de-bord')
      this.aTraiter = tableau.aTraiter
      return tableau
    },

    async chargerCompteursAdmin() {
      try {
        await this.tableauDeBord()
      } catch {
        // rien
      }
    },

    utilisateurs(filtres) {
      return lire('/utilisateurs', filtres)
    },

    changerStatutUtilisateur(id, statut, motif) {
      return modifier('/utilisateurs/' + id + '/statut', { statut, motif })
    },

    demandesConducteur(statut) {
      return lire('/demandes-conducteur', { statut })
    },

    accepterDemandeConducteur(id) {
      return envoyer('/demandes-conducteur/' + id + '/accepter')
    },

    refuserDemandeConducteur(id, motif) {
      return envoyer('/demandes-conducteur/' + id + '/refuser', { motif })
    },

    // type : 'identite' ou 'permis'
    voirJustificatif(id, type) {
      return ouvrirFichier('/demandes-conducteur/' + id + '/justificatifs/' + type)
    },

    tousLesAvis(signales) {
      return lire('/avis', { signales })
    },

    restaurerAvis(id) {
      return envoyer('/avis/' + id + '/restaurer')
    },

    supprimerAvis(id) {
      return supprimer('/avis/' + id)
    },

    tousLesLitiges(statut) {
      return lire('/litiges', { statut })
    },

    prendreEnChargeLitige(id) {
      return envoyer('/litiges/' + id + '/prendre-en-charge')
    },

    resoudreLitige(id, decision, resolution, montantRembourse) {
      return envoyer('/litiges/' + id + '/resoudre', { decision, resolution, montantRembourse })
    },

    transactions() {
      return lire('/paiements')
    }
  }
})
