<script>
// ============================================================
// Page de détail d'un trajet
// ------------------------------------------------------------
// Affiche toutes les infos d'un trajet + le conducteur +
// ses avis, et permet de réserver en 3 étapes :
// 'choix' -> 'paiement' -> 'termine'
// ============================================================
import { useDataStore } from '../stores/data'
import { useAuthStore } from '../stores/auth'
import { formatDateLong, formatTime, formatPrice, initials, initialesTexte, messageErreur, MODES_PAIEMENT } from '../utils/format'
import StarRating from '../components/StarRating.vue'
import TripMap from '../components/TripMap.vue'
import { revelerApresChargement } from '../utils/chargement'

export default {
  name: 'TripDetailView',

  components: { StarRating, TripMap },

  data() {
    return {
      chargement: true,      // vrai pendant l'appel à l'API
      trajet: null,          // le trajet (null = introuvable)
      profilConducteur: null,
      avisConducteur: [],
      dejaReserve: false,    // j'ai une réservation active sur ce trajet
      estDansMesFavoris: false,
      places: 1,             // nombre de places choisies
      modePaiement: 'carte',
      etape: 'choix',        // 'choix' | 'paiement' | 'termine'
      paiementEnCours: false,
      erreurReservation: '',
      reservationCreee: null,
      MODES_PAIEMENT
    }
  },

  computed: {
    data() {
      return useDataStore()
    },
    auth() {
      return useAuthStore()
    },
    // Le conducteur : infos du trajet, complétées par son profil public
    conducteur() {
      if (!this.trajet) return null
      return { ...this.trajet.conducteur, ...(this.profilConducteur || {}) }
    },
    // Prix total = prix d'une place × nombre de places
    total() {
      if (!this.trajet) return 0
      return this.trajet.prix * this.places
    },
    // Est-ce que c'est MON trajet ? (on vérifie aussi le rôle : un
    // administrateur peut avoir le même numéro qu'un membre)
    cestMonTrajet() {
      return this.auth.estMembre && this.trajet !== null &&
             this.trajet.conducteurId === this.auth.utilisateur.id
    }
  },

  // Changement de trajet sans quitter la page (lien d'un autre trajet)
  watch: {
    '$route.params.id'(id) {
      if (id) this.charger()
    }
  },

  mounted() {
    this.charger()
  },

  methods: {
    initials,
    initialesTexte,

    async charger() {
      this.chargement = true
      this.etape = 'choix'
      this.erreurReservation = ''
      try {
        this.trajet = await this.data.trajet(this.$route.params.id)
      } catch {
        this.trajet = null
      }
      if (this.trajet) {
        const idConducteur = this.trajet.conducteurId
        const [profil, avis] = await Promise.all([
          this.data.profilPublic(idConducteur).catch(() => null),
          this.data.avisRecus(idConducteur).catch(() => [])
        ])
        this.profilConducteur = profil
        this.avisConducteur = avis
        if (this.auth.estMembre) await this.chargerMaSituation()
      }
      this.chargement = false
      revelerApresChargement()
    },

    // Ai-je déjà réservé ce trajet ? Le conducteur est-il en favori ?
    async chargerMaSituation() {
      const [reservations, favoris] = await Promise.all([
        this.data.mesReservations().catch(() => []),
        this.data.mesFavoris().catch(() => [])
      ])
      this.dejaReserve = reservations.some((r) => {
        return r.trajetId === this.trajet.id && (r.statut === 'en_attente' || r.statut === 'confirmee')
      })
      this.estDansMesFavoris = favoris.some((f) => f.id === this.trajet.conducteurId)
    },

    // Clic sur "Réserver" : il faut être connecté
    commencerReservation() {
      if (!this.auth.estConnecte) {
        this.$router.push({ name: 'login', query: { redirect: this.$route.fullPath } })
        return
      }
      this.erreurReservation = ''
      this.etape = 'paiement'
    },

    // Clic sur "Payer" : la réservation est créée par l'API, le paiement
    // est « autorisé » puis encaissé quand le conducteur accepte (RG06.7)
    async confirmerPaiement() {
      this.paiementEnCours = true
      try {
        this.reservationCreee = await this.data.reserver(this.trajet.id, this.places, this.modePaiement)
        this.etape = 'termine'
        this.dejaReserve = true
      } catch (erreur) {
        // Le serveur explique pourquoi (trajet complet, déjà réservé…)
        this.erreurReservation = messageErreur(erreur)
        this.etape = 'choix'
      } finally {
        this.paiementEnCours = false
      }
    },

    // Ajouter / retirer le conducteur des favoris
    async basculerFavori() {
      if (!this.auth.estConnecte) {
        this.$router.push({ name: 'login', query: { redirect: this.$route.fullPath } })
        return
      }
      try {
        if (this.estDansMesFavoris) {
          await this.data.retirerFavori(this.trajet.conducteurId)
        } else {
          await this.data.ajouterFavori(this.trajet.conducteurId)
        }
        this.estDansMesFavoris = !this.estDansMesFavoris
      } catch (erreur) {
        this.erreurReservation = messageErreur(erreur)
      }
    },

    // Envoyer un message au conducteur
    contacterConducteur() {
      if (!this.auth.estConnecte) {
        this.$router.push({ name: 'login', query: { redirect: this.$route.fullPath } })
        return
      }
      this.$router.push({ name: 'messages', query: { avec: this.trajet.conducteurId } })
    },

    // Petites aides pour l'affichage
    formatDateLong,
    formatTime,
    formatPrice
  }
}
</script>

