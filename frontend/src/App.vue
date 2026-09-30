<!-- ============================================================
  App.vue : le "squelette" de toutes les pages.
  Il contient : la barre de navigation, la page affichée
  (router-view) et le pied de page.
============================================================ -->
<template>
  <div class="d-flex flex-column min-vh-100">
    <!-- La barre de navigation, toujours visible -->
    <NavBar />

    <!-- La page en cours (change selon l'URL) -->
    <main class="flex-grow-1">
      <router-view />
    </main>

    <!-- Le pied de page (caché dans la partie admin) -->
    <AppFooter v-if="!pageAdmin" />
  </div>
</template>

<script>
import NavBar from "./components/NavBar.vue";
import AppFooter from "./components/AppFooter.vue";
import { activerReveal } from "./reveal.js";

export default {
  name: "App",

  // Les composants qu'on utilise dans le template
  components: {
    NavBar,
    AppFooter,
  },

  // Les valeurs calculées automatiquement
  computed: {
    // Vrai si on est dans la partie administration
    pageAdmin() {
      return this.$route.path.startsWith("/admin");
    },
  },

  // On surveille les changements de page
  watch: {
    // À chaque changement d'URL...
    "$route.fullPath"() {
      // ... on attend que la nouvelle page soit affichée,
      // puis on active les animations au scroll
      this.$nextTick(function () {
        activerReveal();
      });
    },
  },

  // Quand l'application démarre pour la première fois
  mounted() {
    activerReveal();
  },
};
</script>
