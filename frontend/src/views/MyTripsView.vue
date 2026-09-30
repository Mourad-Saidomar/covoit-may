<script>
// ============================================================
// Page "Mes trajets" (côté conducteur)
// ------------------------------------------------------------
// Affiche mes revenus, la liste de mes trajets publiés
// et les demandes de réservation à accepter ou refuser.
// ============================================================
import { useDataStore } from '../stores/data'
import { formatDateTime, formatPrice, messageErreur, STATUT_RESERVATION, STATUT_TRAJET } from '../utils/format'
import SqueletteTrajet from '../components/SqueletteTrajet.vue'
import AvatarMembre from '../components/AvatarMembre.vue'
import { revelerApresChargement } from '../utils/chargement'

export default {
  name: 'MyTripsView',

  components: { SqueletteTrajet, AvatarMembre },

  // Squelettes, puis les trajets
  mounted() {
    this.charger()
  },

  data() {
    return {
      chargement: true, // vrai pendant l'appel à l'API
      // Mes trajets, chacun avec ses demandes : { ...trajet, demandes: [...] }
      mesTrajets: [],
      STATUT_RESERVATION: STATUT_RESERVATION,
      STATUT_TRAJET: STATUT_TRAJET,
      erreurAction: '',
      enCours: null // id de la demande ou du trajet en cours de traitement
    }
  },

  computed: {
    data() {
      return useDataStore()
    },

    // Mes revenus : les paiements encaissés, moins la commission
    // enregistrée sur chaque réservation (RG06.5, RG12.2)
    revenus() {
      let net = 0
      let nb = 0
      this.mesTrajets.forEach(function (t) {
        t.demandes.forEach(function (r) {
          if (r.paiement && r.paiement.statut === 'valide') {
            net = net + r.montant * (1 - r.tauxCommission)
            nb = nb + 1
          }
        })
      })
      return { net: net, nb: nb }
    }
  },

  methods: {
    formatDateTime,
    formatPrice,

    // Mes trajets, puis les demandes de chaque trajet (en parallèle)
    async charger() {
      try {
        const trajets = await this.data.mesTrajets()
        const demandes = await Promise.all(trajets.map((t) => this.data.reservationsDuTrajet(t.id)))
        this.mesTrajets = trajets.map((t, i) => ({ ...t, demandes: demandes[i] }))
      } catch (erreur) {
        this.erreurAction = messageErreur(erreur)
      } finally {
        this.chargement = false
        revelerApresChargement()
      }
    },

    // Le passager d'une réservation (prénom, initiale, téléphone si confirmée)
    passagerDe(reservation) {
      return reservation.passager
    },

    // Lance une action de l'API, affiche l'éventuel refus, puis recharge
    async agir(id, action) {
      this.erreurAction = ''
      this.enCours = id
      try {
        await action()
        await this.charger()
      } catch (erreur) {
        this.erreurAction = messageErreur(erreur)
      } finally {
        this.enCours = null
      }
    },

    // Accepter une demande : le paiement est encaissé (RG06.7)
    accepter(reservation) {
      this.agir('r' + reservation.id, () => this.data.accepterReservation(reservation.id))
    },

    // Refuser une demande : l'autorisation de paiement est libérée
    refuser(reservation) {
      this.agir('r' + reservation.id, () => this.data.refuserReservation(reservation.id))
    },

    // Annuler tout un trajet : les passagers sont remboursés (RG04.15)
    annulerTrajet(trajet) {
      if (!confirm('Annuler ce trajet ? Les passagers seront prévenus et remboursés.')) return
      this.agir('t' + trajet.id, () => this.data.annulerTrajet(trajet.id))
    }
  }
}
</script>

