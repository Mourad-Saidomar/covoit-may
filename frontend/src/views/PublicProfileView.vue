<script>
// ============================================================
// Page de profil public d'un membre
// ------------------------------------------------------------
// Affiche les infos d'un utilisateur, ses trajets à venir
// (s'il est conducteur) et les avis qu'il a reçus.
// ============================================================
import { useDataStore } from '../stores/data'
import { useAuthStore } from '../stores/auth'
import { initialesTexte, formatDate, timeAgo, messageErreur } from '../utils/format'
import StarRating from '../components/StarRating.vue'
import AvatarMembre from '../components/AvatarMembre.vue'
import TripCard from '../components/TripCard.vue'
import { revelerApresChargement } from '../utils/chargement'

export default {
  name: 'PublicProfileView',

  components: { StarRating, TripCard, AvatarMembre },

  data() {
    return {
      chargement: true,
      // Le profil public (API) : prénom, initiale, commune, note,
      // véhicule et trajets à venir. Jamais d'email ni de téléphone.
      membre: null,
      avisRecus: [],
      estDansMesFavoris: false,
      erreur: ''
    }
  },

  computed: {
    data() {
      return useDataStore()
    },
    auth() {
      return useAuthStore()
    },
    trajetsAVenir() {
      return this.membre ? this.membre.trajetsAVenir : []
    },
    // Un membre connecté qui regarde le profil d'un AUTRE membre
    // (on vérifie le rôle : un administrateur peut avoir le même numéro)
    autreMembre() {
      return this.auth.estMembre && this.membre !== null && this.auth.utilisateur.id !== this.membre.id
    }
  },

  watch: {
    '$route.params.id'(id) {
      if (id) this.charger()
    }
  },

  mounted() {
    this.charger()
  },

  methods: {
    initialesTexte,
    formatDate,
    timeAgo,

    async charger() {
      this.chargement = true
      const id = this.$route.params.id
      const [membre, avis] = await Promise.all([
        this.data.profilPublic(id).catch(() => null),
        this.data.avisRecus(id).catch(() => [])
      ])
      this.membre = membre
      this.avisRecus = avis
      if (this.autreMembre) {
        const favoris = await this.data.mesFavoris().catch(() => [])
        this.estDansMesFavoris = favoris.some((f) => f.id === membre.id)
      }
      this.chargement = false
      revelerApresChargement()
    },

    // Ajouter / retirer des favoris (seulement un conducteur : RG11.4)
    async basculerFavori() {
      this.erreur = ''
      try {
        if (this.estDansMesFavoris) {
          await this.data.retirerFavori(this.membre.id)
        } else {
          await this.data.ajouterFavori(this.membre.id)
        }
        this.estDansMesFavoris = !this.estDansMesFavoris
      } catch (erreur) {
        this.erreur = messageErreur(erreur)
      }
    }
  }
}
</script>

<template>
  <div id="public-profile-page" class="container py-4 min-h-page">
    <div v-if="chargement" class="row g-4" aria-busy="true" aria-label="Chargement du profil">
      <div class="col-lg-4">
        <div class="card"><div class="card-body p-4">
          <div class="squelette squelette-rond mx-auto mb-3"></div>
          <div class="squelette squelette-ligne w-50 mx-auto mb-2"></div>
          <div class="squelette squelette-ligne w-75 mx-auto"></div>
        </div></div>
      </div>
      <div class="col-lg-8">
        <div class="squelette squelette-bloc mb-3"></div>
        <div class="squelette squelette-bloc"></div>
      </div>
    </div>

    <div v-else-if="!membre" class="text-center py-5">
      <h1 class="h4">Utilisateur introuvable</h1>
      <p class="text-muted">Ce compte n'existe pas ou n'est plus actif.</p>
    </div>

    <div v-else class="row g-4">
      <!-- Colonne de gauche : la carte du profil -->
      <div class="col-lg-4">
        <div class="card text-center reveal reveal-gauche">
          <div class="card-body p-4">
            <AvatarMembre :personne="membre" taille="xl" class="mx-auto mb-3" />
            <h1 class="h4 fw-bold mb-1">
              {{ membre.prenom }} {{ membre.nom }}
            </h1>
            <span v-if="membre.verifie" class="badge badge-verified mb-2">
              <i class="bi bi-patch-check-fill me-1"></i>Identité vérifiée
            </span>
            <div class="mb-2"><StarRating :note="membre.note" :nb-avis="membre.nbAvis" /></div>
            <p class="small text-muted">
              <i class="bi bi-geo-alt me-1"></i>{{ membre.commune }} ·
              Membre depuis {{ formatDate(membre.membreDepuis) }}
            </p>
            <p v-if="membre.vehicule" class="small">
              <i class="bi bi-car-front me-1 text-cm-primary"></i>{{ membre.vehicule }}
            </p>
            <p v-if="membre.bio" class="small text-muted fst-italic">« {{ membre.bio }} »</p>
            <p class="small text-muted">{{ membre.nbTrajets }} trajet(s) effectué(s)</p>
            <div v-if="erreur" class="alert alert-warning py-2 small">{{ erreur }}</div>
            <div class="d-flex gap-2 justify-content-center">
              <router-link v-if="autreMembre"
                :to="{ name: 'messages', query: { avec: membre.id } }" class="btn btn-cm-primary btn-sm">
                <i class="bi bi-chat-dots me-1"></i>Contacter
              </router-link>
              <button v-if="autreMembre && membre.role === 'conducteur'"
                class="btn btn-sm" :class="estDansMesFavoris ? 'btn-cm-accent' : 'btn-outline-secondary'"
                @click="basculerFavori">
                <i class="bi" :class="estDansMesFavoris ? 'bi-star-fill' : 'bi-star'"></i>
                {{ estDansMesFavoris ? 'Favori' : 'Ajouter aux favoris' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Colonne de droite : trajets + avis -->
      <div class="col-lg-8">
        <section v-if="membre.role === 'conducteur'" class="mb-4">
          <h2 class="h5 section-title mb-3">Trajets à venir de {{ membre.prenom }}</h2>
          <TripCard v-for="t in trajetsAVenir" :key="t.id" :trip="t" />
          <p v-if="trajetsAVenir.length === 0" class="text-muted small">Aucun trajet à venir.</p>
        </section>

        <section>
          <h2 class="h5 section-title mb-3">Avis reçus ({{ avisRecus.length }})</h2>
          <div v-if="avisRecus.length === 0" class="text-muted small">Aucun avis pour le moment.</div>
          <div v-for="avis in avisRecus" :key="avis.id" class="card mb-2">
            <div class="card-body py-3">
              <div class="d-flex align-items-center gap-2 mb-1">
                <span class="avatar avatar-sm">{{ initialesTexte(avis.auteur) }}</span>
                <strong class="small">{{ avis.auteur }}</strong>
                <span class="small text-muted">· {{ avis.trajet }}</span>
                <StarRating :note="avis.note" />
                <span class="small text-muted ms-auto">{{ timeAgo(avis.date) }}</span>
              </div>
              <p class="small text-muted mb-0">{{ avis.commentaire }}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
