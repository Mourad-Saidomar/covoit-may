<!-- ============================================================
  Composant StarRating : affiche une note avec des étoiles.
  Utilisation : <StarRating :note="4.5" :nbAvis="12" />
============================================================ -->
<template>
  <span class="stars">
    <!-- On dessine 5 étoiles : pleine, moitié ou vide selon la note -->
    <template v-for="i in 5" :key="i">
      <i v-if="note >= i" class="bi bi-star-fill"></i>
      <i v-else-if="note >= i - 0.5" class="bi bi-star-half"></i>
      <i v-else class="bi bi-star"></i>
    </template>

    <!-- La note en chiffres, exemple : 4.5 -->
    <span v-if="note > 0" class="ms-1 text-dark fw-semibold">{{ note.toFixed(1) }}</span>

    <!-- Le nombre d'avis, exemple : (12 avis) -->
    <span v-if="nbAvis !== null" class="ms-1 text-muted">({{ nbAvis }} avis)</span>

    <!-- Si pas encore de note -->
    <span v-if="note === 0" class="ms-1 text-muted">Nouveau</span>
  </span>
</template>

<script>
export default {
  name: 'StarRating',

  // Les "props" sont les informations que le composant reçoit
  // de la page qui l'utilise
  props: {
    note: {
      type: Number,
      default: 0
    },
    nbAvis: {
      type: Number,
      default: null
    }
  }
}
</script>
