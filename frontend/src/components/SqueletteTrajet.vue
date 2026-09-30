<!-- ============================================================
  Composant SqueletteTrajet : la forme grise d'une carte de
  trajet (TripCard), affichée pendant le chargement.
  Même grille que TripCard (classes trajet-carte-…).
  Utilisation : <SqueletteTrajet v-for="n in 3" :key="n" />
============================================================ -->
<template>
  <div class="card trajet-carte" aria-hidden="true">
    <!-- Itinéraire -->
    <div class="trajet-carte-itineraire">
      <div class="squelette squelette-ligne w-50 mb-2"></div>
      <div class="squelette squelette-ligne w-25 mb-3"></div>
      <div class="squelette squelette-ligne w-50 mb-2"></div>
      <div class="squelette squelette-ligne w-75"></div>
    </div>
    <!-- Prix -->
    <div class="trajet-carte-prix">
      <div class="squelette squelette-ligne squelette-grande squelette-prix mb-2"></div>
      <div class="squelette squelette-ligne squelette-prix"></div>
    </div>
    <!-- Conducteur -->
    <div class="trajet-carte-conducteur">
      <div class="squelette squelette-rond"></div>
      <div class="flex-grow-1">
        <div class="squelette squelette-ligne w-50 mb-2"></div>
        <div class="squelette squelette-ligne w-75"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "SqueletteTrajet",
};
</script>
