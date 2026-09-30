<!-- ============================================================
  Composant TripCard : une carte qui résume un trajet
  (itinéraire, conducteur, prix, places).
  Utilisation : <TripCard :trip="monTrajet" />
  Mise en page (grille, main.css « Carte de trajet ») :
  - mobile : l'itinéraire et le prix en haut, le conducteur dessous,
    séparé par un filet ;
  - à partir de la tablette : itinéraire | conducteur | prix.
============================================================ -->
<template>
  <router-link :to="{ name: 'trip-detail', params: { id: trip.id } }" class="trajet-carte-lien">
    <article class="card card-hover trajet-carte">
      <!-- L'itinéraire -->
      <div class="trajet-carte-itineraire">
        <div class="trip-route">
          <div class="line"></div>
          <div class="point mb-2">
            <div class="trajet-carte-lieu">{{ trip.depart }}</div>
            <div class="trajet-carte-heure">{{ heureDepart }}</div>
          </div>
          <div class="point end">
            <div class="trajet-carte-lieu">{{ trip.arrivee }}</div>
          </div>
        </div>
        <div class="trajet-carte-date">
          <span><i class="bi bi-calendar3 me-1"></i>{{ dateDepart }}</span>
          <span v-if="trip.recurrent" class="badge bg-cm-light text-cm-primary">
            <i class="bi bi-arrow-repeat me-1"></i>Régulier
          </span>
        </div>
      </div>

      <!-- Le prix et les places -->
      <div class="trajet-carte-prix">
        <div class="trajet-carte-montant">{{ prixAffiche }}</div>
        <div class="trajet-carte-par-place">par place</div>
        <div class="trajet-carte-places" :class="trip.placesDispo > 0 ? 'text-success' : 'text-danger'">
          <i class="bi bi-person-fill me-1"></i>
          <span v-if="trip.placesDispo > 0">{{ trip.placesDispo }} place{{ trip.placesDispo > 1 ? 's' : '' }}</span>
          <span v-else>Complet</span>
        </div>
      </div>

      <!-- Le conducteur -->
      <div class="trajet-carte-conducteur">
        <AvatarMembre :personne="conducteur" />
        <div class="min-w-0">
          <div class="fw-semibold text-truncate">
            {{ conducteur ? conducteur.prenom + ' ' + (conducteur.nom || '') : '?' }}
            <i v-if="conducteur && conducteur.verifie"
              class="bi bi-patch-check-fill text-cm-primary" title="Identité vérifiée"></i>
          </div>
          <StarRating :note="conducteur ? conducteur.note : 0" />
        </div>
      </div>
    </article>
  </router-link>
</template>

<script>
import { formatDate, formatTime, formatPrice } from '../utils/format'
import StarRating from './StarRating.vue'
import AvatarMembre from './AvatarMembre.vue'

export default {
  name: 'TripCard',

  components: {
    StarRating,
    AvatarMembre
  },

  props: {
    // Le trajet à afficher (objet obligatoire)
    trip: {
      type: Object,
      required: true
    }
  },

  computed: {
    // Le conducteur du trajet (prénom, initiale, note, photo : envoyés par l'API)
    conducteur() {
      return this.trip.conducteur || null
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
