<script>
// ============================================================
// Page "Publier un trajet" (réservée aux conducteurs)
// ------------------------------------------------------------
// Un formulaire pour créer un trajet : itinéraire, horaires,
// places, prix. Quand on valide, le trajet est envoyé à l'API
// (qui vérifie toutes les règles) et un message de succès s'affiche.
// ============================================================
import { useDataStore } from '../stores/data'
import { useAuthStore } from '../stores/auth'
import { formatPrice, messageErreur } from '../utils/format'

export default {
  name: 'PublishTripView',

  data() {
    return {
      // Mes véhicules actifs (API) et celui choisi pour ce trajet
      vehicules: [],
      idVehicule: null,
      envoi: false,
      // Les champs du formulaire
      depart: '',
      arrivee: '',
      pointRdv: '',
      date: '',
      heure: '',
      placesTotal: 3,
      prix: 3,
      detourAccepte: false,
      recurrent: false,
      joursRecurrents: [],
      description: '',
      // Messages
      erreur: '',
      publie: false, // true quand le trajet a été publié
      trajetCree: null,
      jours: ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
    }
  },

  computed: {
    data() {
      return useDataStore()
    },
    auth() {
      return useAuthStore()
    },
    communes() {
      return this.data.communes
    },
    // Le conducteur n'est pas encore vérifié par l'équipe ? (RG02.3)
    pasEncoreVerifie() {
      return this.auth.estConducteur && !this.auth.utilisateur.verifie
    },
    // Le véhicule choisi et son nombre de places (RG04.3)
    vehiculeChoisi() {
      return this.vehicules.find((v) => v.id === this.idVehicule) || null
    },
    placesMax() {
      return this.vehiculeChoisi ? Math.min(6, this.vehiculeChoisi.nbPlaces) : 6
    },
    // Combien le conducteur gagnerait si le trajet est complet
    revenuEstime() {
      return this.prix * this.placesTotal * (1 - this.data.commission)
    }
  },

  watch: {
    // Si on change de véhicule, on ne dépasse pas sa capacité
    placesMax(max) {
      if (this.placesTotal > max) this.placesTotal = max
    }
  },

  async mounted() {
    if (this.pasEncoreVerifie) return
    try {
      this.vehicules = (await this.data.mesVehicules()).filter((v) => v.actif)
      if (this.vehicules.length) this.idVehicule = this.vehicules[0].id
    } catch (erreur) {
      this.erreur = messageErreur(erreur)
    }
  },

  methods: {
    formatPrice,

    // Quand on valide le formulaire
    async valider() {
      this.erreur = ''

      // Vérifications rapides (le serveur refait toutes les vérifications)
      if (this.depart === this.arrivee) {
        this.erreur = 'Le départ et l\'arrivée doivent être différents.'
        return
      }
      const dateDepart = new Date(this.date + 'T' + this.heure)
      if (isNaN(dateDepart) || dateDepart < new Date()) {
        this.erreur = 'La date de départ doit être dans le futur.'
        return
      }
      if (this.recurrent && this.joursRecurrents.length === 0) {
        this.erreur = 'Choisissez au moins un jour pour un trajet régulier.'
        return
      }

      this.envoi = true
      try {
        this.trajetCree = await this.data.publierTrajet({
          depart: this.depart,
          arrivee: this.arrivee,
          pointRdv: this.pointRdv,
          date: this.date,
          heure: this.heure,
          placesTotal: this.placesTotal,
          prix: this.prix,
          detourAccepte: this.detourAccepte,
          recurrent: this.recurrent,
          joursRecurrents: this.recurrent ? [...this.joursRecurrents] : undefined,
          description: this.description || undefined,
          idVehicule: this.idVehicule || undefined
        })
        this.publie = true
        window.scrollTo({ top: 0 })
      } catch (erreur) {
        this.erreur = messageErreur(erreur)
      } finally {
        this.envoi = false
      }
    },

    // Réinitialiser le formulaire pour publier un autre trajet
    publierUnAutre() {
      this.publie = false
      this.depart = ''
      this.arrivee = ''
      this.pointRdv = ''
      this.date = ''
      this.heure = ''
      this.placesTotal = 3
      this.prix = 3
      this.detourAccepte = false
      this.recurrent = false
      this.joursRecurrents = []
      this.description = ''
      this.trajetCree = null
    }
  }
}
</script>