<template>
  <div id="trip-detail-page" class="container py-4 min-h-page">
    <!-- Pendant le chargement : squelette de la page -->
    <div v-if="chargement" class="row g-4" aria-busy="true" aria-label="Chargement du trajet">
      <div class="col-lg-8">
        <div class="squelette squelette-ligne w-25 mb-4"></div>
        <div class="card mb-4">
          <div class="card-body p-4">
            <div class="squelette squelette-grande w-50 mb-3"></div>
            <div class="squelette squelette-ligne w-75 mb-4"></div>
            <div class="squelette squelette-ligne w-25 mb-2"></div>
            <div class="squelette squelette-ligne w-50 mb-4"></div>
            <div class="squelette squelette-bloc mb-4"></div>
            <div class="squelette squelette-ligne mb-2"></div>
            <div class="squelette squelette-ligne w-75"></div>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card">
          <div class="card-body p-4">
            <div class="squelette squelette-grande w-50 mb-4"></div>
            <div class="squelette squelette-ligne mb-2"></div>
            <div class="squelette squelette-grande"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Si le trajet n'existe pas -->
    <div v-else-if="!trajet" class="text-center py-5">
      <i class="bi bi-signpost fs-1 text-muted"></i>
      <h1 class="h4 mt-3">Trajet introuvable</h1>
      <router-link to="/recherche" class="btn btn-cm-primary mt-2">Retour à la recherche</router-link>
    </div>

    <div v-else class="row g-4">
      <!-- Colonne principale (gauche) -->
      <div class="col-lg-8">
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb small">
            <li class="breadcrumb-item"><router-link to="/">Accueil</router-link></li>
            <li class="breadcrumb-item"><router-link to="/recherche">Recherche</router-link></li>
            <li class="breadcrumb-item active">{{ trajet.depart }} → {{ trajet.arrivee }}</li>
          </ol>
        </nav>

        <!-- Infos du trajet -->
        <article class="card mb-4 reveal">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between flex-wrap gap-2 mb-3">
              <h1 class="h4 fw-bold mb-0">{{ trajet.depart }} → {{ trajet.arrivee }}</h1>
              <span v-if="trajet.statut !== 'ouvert'" class="badge bg-secondary">Trajet {{ trajet.statut === 'termine' ? 'terminé' : trajet.statut === 'annule' ? 'annulé' : trajet.statut }}</span>
            </div>

            <p class="text-muted">
              <i class="bi bi-calendar3 me-1"></i>{{ formatDateLong(trajet.dateDepart) }}
              — départ à <strong>{{ formatTime(trajet.dateDepart) }}</strong>
            </p>

            <div class="trip-route my-4">
              <div class="line"></div>
              <div class="point mb-4">
                <div class="fw-bold fs-5">{{ trajet.depart }}</div>
                <div class="small text-muted"><i class="bi bi-pin-map me-1"></i>{{ trajet.pointRdv }}</div>
              </div>
              <div class="point end">
                <div class="fw-bold fs-5">{{ trajet.arrivee }}</div>
              </div>
            </div>

            <TripMap :trip="trajet" class="mb-4" />

            <div class="row g-3 text-center mb-3">
              <div class="col-4">
                <div class="bg-cm-light rounded-3 p-3">
                  <i class="bi bi-person-fill text-cm-primary fs-4"></i>
                  <div class="small fw-semibold mt-1">{{ trajet.placesDispo }}/{{ trajet.placesTotal }} places</div>
                </div>
              </div>
              <div class="col-4">
                <div class="bg-cm-light rounded-3 p-3">
                  <i class="bi bi-signpost-split text-cm-primary fs-4"></i>
                  <div class="small fw-semibold mt-1">{{ trajet.detourAccepte ? 'Détour possible' : 'Sans détour' }}</div>
                </div>
              </div>
              <div class="col-4">
                <div class="bg-cm-light rounded-3 p-3">
                  <i class="bi bi-arrow-repeat text-cm-primary fs-4"></i>
                  <div class="small fw-semibold mt-1">
                    {{ trajet.recurrent ? 'Régulier (' + trajet.joursRecurrents.join(', ') + ')' : 'Ponctuel' }}
                  </div>
                </div>
              </div>
            </div>

            <h2 class="h6 fw-bold">Description du conducteur</h2>
            <p class="text-muted mb-0">{{ trajet.description || 'Pas de précision.' }}</p>
          </div>
        </article>

        <!-- Le conducteur -->
        <section id="driver-section" class="card mb-4 reveal delai-1">
          <div class="card-body p-4">
            <h2 class="h6 fw-bold mb-3">Votre conducteur</h2>
            <div class="d-flex align-items-center gap-3 flex-wrap">
              <span class="avatar avatar-lg">{{ initials(conducteur) }}</span>
              <div class="flex-grow-1">
                <router-link :to="{ name: 'public-profile', params: { id: conducteur.id } }"
                  class="fw-bold fs-5 text-decoration-none">
                  {{ conducteur.prenom }} {{ conducteur.nom }}
                </router-link>
                <span v-if="conducteur.verifie" class="badge badge-verified ms-2">
                  <i class="bi bi-patch-check-fill me-1"></i>Identité vérifiée
                </span>
                <div><StarRating :note="conducteur.note" :nb-avis="conducteur.nbAvis" /></div>
                <div class="small text-muted mt-1">
                  <i class="bi bi-car-front me-1"></i>{{ trajet.vehicule }}
                  <template v-if="conducteur.nbTrajets !== undefined"> · {{ conducteur.nbTrajets }} trajets effectués</template>
                </div>
              </div>
              <div v-if="!auth.estAdmin && !cestMonTrajet" class="d-flex gap-2">
                <button class="btn btn-outline-cm btn-sm" @click="contacterConducteur">
                  <i class="bi bi-chat-dots me-1"></i>Contacter
                </button>
                <button class="btn btn-sm" :class="estDansMesFavoris ? 'btn-cm-accent' : 'btn-outline-secondary'"
                  :title="estDansMesFavoris ? 'Retirer des favoris' : 'Ajouter aux favoris'" @click="basculerFavori">
                  <i class="bi" :class="estDansMesFavoris ? 'bi-star-fill' : 'bi-star'"></i>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Les avis -->
        <section id="reviews-section" class="card reveal delai-2">
          <div class="card-body p-4">
            <h2 class="h6 fw-bold mb-3">Avis sur {{ conducteur.prenom }} ({{ avisConducteur.length }})</h2>
            <div v-if="avisConducteur.length === 0" class="text-muted small">Aucun avis pour le moment.</div>
            <div v-for="avis in avisConducteur" :key="avis.id" class="border-bottom py-3">
              <div class="d-flex align-items-center gap-2 mb-1">
                <span class="avatar avatar-sm">{{ initialesTexte(avis.auteur) }}</span>
                <strong class="small">{{ avis.auteur }}</strong>
                <StarRating :note="avis.note" />
              </div>
              <p class="small text-muted mb-0">{{ avis.commentaire }}</p>
            </div>
          </div>
        </section>
      </div>

      <!-- Colonne de droite : la réservation -->
      <div class="col-lg-4">
        <div class="card sticky-top reveal reveal-droite delai-1" style="top: 84px;">
          <div class="card-body p-4">
            <!-- Étape 3 : c'est terminé -->
            <div v-if="etape === 'termine'" class="text-center py-3">
              <i class="bi bi-check-circle-fill text-success fs-1"></i>
              <h2 class="h5 fw-bold mt-3">Demande envoyée !</h2>
              <p class="small text-muted">
                Votre demande de {{ formatPrice(reservationCreee ? reservationCreee.montant : total) }} est enregistrée.
                Le paiement est seulement autorisé : il sera encaissé quand le conducteur acceptera,
                et libéré s'il refuse.
              </p>
              <router-link to="/mes-reservations" class="btn btn-cm-primary w-100">
                Voir mes réservations
              </router-link>
            </div>

            <!-- Étape 2 : le paiement -->
            <div v-else-if="etape === 'paiement'">
              <h2 class="h6 fw-bold mb-3"><i class="bi bi-credit-card me-1"></i>Paiement</h2>
              <div class="mb-3">
                <label class="form-label small fw-semibold" for="mode-paiement">Moyen de paiement</label>
                <select id="mode-paiement" v-model="modePaiement" class="form-select">
                  <option v-for="(libelle, mode) in MODES_PAIEMENT" :key="mode" :value="mode">{{ libelle }}</option>
                </select>
              </div>
              <!-- Démo : ces champs ne sont jamais envoyés. En production, ils
                   seraient ceux du prestataire (Stripe) : aucune donnée de carte
                   ne passe par notre serveur (RG06.6). -->
              <template v-if="modePaiement === 'carte'">
                <div class="alert alert-info py-2 small">
                  <i class="bi bi-shield-lock me-1"></i>Démo : ces champs ne sont pas envoyés au serveur.
                </div>
                <div class="mb-2">
                  <label class="form-label small fw-semibold" for="card-number">Numéro de carte</label>
                  <input id="card-number" class="form-control" placeholder="4242 4242 4242 4242" autocomplete="off" />
                </div>
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="form-label small fw-semibold" for="card-exp">Expiration</label>
                    <input id="card-exp" class="form-control" placeholder="12/28" autocomplete="off" />
                  </div>
                  <div class="col-6">
                    <label class="form-label small fw-semibold" for="card-cvc">CVC</label>
                    <input id="card-cvc" class="form-control" placeholder="123" autocomplete="off" />
                  </div>
                </div>
              </template>
              <div class="d-flex justify-content-between small mb-1">
                <span>{{ places }} place(s) × {{ formatPrice(trajet.prix) }}</span>
                <span>{{ formatPrice(total) }}</span>
              </div>
              <div class="d-flex justify-content-between small text-muted mb-3">
                <span>dont commission plateforme ({{ Math.round(data.commission * 100) }}%)</span>
                <span>{{ formatPrice(total * data.commission) }}</span>
              </div>
              <button class="btn btn-cm-accent w-100 mb-2" :disabled="paiementEnCours" @click="confirmerPaiement">
                <span v-if="paiementEnCours" class="spinner-border spinner-border-sm me-1"></span>
                Payer {{ formatPrice(total) }}
              </button>
              <button class="btn btn-link btn-sm w-100 text-muted" @click="etape = 'choix'">Annuler</button>
            </div>

            <!-- Étape 1 : le choix des places -->
            <div v-else>
              <div class="d-flex justify-content-between align-items-baseline mb-3">
                <span class="text-muted">Prix par place</span>
                <span class="fs-3 fw-bold text-cm-primary">{{ formatPrice(trajet.prix) }}</span>
              </div>

              <!-- Refus du serveur (trajet complet entre-temps, etc.) -->
              <div v-if="erreurReservation" class="alert alert-danger small py-2" role="alert">
                <i class="bi bi-exclamation-circle me-1"></i>{{ erreurReservation }}
              </div>

              <div v-if="auth.estAdmin" class="alert alert-secondary small py-2">
                <i class="bi bi-info-circle me-1"></i>Un administrateur ne réserve pas de place.
              </div>
              <div v-else-if="cestMonTrajet" class="alert alert-secondary small py-2">
                <i class="bi bi-info-circle me-1"></i>C'est votre trajet.
                <router-link to="/mes-trajets">Gérer mes trajets</router-link>
              </div>
              <div v-else-if="dejaReserve" class="alert alert-success small py-2">
                <i class="bi bi-check-circle me-1"></i>Vous avez déjà une réservation sur ce trajet.
                <router-link to="/mes-reservations">Voir mes réservations</router-link>
              </div>
              <template v-else-if="trajet.placesDispo > 0 && trajet.statut === 'ouvert'">
                <div class="mb-3">
                  <label class="form-label small fw-semibold" for="booking-places">Nombre de places</label>
                  <select id="booking-places" v-model.number="places" class="form-select">
                    <option v-for="n in trajet.placesDispo" :key="n" :value="n">{{ n }}</option>
                  </select>
                </div>
                <button class="btn btn-cm-accent w-100" @click="commencerReservation">
                  <i class="bi bi-ticket-perforated me-1"></i>Réserver
                </button>
                <p class="small text-muted text-center mt-2 mb-0">
                  <i class="bi bi-info-circle me-1"></i>Remboursé si le conducteur annule, ou si vous annulez
                  au moins {{ data.delaiRemboursementHeures }} h avant le départ
                </p>
              </template>
              <div v-else class="alert alert-warning small py-2 mb-0">
                <i class="bi bi-x-circle me-1"></i>Ce trajet est complet ou fermé.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
