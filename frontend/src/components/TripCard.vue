<!-- ============================================================
  Composant TripCard : une carte qui résume un trajet
  (itinéraire, conducteur, prix, places).
  Utilisation : <TripCard :trip="monTrajet" />
============================================================ -->
<template>
  <router-link :to="{ name: 'trip-detail', params: { id: trip.id } }"
    class="text-decoration-none text-dark">
    <article class="card card-hover mb-3">
      <div class="card-body">
        <div class="row align-items-center g-3">

          <!-- Colonne 1 : l'itinéraire -->
          <div class="col-md-5">
            <div class="trip-route">
              <div class="line"></div>
              <div class="point mb-2">
                <div class="fw-bold">{{ trip.depart }}</div>
                <div class="small text-muted">{{ heureDepart }}</div>
              </div>
              <div class="point end">
                <div class="fw-bold">{{ trip.arrivee }}</div>
              </div>
            </div>
            <div class="small text-muted mt-2">
              <i class="bi bi-calendar3 me-1"></i>{{ dateDepart }}
              <span v-if="trip.recurrent" class="badge bg-cm-light text-cm-primary ms-2">
                <i class="bi bi-arrow-repeat me-1"></i>Régulier
              </span>
            </div>
          </div>

          <!-- Colonne 2 : le conducteur -->
          <div class="col-md-4">
            <div class="d-flex align-items-center gap-2">
              <span class="avatar">{{ initialesConducteur }}</span>
              <div>
                <div class="fw-semibold">
                  {{ conducteur ? conducteur.prenom : '?' }}
                  <i v-if="conducteur && conducteur.verifie"
                    class="bi bi-patch-check-fill text-cm-primary" title="Identité vérifiée"></i>
                </div>
                <StarRating :note="conducteur ? conducteur.note : 0" />
              </div>
            </div>
          </div>

          <!-- Colonne 3 : prix et places -->
          <div class="col-md-3 text-md-end">
            <div class="fs-4 fw-bold text-cm-primary">{{ prixAffiche }}</div>
            <div class="small" :class="trip.placesDispo > 0 ? 'text-success' : 'text-danger'">
              <i class="bi bi-person-fill me-1"></i>
              <span v-if="trip.placesDispo > 0">{{ trip.placesDispo }} place(s) dispo</span>
              <span v-else>Complet</span>
            </div>
          </div>

        </div>
      </div>
    </article>
  </router-link>
</template>

<script>
import { formatDate, formatTime, formatPrice, initials } from '../utils/format'
import StarRating from './StarRating.vue'

export default {
  name: 'TripCard',

  components: {
    StarRating
  },

  props: {
    // Le trajet à afficher (objet obligatoire)
    trip: {
      type: Object,
      required: true
    }
  },

  computed: {
    // Le conducteur du trajet (prénom, initiale, note : envoyés par l'API)
    conducteur() {
      return this.trip.conducteur || null
    },

    // Ses initiales pour l'avatar
    initialesConducteur() {
      return initials(this.conducteur)
    },

    // La date et l'heure formatées
    dateDepart() {
      return formatDate(this.trip.dateDepart)
    },
    heureDepart() {
      return formatTime(this.trip.dateDepart)
    },

    // Le prix formaté en euros
    prixAffiche() {
      return formatPrice(this.trip.prix)
    }
  }
}
</script>
