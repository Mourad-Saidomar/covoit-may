<script>
// ============================================================
// Page de recherche de trajets
// ------------------------------------------------------------
// La recherche (départ / arrivée / date) vient de l'adresse
// de la page (this.$route.query). Les filtres à gauche
// (prix, heure, places…) sont stockés dans data().
// Le filtrage et le tri sont faits par le serveur (API).
// ============================================================
import { useDataStore } from '../stores/data'
import SearchForm from '../components/SearchForm.vue'
import TripCard from '../components/TripCard.vue'
import SqueletteTrajet from '../components/SqueletteTrajet.vue'
import { revelerApresChargement } from '../utils/chargement'
import { messageErreur } from '../utils/format'

export default {
  name: 'SearchView',

  components: { SearchForm, TripCard, SqueletteTrajet },

  data() {
    return {
      chargement: true, // vrai pendant l'appel à l'API
      erreur: '',
      resultats: [],
      minuteur: null,
      numeroRequete: 0, // pour ignorer une réponse arrivée trop tard
      // Les filtres choisis par l'utilisateur
      prixMax: 10,
      heureMin: '',
      heureMax: '',
      placesMin: 1,
      detourSeulement: false,
      verifiesSeulement: false,
      tri: 'depart'
    }
  },

  computed: {
    data() {
      return useDataStore()
    },

    // Tous les critères envoyés à l'API
    filtres() {
      const recherche = this.$route.query
      return {
        depart: recherche.depart,
        arrivee: recherche.arrivee,
        date: recherche.date,
        prixMax: this.prixMax < 10 ? this.prixMax : undefined,
        heureMin: this.heureMin,
        heureMax: this.heureMax,
        places: this.placesMin > 1 ? this.placesMin : undefined,
        detour: this.detourSeulement,
        verifies: this.verifiesSeulement,
        tri: this.tri
      }
    }
  },

  // Une nouvelle recherche ou un filtre modifié relance la requête
  // (après une courte pause, pour ne pas appeler l'API à chaque
  // mouvement du curseur de prix)
  watch: {
    filtres: {
      deep: true,
      handler() {
        clearTimeout(this.minuteur)
        this.minuteur = setTimeout(() => this.chargerResultats(), 300)
      }
    }
  },

  mounted() {
    this.chargerResultats()
  },

  beforeUnmount() {
    clearTimeout(this.minuteur)
  },

  methods: {
    async chargerResultats() {
      const numero = ++this.numeroRequete
      this.chargement = true
      this.erreur = ''
      try {
        const liste = await this.data.rechercherTrajets(this.filtres)
        if (numero !== this.numeroRequete) return // une recherche plus récente est partie
        this.resultats = liste
      } catch (erreur) {
        if (numero !== this.numeroRequete) return
        this.resultats = []
        this.erreur = messageErreur(erreur)
      }
      this.chargement = false
      revelerApresChargement()
    }
  }
}
</script>

<template>
  <div id="search-page" class="min-h-page">
    <!-- Bandeau avec le formulaire de recherche -->
    <section class="bg-cm-primary py-4">
      <div class="container">
        <div class="card reveal">
          <div class="card-body">
            <SearchForm :initial="$route.query" inline />
          </div>
        </div>
      </div>
    </section>

    <div class="container py-4">
      <div class="row g-4">
        <!-- Colonne de gauche : les filtres -->
        <aside class="col-lg-3">
          <div class="card sticky-top reveal reveal-gauche delai-1" style="top: 84px;">
            <div class="card-body">
              <h2 class="h6 fw-bold mb-3"><i class="bi bi-funnel me-1"></i>Filtres</h2>

              <div class="mb-3">
                <label class="form-label small fw-semibold" for="filter-prix">
                  Prix max : <span class="text-cm-primary fw-bold">{{ prixMax }} €</span>
                </label>
                <input id="filter-prix" v-model.number="prixMax" type="range"
                  class="form-range" min="1" max="10" step="0.5" />
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Heure de départ</label>
                <div class="d-flex gap-2">
                  <input v-model="heureMin" type="time" class="form-control form-control-sm"
                    aria-label="Heure minimum" />
                  <input v-model="heureMax" type="time" class="form-control form-control-sm"
                    aria-label="Heure maximum" />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold" for="filter-places">Places minimum</label>
                <select id="filter-places" v-model.number="placesMin" class="form-select form-select-sm">
                  <option :value="1">1 place</option>
                  <option :value="2">2 places</option>
                  <option :value="3">3 places</option>
                </select>
              </div>

              <div class="form-check form-switch mb-2">
                <input id="filter-detour" v-model="detourSeulement" class="form-check-input" type="checkbox" />
                <label class="form-check-label small" for="filter-detour">Détour accepté</label>
              </div>
              <div class="form-check form-switch">
                <input id="filter-verified" v-model="verifiesSeulement" class="form-check-input" type="checkbox" />
                <label class="form-check-label small" for="filter-verified">
                  Conducteurs vérifiés <i class="bi bi-patch-check-fill text-cm-primary"></i>
                </label>
              </div>
            </div>
          </div>
        </aside>

        <!-- Colonne de droite : les résultats -->
        <section class="col-lg-9">
          <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h1 class="h5 mb-0">
              <span v-if="chargement">Recherche des trajets…</span>
              <span v-else>
                {{ resultats.length }} trajet{{ resultats.length > 1 ? 's' : '' }} disponible{{ resultats.length > 1 ? 's' : '' }}
              </span>
            </h1>
            <select v-model="tri" class="form-select form-select-sm w-auto" aria-label="Trier par">
              <option value="depart">Trier par : Départ le plus proche</option>
              <option value="prix">Trier par : Prix croissant</option>
              <option value="note">Trier par : Meilleure note</option>
            </select>
          </div>

          <!-- Pendant le chargement : des squelettes de cartes -->
          <div v-if="chargement" aria-busy="true">
            <SqueletteTrajet v-for="n in 4" :key="n" />
          </div>

          <!-- Une carte par trajet trouvé -->
          <template v-else>
            <div v-for="trajet in resultats" :key="trajet.id" class="reveal">
              <TripCard :trip="trajet" />
            </div>
          </template>

          <div v-if="!chargement && erreur" class="alert alert-warning" role="alert">
            <i class="bi bi-exclamation-triangle me-1"></i>{{ erreur }}
          </div>

          <!-- Message si aucun résultat -->
          <div v-else-if="!chargement && resultats.length === 0" class="card text-center py-5">
            <div class="card-body">
              <i class="bi bi-emoji-frown fs-1 text-muted"></i>
              <h2 class="h5 mt-3">Aucun trajet ne correspond à votre recherche</h2>
              <p class="text-muted">Essayez d'élargir vos critères, ou créez une alerte pour être notifié
                dès qu'un trajet correspondant est publié.</p>
              <router-link to="/mes-alertes" class="btn btn-cm-primary">
                <i class="bi bi-bell me-1"></i>Créer une alerte
              </router-link>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