<template>
  <div id="publish-page" class="container py-4 min-h-page">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <h1 class="h3 section-title mb-4">
          <i class="bi bi-plus-circle text-cm-primary me-2"></i>Publier un trajet
        </h1>

        <!-- Message de succès après publication -->
        <div v-if="publie" class="card text-center py-5">
          <div class="card-body">
            <i class="bi bi-check-circle-fill text-success fs-1"></i>
            <h2 class="h4 mt-3">Trajet publié !</h2>
            <p class="text-muted">Votre trajet est maintenant visible par les passagers.</p>
            <div class="d-flex gap-2 justify-content-center flex-wrap">
              <router-link v-if="trajetCree" :to="{ name: 'trip-detail', params: { id: trajetCree.id } }"
                class="btn btn-outline-cm">Voir le trajet</router-link>
              <router-link to="/mes-trajets" class="btn btn-cm-primary">Voir mes trajets</router-link>
              <button class="btn btn-outline-cm" @click="publierUnAutre">Publier un autre trajet</button>
            </div>
          </div>
        </div>

        <!-- Le formulaire de publication -->
        <template v-else>
          <!-- Conducteur pas encore vérifié : pas de publication (RG02.3) -->
          <div v-if="pasEncoreVerifie" class="card text-center py-5">
            <div class="card-body">
              <i class="bi bi-hourglass-split fs-1 text-warning"></i>
              <h2 class="h5 mt-3">Votre identité doit d'abord être vérifiée</h2>
              <p class="text-muted">
                Envoyez votre véhicule, votre pièce d'identité et votre permis depuis votre profil.
                Vous pourrez publier vos trajets dès que l'équipe aura validé votre dossier.
              </p>
              <router-link :to="{ name: 'my-profile', hash: '#devenir-conducteur' }" class="btn btn-cm-primary">
                Envoyer mes justificatifs
              </router-link>
            </div>
          </div>

          <template v-else>
          <div v-if="erreur" class="alert alert-danger py-2" role="alert">{{ erreur }}</div>

          <form id="publish-form" class="card reveal" @submit.prevent="valider">
            <div class="card-body p-4">
              <div v-if="vehicules.length > 1" class="mb-4">
                <label class="form-label fw-semibold" for="pub-vehicule">Véhicule</label>
                <select id="pub-vehicule" v-model.number="idVehicule" class="form-select">
                  <option v-for="v in vehicules" :key="v.id" :value="v.id">
                    {{ v.libelle }} ({{ v.immatriculation }}, {{ v.nbPlaces }} places)
                  </option>
                </select>
              </div>
              <p v-else-if="vehiculeChoisi" class="small text-muted mb-4">
                <i class="bi bi-car-front me-1"></i>{{ vehiculeChoisi.libelle }} ({{ vehiculeChoisi.immatriculation }})
              </p>

              <h2 class="h6 fw-bold text-cm-primary mb-3">Itinéraire</h2>
              <div class="row g-3 mb-4">
                <div class="col-md-6">
                  <label class="form-label fw-semibold" for="pub-depart">Départ</label>
                  <select id="pub-depart" v-model="depart" class="form-select" required>
                    <option value="" disabled>Choisir…</option>
                    <option v-for="c in communes" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold" for="pub-arrivee">Arrivée</label>
                  <select id="pub-arrivee" v-model="arrivee" class="form-select" required>
                    <option value="" disabled>Choisir…</option>
                    <option v-for="c in communes" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label fw-semibold" for="pub-rdv">Point de rendez-vous</label>
                  <input id="pub-rdv" v-model="pointRdv" class="form-control"
                    placeholder="Ex : Rond-point du marché, station Total…" required />
                </div>
              </div>

              <h2 class="h6 fw-bold text-cm-primary mb-3">Horaires</h2>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label fw-semibold" for="pub-date">Date</label>
                  <input id="pub-date" v-model="date" type="date" class="form-control" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold" for="pub-heure">Heure de départ</label>
                  <input id="pub-heure" v-model="heure" type="time" class="form-control" required />
                </div>
              </div>

              <div class="form-check form-switch mb-2">
                <input id="pub-recurrent" v-model="recurrent" class="form-check-input" type="checkbox" />
                <label class="form-check-label" for="pub-recurrent">
                  Trajet régulier (répété chaque semaine)
                </label>
              </div>
              <!-- Choix des jours si le trajet est régulier -->
              <div v-if="recurrent" class="mb-4 d-flex gap-2 flex-wrap">
                <template v-for="j in jours" :key="j">
                  <input :id="'jour-' + j" v-model="joursRecurrents" type="checkbox"
                    class="btn-check" :value="j" />
                  <label class="btn btn-sm"
                    :class="joursRecurrents.includes(j) ? 'btn-cm-primary' : 'btn-outline-secondary'"
                    :for="'jour-' + j">{{ j }}</label>
                </template>
              </div>

              <h2 class="h6 fw-bold text-cm-primary mb-3 mt-4">Places & prix</h2>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label fw-semibold" for="pub-places">Places disponibles</label>
                  <select id="pub-places" v-model.number="placesTotal" class="form-select">
                    <option v-for="n in placesMax" :key="n" :value="n">{{ n }}</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold" for="pub-prix">
                    Prix par place : <span class="text-cm-primary fw-bold">{{ formatPrice(prix) }}</span>
                  </label>
                  <input id="pub-prix" v-model.number="prix" type="range" class="form-range mt-2"
                    min="1" max="10" step="0.5" />
                  <small class="text-muted">Restez dans le cadre du partage de frais
                    (<router-link :to="{ name: 'legal' }">cadre légal du covoiturage</router-link>).</small>
                </div>
              </div>

              <div class="bg-cm-light rounded-3 p-3 mb-4 small">
                <i class="bi bi-calculator me-1 text-cm-primary"></i>
                Revenu estimé si complet : <strong>{{ formatPrice(revenuEstime) }}</strong>
                <span class="text-muted">
                  (après commission plateforme de {{ Math.round(data.commission * 100) }}%)
                </span>
              </div>

              <div class="form-check form-switch mb-3">
                <input id="pub-detour" v-model="detourAccepte" class="form-check-input" type="checkbox" />
                <label class="form-check-label" for="pub-detour">J'accepte de faire un petit détour</label>
              </div>

              <div class="mb-4">
                <label class="form-label fw-semibold" for="pub-desc">Description (optionnel)</label>
                <textarea id="pub-desc" v-model="description" class="form-control" rows="3"
                  placeholder="Précisions utiles : ponctualité, bagages, climatisation…"></textarea>
              </div>

              <button type="submit" class="btn btn-cm-accent w-100 py-2" :disabled="envoi">
                <span v-if="envoi" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-send me-1"></i>Publier le trajet
              </button>
            </div>
          </form>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>
