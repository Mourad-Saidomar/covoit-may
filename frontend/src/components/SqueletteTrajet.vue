<!-- ============================================================
  Composant SqueletteTrajet : la forme grise d'une carte de
  trajet (TripCard), affichée pendant le chargement.
  Utilisation : <SqueletteTrajet v-for="n in 3" :key="n" />
============================================================ -->
<template>
  <div class="card mb-3" aria-hidden="true">
    <div class="card-body">
      <div class="row align-items-center g-3">
        <!-- Itinéraire -->
        <div class="col-md-5">
          <div class="squelette squelette-ligne w-50 mb-2"></div>
          <div class="squelette squelette-ligne w-25 mb-3"></div>
          <div class="squelette squelette-ligne w-50 mb-2"></div>
          <div class="squelette squelette-ligne w-75"></div>
        </div>
        <!-- Conducteur -->
        <div class="col-md-4 d-flex align-items-center gap-2">
          <div class="squelette squelette-rond"></div>
          <div class="flex-grow-1">
            <div class="squelette squelette-ligne w-50 mb-2"></div>
            <div class="squelette squelette-ligne w-75"></div>
          </div>
        </div>
        <!-- Prix -->
        <div class="col-md-3 d-flex flex-column align-items-md-end">
          <div class="squelette squelette-ligne squelette-grande w-50 mb-2"></div>
          <div class="squelette squelette-ligne w-75"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "SqueletteTrajet",
};
</script>