<template>
  <div id="my-trips-page" class="container py-4 min-h-page">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
      <h1 class="h3 section-title mb-0">
        <i class="bi bi-signpost-2 text-cm-primary me-2"></i>Mes trajets
      </h1>
      <router-link to="/publier" class="btn btn-cm-accent">
        <i class="bi bi-plus-circle me-1"></i>Publier un trajet
      </router-link>
    </div>

    <div v-if="erreurAction" class="alert alert-warning" role="alert">
      <i class="bi bi-exclamation-circle me-1"></i>{{ erreurAction }}
    </div>

    <!-- Les 3 cartes de revenus -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card text-center p-3 reveal reveal-zoom">
          <div class="fs-4 fw-bold text-cm-primary">{{ formatPrice(revenus.net) }}</div>
          <div class="small text-muted">Revenus nets (après commission)</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card text-center p-3 reveal reveal-zoom delai-1">
          <div class="fs-4 fw-bold text-cm-primary">{{ revenus.nb }}</div>
          <div class="small text-muted">Réservations payées</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card text-center p-3 reveal reveal-zoom delai-2">
          <div class="fs-4 fw-bold text-cm-primary">{{ mesTrajets.length }}</div>
          <div class="small text-muted">Trajets publiés</div>
        </div>
      </div>
    </div>

    <!-- Pendant le chargement : des squelettes de cartes -->
    <div v-if="chargement" aria-busy="true" aria-label="Chargement">
      <SqueletteTrajet v-for="n in 3" :key="n" />
    </div>

    <!-- Message si aucun trajet -->
    <div v-if="!chargement && mesTrajets.length === 0" class="card text-center py-5">
      <div class="card-body">
        <i class="bi bi-signpost fs-1 text-muted"></i>
        <p class="text-muted mt-3">Vous n'avez pas encore publié de trajet.</p>
      </div>
    </div>

    <!-- Une carte par trajet -->
    <article v-for="t in chargement ? [] : mesTrajets" :key="t.id" class="card mb-3 reveal">
      <div class="card-body">
        <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">
          <div>
            <router-link :to="{ name: 'trip-detail', params: { id: t.id } }"
              class="fw-bold fs-5 text-decoration-none">
              {{ t.depart }} → {{ t.arrivee }}
            </router-link>
            <div class="small text-muted">
              <i class="bi bi-calendar3 me-1"></i>{{ formatDateTime(t.dateDepart) }} ·
              {{ formatPrice(t.prix) }}/place ·
              {{ t.placesDispo }}/{{ t.placesTotal }} places dispo
            </div>
          </div>
          <div class="d-flex gap-2 align-items-start">
            <span class="badge" :class="STATUT_TRAJET[t.statut] ? STATUT_TRAJET[t.statut].class : 'bg-secondary'">
              {{ STATUT_TRAJET[t.statut] ? STATUT_TRAJET[t.statut].label : t.statut }}
            </span>
            <button v-if="t.statut === 'ouvert' || t.statut === 'complet'" class="btn btn-sm btn-outline-danger"
              :disabled="enCours === 't' + t.id" @click="annulerTrajet(t)">
              Annuler le trajet
            </button>
          </div>
        </div>

        <!-- Les demandes de réservation -->
        <div v-if="t.demandes.length > 0" class="border-top pt-3 mt-2">
          <h2 class="small fw-bold text-uppercase text-muted mb-2">
            Demandes de réservation ({{ t.demandes.length }})
          </h2>
          <div v-for="r in t.demandes" :key="r.id"
            class="d-flex align-items-center gap-2 py-2 border-bottom flex-wrap">
            <AvatarMembre :personne="passagerDe(r)" taille="sm" />
            <div class="flex-grow-1">
              <router-link :to="{ name: 'public-profile', params: { id: r.passagerId } }"
                class="small fw-semibold text-decoration-none">
                {{ passagerDe(r).prenom }} {{ passagerDe(r).nom }}
              </router-link>
              <span class="small text-muted"> · {{ r.places }} place(s) · {{ formatPrice(r.montant) }}</span>
              <div v-if="passagerDe(r).telephone" class="small text-muted">
                <i class="bi bi-telephone me-1"></i>{{ passagerDe(r).telephone }}
              </div>
            </div>
            <span class="badge" :class="STATUT_RESERVATION[r.statut] ? STATUT_RESERVATION[r.statut].class : ''">
              {{ STATUT_RESERVATION[r.statut] ? STATUT_RESERVATION[r.statut].label : r.statut }}
            </span>
            <div v-if="r.statut === 'en_attente'" class="d-flex gap-1">
              <button class="btn btn-sm btn-success" :disabled="enCours === 'r' + r.id" @click="accepter(r)">
                <i class="bi bi-check-lg"></i> Accepter
              </button>
              <button class="btn btn-sm btn-outline-danger" :disabled="enCours === 'r' + r.id" @click="refuser(r)">
                <i class="bi bi-x-lg"></i> Refuser
              </button>
            </div>
            <router-link class="btn btn-sm btn-outline-cm"
              :to="{ name: 'messages', query: { avec: r.passagerId } }">
              <i class="bi bi-chat-dots"></i>
            </router-link>
          </div>
        </div>
        <p v-else class="small text-muted border-top pt-3 mt-2 mb-0">
          Aucune demande de réservation pour l'instant.
        </p>
      </div>
    </article>
  </div>
</template>
