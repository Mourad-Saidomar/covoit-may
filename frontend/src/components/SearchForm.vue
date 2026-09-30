<!-- ============================================================
  Composant SearchForm : le formulaire de recherche de trajet
  (départ, arrivée, date). Utilisé sur l'accueil et la page
  de recherche.
============================================================ -->
<template>
  <form
    id="search-form"
    class="search-form-horizontal"
    @submit.prevent="rechercher"
  >
    <!-- Champ départ -->
    <div class="search-form-field">
      <label class="form-label small fw-semibold" for="search-depart"
        >Départ</label
      >
      <div class="input-group">
        <span class="input-group-text bg-white"
          ><i class="bi bi-geo-alt text-cm-primary"></i
        ></span>
        <input
          id="search-depart"
          v-model="depart"
          class="form-control"
          list="communes-list"
          placeholder="Ex : Mamoudzou"
        />
      </div>
    </div>

    <!-- Champ arrivée -->
    <div class="search-form-field">
      <label class="form-label small fw-semibold" for="search-arrivee"
        >Arrivée</label
      >
      <div class="input-group">
        <span class="input-group-text bg-white"
          ><i class="bi bi-geo-alt-fill text-cm-accent"></i
        ></span>
        <input
          id="search-arrivee"
          v-model="arrivee"
          class="form-control"
          list="communes-list"
          placeholder="Ex : Combani"
        />
      </div>
    </div>

    <!-- Champ date -->
    <div class="search-form-field search-form-date">
      <label class="form-label small fw-semibold" for="search-date">Date</label>
      <input id="search-date" v-model="date" type="date" class="form-control" />
    </div>

    <!-- Bouton rechercher -->
    <div class="search-form-submit">
      <button type="submit" class="btn btn-cm-accent w-100">
        <i class="bi bi-search me-1"></i>Rechercher
      </button>
    </div>

    <!-- Liste de suggestions des communes de Mayotte -->
    <datalist id="communes-list">
      <option v-for="c in communes" :key="c" :value="c" />
    </datalist>
  </form>
</template>

<script>
import { useDataStore } from "../stores/data";

export default {
  name: "SearchForm",

  props: {
    // Valeurs de départ (utile quand on revient sur la recherche)
    initial: {
      type: Object,
      default: function () {
        return {};
      },
    },
    // true = formulaire sur une seule ligne (page de recherche)
    inline: {
      type: Boolean,
      default: false,
    },
  },

  // Événement envoyé à la page quand le départ ou l'arrivée change
  // (sur l'accueil, la carte du hero suit ce que l'on tape)
  emits: ["changement"],

  // Les données du composant
  data() {
    return {
      depart: this.initial.depart || "",
      arrivee: this.initial.arrivee || "",
      date: this.initial.date || "",
    };
  },

  computed: {
    // Les communes de Mayotte (liste de l'API)
    communes() {
      return useDataStore().communes;
    },
  },

  watch: {
    depart() {
      this.signalerChangement();
    },
    arrivee() {
      this.signalerChangement();
    },
  },

  methods: {
    // Envoie { depart, arrivee } à la page qui utilise le formulaire
    signalerChangement() {
      this.$emit("changement", { depart: this.depart, arrivee: this.arrivee });
    },

    // Quand on clique sur "Rechercher", on va sur la page
    // de recherche avec les critères dans l'URL
    rechercher() {
      this.$router.push({
        name: "search",
        query: {
          depart: this.depart,
          arrivee: this.arrivee,
          date: this.date,
        },
      });
    },
  },
};
</script>
