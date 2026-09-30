<script>
// ============================================================
// Page 403 — Accès refusé
// ------------------------------------------------------------
// Affichée quand une personne connectée essaie d'ouvrir une
// page qui ne correspond pas à son rôle (par exemple un
// passager qui tente d'ouvrir « Publier un trajet »).
// On explique pourquoi, et on propose un retour vers SON espace.
// ============================================================
import { useAuthStore } from '../stores/auth'

export default {
  name: 'ForbiddenView',

  computed: {
    auth() {
      return useAuthStore()
    },

    // Le nom de la page demandée, transmis par le routeur (?page=...)
    pageDemandee() {
      return this.$route.query.page || ''
    },

    // Le rôle de la personne, pour lui expliquer la situation
    monRole() {
      return this.auth.libelleRole || 'visiteur'
    },

    // Le bouton de retour pointe vers l'espace de la personne
    monEspace() {
      if (!this.auth.estConnecte) {
        return { name: 'home' }
      }
      return this.auth.destinationApresConnexion()
    },

    libelleMonEspace() {
      if (this.auth.estAdmin) return "Aller au tableau de bord"
      if (this.auth.estConducteur) return "Aller à mes trajets"
      if (this.auth.estPassager) return "Aller à mes réservations"
      return "Retour à l'accueil"
    }
  }
}
</script>

<template>
  <section id="forbidden-page" class="container py-5 text-center min-h-page">
    <i class="bi bi-shield-lock fs-1 text-cm-primary"></i>
    <h1 class="display-4 fw-bold mt-3">403</h1>
    <p class="lead text-muted mb-1">
      Cette page n'est pas accessible avec votre compte.
    </p>
    <p class="text-muted">
      Vous êtes connecté en tant que <strong>{{ monRole }}</strong
      ><span v-if="pageDemandee">, et « {{ pageDemandee }} » est réservée à un autre rôle</span>.
    </p>
    <div class="d-flex gap-2 justify-content-center flex-wrap mt-4">
      <router-link :to="monEspace" class="btn btn-cm-primary">
        <i class="bi bi-arrow-right-circle me-1"></i>{{ libelleMonEspace }}
      </router-link>
      <router-link to="/recherche" class="btn btn-outline-cm">
        <i class="bi bi-search me-1"></i>Rechercher un trajet
      </router-link>
    </div>
  </section>
</template>
