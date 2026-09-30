<script setup>
// ============================================================
// Squelette de l'espace administration : le menu à gauche
// (une bande en haut sur mobile) et la page choisie à droite.
// Les pastilles dorées comptent ce qui attend une action.
// ============================================================
import { computed } from "vue";
import { useDataStore } from "@/stores/data";

const data = useDataStore();

// Compteurs renvoyés par l'API (rechargés à chaque changement de page) :
// demandes conducteur en attente, avis signalés, litiges non résolus
const conducteursAValider = computed(() => data.aTraiter.demandesConducteur);
const avisSignales = computed(() => data.aTraiter.avisSignales);
const litigesOuverts = computed(() => data.aTraiter.litiges);
</script>

<template>
  <div id="admin-layout" class="admin-coque">
    <nav class="admin-menu" aria-label="Menu de l'administration">
      <p class="admin-menu-titre">
        Administration
        <small>Covoit'May</small>
      </p>
      <router-link
        class="admin-menu-lien"
        :to="{ name: 'admin-dashboard' }"
        exact-active-class="router-link-active"
      >
        <i class="bi bi-speedometer2"></i>Tableau de bord
      </router-link>
      <router-link class="admin-menu-lien" :to="{ name: 'admin-users' }">
        <i class="bi bi-people"></i>Utilisateurs
        <span
          v-if="conducteursAValider > 0"
          class="admin-compteur"
          :title="conducteursAValider + ' conducteur(s) à valider'"
          >{{ conducteursAValider }}</span
        >
      </router-link>
      <router-link class="admin-menu-lien" :to="{ name: 'admin-moderation' }">
        <i class="bi bi-flag"></i>Modération
        <span
          v-if="avisSignales > 0"
          class="admin-compteur"
          :title="avisSignales + ' avis signalé(s)'"
          >{{ avisSignales }}</span
        >
      </router-link>
      <router-link class="admin-menu-lien" :to="{ name: 'admin-disputes' }">
        <i class="bi bi-exclamation-diamond"></i>Litiges
        <span
          v-if="litigesOuverts > 0"
          class="admin-compteur"
          :title="litigesOuverts + ' litige(s) ouvert(s)'"
          >{{ litigesOuverts }}</span
        >
      </router-link>
      <router-link class="admin-menu-lien" :to="{ name: 'admin-transactions' }">
        <i class="bi bi-credit-card"></i>Transactions
      </router-link>
      <router-link class="admin-menu-lien" :to="{ name: 'admin-documents' }">
        <i class="bi bi-file-earmark-pdf"></i>Documents
      </router-link>
    </nav>

    <div class="admin-contenu">
      <router-view />
    </div>
  </div>
</template>
